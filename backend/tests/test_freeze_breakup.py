"""Freeze-up and break-up dates must not hinge on a single day.

The dates used to be min and max of the days at or above the ice threshold, so
one misclassified day decided a whole season. That risk is not hypothetical: in
the published archive the February and March days reporting almost no ice have a
median cloud cover of 0.72 while the rest have 0.00, and the reported ice
fraction correlates with cloud at r = -0.42. A cloudy July day read as ice would
have pushed break-up weeks late.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from main import (  # noqa: E402
    FJORD_PERSISTENCE_DAYS,
    _first_run_start,
    _freeze_and_breakup,
)


def season(values, start_doy: int = 45) -> pd.DataFrame:
    return pd.DataFrame(
        {"doy": range(start_doy, start_doy + len(values)), "frac": values}
    )


# --- the run finder -------------------------------------------------------


def test_first_run_start_finds_the_beginning_not_the_end():
    assert _first_run_start([False, True, True, True], 3) == 1


def test_first_run_start_ignores_runs_that_are_too_short():
    assert _first_run_start([True, True, False, True, True, True], 3) == 3


def test_first_run_start_returns_none_without_a_long_enough_run():
    assert _first_run_start([True, False, True, False], 3) is None


def test_first_run_start_handles_an_empty_season():
    assert _first_run_start([], 3) is None


# --- freeze and break-up --------------------------------------------------


def test_a_clean_season_gives_the_obvious_dates():
    values = [0.9] * 30 + [0.02] * 30
    freeze, breakup = _freeze_and_breakup(season(values))
    assert freeze == 45
    assert breakup == 75


def test_one_cloudy_day_in_deep_winter_does_not_open_the_fjord():
    """A single day read as ice free used to be enough to date break-up."""
    values = [0.9] * 10 + [0.01] + [0.9] * 19 + [0.02] * 30
    freeze, breakup = _freeze_and_breakup(season(values))
    assert freeze == 45
    assert breakup == 75  # not 55, where the single artefact sits


def test_one_bright_day_in_summer_does_not_refreeze_the_fjord():
    """The mirror case, which the old max() based rule was wide open to."""
    values = [0.9] * 30 + [0.02] * 20 + [0.95] + [0.02] * 9
    freeze, breakup = _freeze_and_breakup(season(values))
    assert freeze == 45
    assert breakup == 75


def test_a_season_that_never_freezes_has_no_dates():
    freeze, breakup = _freeze_and_breakup(season([0.02] * 60))
    assert freeze is None
    assert breakup is None


def test_a_season_still_frozen_at_the_end_has_no_break_up():
    freeze, breakup = _freeze_and_breakup(season([0.9] * 60))
    assert freeze == 45
    assert breakup is None


def test_missing_days_do_not_count_towards_either_run():
    values = [0.9] * 30 + [float("nan")] * 3 + [0.02] * 30
    freeze, breakup = _freeze_and_breakup(season(values))
    assert freeze == 45
    # the gap interrupts the open run, so break-up starts after it
    assert breakup == 78


def test_a_brief_thaw_shorter_than_the_window_is_not_break_up():
    thaw = FJORD_PERSISTENCE_DAYS - 2
    values = [0.9] * 20 + [0.02] * thaw + [0.9] * 20 + [0.02] * 20
    freeze, breakup = _freeze_and_breakup(season(values))
    assert freeze == 45
    assert breakup == 45 + 20 + thaw + 20


def test_the_rows_do_not_have_to_arrive_sorted():
    values = [0.9] * 30 + [0.02] * 30
    frame = season(values).sample(frac=1.0, random_state=0)
    assert _freeze_and_breakup(frame) == (45, 75)


def test_the_threshold_is_configurable():
    values = [0.3] * 30 + [0.02] * 30
    assert _freeze_and_breakup(season(values), threshold=0.5) == (None, None)
    assert _freeze_and_breakup(season(values), threshold=0.2) == (45, 75)


def test_the_persistence_window_is_configurable():
    values = [0.9] * 3 + [0.02] * 57
    assert _freeze_and_breakup(season(values), need=3)[0] == 45
    assert _freeze_and_breakup(season(values), need=7)[0] is None


def test_persistence_default_is_a_week():
    assert FJORD_PERSISTENCE_DAYS == 7


def test_break_up_is_never_before_freeze_up():
    values = [0.02] * 10 + [0.9] * 25 + [0.02] * 25
    freeze, breakup = _freeze_and_breakup(season(values))
    assert freeze is not None and breakup is not None
    assert breakup > freeze


@pytest.mark.parametrize("length", [0, 1, 5, 6])
def test_short_seasons_do_not_raise(length):
    assert _freeze_and_breakup(season([0.9] * length)) == (None, None)


# --- an early cold snap must not end the season before it starts ----------


def test_an_early_cold_snap_does_not_become_the_whole_winter():
    """The shape that broke 2025.

    That winter froze late. A snap on 24 to 27 February held the fraction above
    the threshold just long enough to clear the persistence rule, the fjord
    opened again, and the season proper arrived three weeks later and held for
    two months. Dating the season from the FIRST sustained frozen run called
    that pair of events freeze-up and break-up, and ended the winter before the
    winter happened.
    """
    snap = [0.6] * FJORD_PERSISTENCE_DAYS
    lull = [0.02] * 14
    winter = [0.95] * 60
    spring = [0.01] * 30
    freeze, breakup = _freeze_and_breakup(season(snap + lull + winter + spring))

    assert freeze == 45 + len(snap) + len(lull)
    assert breakup == 45 + len(snap) + len(lull) + len(winter)


def test_the_longest_frozen_spell_wins_even_when_it_comes_second():
    values = [0.9] * 8 + [0.02] * 10 + [0.9] * 30 + [0.02] * 12
    freeze, breakup = _freeze_and_breakup(season(values))
    assert freeze == 45 + 8 + 10
    assert breakup == 45 + 8 + 10 + 30


def test_a_cloudy_day_still_does_not_split_the_winter_in_two():
    """Guards the gap closing that picking the longest spell made necessary.

    Without it, one misread day inside a winter would leave two shorter spells
    and freeze-up would be dated from whichever side happened to be longer.
    """
    values = [0.9] * 10 + [0.01] + [0.9] * 19 + [0.02] * 30
    freeze, breakup = _freeze_and_breakup(season(values))
    assert freeze == 45
    assert breakup == 45 + 30
