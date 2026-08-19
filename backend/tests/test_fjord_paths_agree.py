"""/uummannaq has two branches and they have to answer the same.

The route reads Postgres and falls back to the CSV. For a long time only the CSV
branch attached the per season sampling error, and nobody could see it: the
database read had been failing, so every request fell through to the CSV. The
morning the pipeline first filled the fjord tables completely, the database
branch started succeeding and the published charts silently lost measuredMean,
observedDays, standardError and ci95. No error, no log line, just empty bands.

Two branches that must agree is a shape that drifts, so here it is held:

  * the sampling error itself, tested on data where the answer is known
  * that BOTH branches call it, so one cannot quietly stop
  * that both branches read the raw series, since a gap filled day carries no
    independent information and using the smoothed one would shrink the interval
    by pretending it does
"""

from __future__ import annotations

import re
from pathlib import Path

import pandas as pd
import pytest

from main import _season_sampling_error

MAIN = Path(__file__).resolve().parents[1] / "main.py"
SOURCE = MAIN.read_text()


def _season(year: int, raw: list[float | None]) -> pd.DataFrame:
    return pd.DataFrame(
        {
            "year": [year] * len(raw),
            "doy": list(range(53, 53 + len(raw))),
            "frac": [0.5] * len(raw),
            "frac_raw": raw,
        }
    )


class TestSamplingError:
    def test_counts_only_measured_days(self) -> None:
        # Five days in the window, two of them gap filled. The interval has to
        # describe the three that were actually observed.
        result = _season_sampling_error(_season(2020, [0.8, None, 0.6, None, 0.7]), 2020)
        assert result["observedDays"] == 3
        assert result["measuredMean"] == pytest.approx(0.7, abs=1e-4)
        assert result["standardError"] is not None
        assert result["ci95"][0] < result["measuredMean"] < result["ci95"][1]

    def test_refuses_to_invent_an_interval_from_too_few_days(self) -> None:
        result = _season_sampling_error(_season(2021, [0.8, None]), 2021)
        assert result["observedDays"] == 1
        assert result["standardError"] is None
        assert result["ci95"] is None

    def test_is_reproducible(self) -> None:
        # Seeded per year, so the same season always yields the same interval.
        # A bootstrap that moved between requests would put a different number
        # on the page every reload.
        raw = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4]
        first = _season_sampling_error(_season(2019, raw), 2019)
        second = _season_sampling_error(_season(2019, raw), 2019)
        assert first == second

    def test_measured_mean_is_not_the_smoothed_mean(self) -> None:
        # frac is 0.5 everywhere; the measured days average 0.7. If the helper
        # ever fell back to the smoothed column the band would sit around the
        # wrong centre, which is the bug that once put 2018 below its own lower
        # bound.
        result = _season_sampling_error(_season(2020, [0.8, 0.6, 0.7]), 2020)
        assert result["measuredMean"] == pytest.approx(0.7, abs=1e-4)


class TestBothBranchesAgree:
    """Source level, on purpose.

    What broke was not a wrong value but a branch that stopped calling
    something. That cannot be caught by exercising one branch, and standing up
    a Postgres in unit tests to exercise the other buys less than it costs. So
    the contract is asserted where it actually lives.
    """

    def test_both_branches_attach_the_sampling_error(self) -> None:
        calls = len(re.findall(r"_season_sampling_error\(", SOURCE))
        # one definition, one call in the CSV branch, one in the database branch
        assert calls >= 3, (
            "the sampling error is attached in fewer places than there are "
            "branches of /uummannaq; one of them is serving bare season means"
        )

    def test_the_database_branch_reads_the_raw_series(self) -> None:
        assert re.search(r"SELECT[^;]*frac_raw[^;]*FROM fjord_daily", SOURCE, re.S), (
            "the database branch does not select frac_raw, so it cannot tell a "
            "measured day from a filled one"
        )

    def test_both_branches_expose_frac_raw_to_the_client(self) -> None:
        assert SOURCE.count('"fracRaw"') >= 2, (
            "one branch is not returning fracRaw, so the story cannot label "
            "measured days as measured"
        )


class TestOneBreakupDefinition:
    """Freeze-up and break-up must come from one definition, not two agreeing ones.

    The database branch used to read these out of fjord_freeze_breakup, which the
    data pipeline fills with min and max of the days above the threshold. That is
    the definition _freeze_and_breakup was written to replace, and production
    served it while the CSV fallback served the careful one. On this data the two
    land within a day of each other every season, so the only visible symptom was
    the badge reading 29 Apr under prose that says the earliest break-up in the
    record is 30 April.
    """

    def test_neither_branch_reads_the_pipeline_table(self) -> None:
        # The name still appears in the helper's docstring, explaining why the
        # table is not read, so this looks for the query rather than the word.
        assert not re.search(r"FROM\s+fjord_freeze_breakup", SOURCE, re.I), (
            "the route is reading break-up from the pipeline's table again, which "
            "is a second definition of the same day"
        )

    def test_both_branches_go_through_the_same_helper(self) -> None:
        # one definition, one call in each branch
        assert len(re.findall(r"_freeze_and_breakup\(", SOURCE)) >= 2

    def test_the_helper_needs_a_sustained_open_run(self) -> None:
        # The naive definition is max(doy where frozen). If the helper ever
        # collapses to that, 2025 goes back to breaking up on 8 March, before
        # its ice had arrived.
        start = SOURCE.index("def _freeze_and_breakup")
        body = SOURCE[start : SOURCE.index("\ndef ", start + 10)]
        assert "_first_run_start" in body and "_sustained_runs" in body
