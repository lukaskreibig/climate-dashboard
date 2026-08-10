"""Bring the Uummannaq fjord ice-fraction series up to date.

WHY THIS IS A SEPARATE SCRIPT, AND NOT PART OF THE DAILY CRON
------------------------------------------------------------
The fjord series is the story's own measurement: Sentinel-2 scenes classified
into ice and water, one number per day. Producing it needs torch, rasterio and
a 26 MB cloud-mask checkpoint, roughly 1.2 GB of image, and a scene download of
several hundred megabytes. The daily cron that refreshes NSIDC, GISTEMP and the
CO2 series needs none of that and must stay small and fast.

The observation season also runs mid-February to late June only (day of year
45 to 180); outside it the sun is too low. So this runs a handful of times a
year, not daily.

WHAT DOES THE ACTUAL CLASSIFICATION
-----------------------------------
Not this file. The classifier lives in its own maintained, tested package:

    https://github.com/lukaskreibig/uummannaq-ice-from-space

That package owns the thresholds the story publishes, ships the cloud-mask
checkpoint and the land mask, and exposes a CLI that already appends rather
than rewrites. This script only decides WHICH days are missing, hands that
window over, and turns what comes back into the series the API serves.

    pip install "git+https://github.com/lukaskreibig/uummannaq-ice-from-space"

THE TWO CSVs, WHICH ARE NOT THE SAME FILE
-----------------------------------------
This is where this script used to be wrong, so it is worth stating plainly.

    summary_raw.csv          one row per SCENE, written by the classifier.
                             columns: tile_id, timestamp, solid_px, ... ,
                             solid_pct, light_pct, ... , edge_gap

    summary_test_cleaned.csv one row per DAY, what the API and the charts read.
                             columns: date, year, doy, frac, frac_filled,
                             frac_smooth

The classifier cannot write the second one. It has never heard of day-of-year
climatology or a centred rolling mean. Handing it `--csv-name
summary_test_cleaned.csv`, which this script used to do, appended scene rows to
a file that update_fjord_data.py then tried to read as daily rows.

`clean_series` below is the missing step. It is the notebook recipe that
produced the published series, and it reproduces
data/summary_test_cleaned.csv from the published raw archive exactly: 3047
rows, zero difference in frac, frac_filled and frac_smooth.

USAGE
-----
    python3 refresh_fjord_season.py                    # catch up to today
    python3 refresh_fjord_season.py --dry-run          # show the window only
    python3 refresh_fjord_season.py --start 2026-02-14 --end 2026-06-30
    python3 refresh_fjord_season.py --skip-aggregate   # classify only

    # after a full archive reprocess done by hand in the classifier repo:
    python3 refresh_fjord_season.py --clean-only \
        --raw ../../uummannaq-ice-from-space/out/archive/summary.csv
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

# Mirrors backend/main.py's FJORD_SUN_START / FJORD_SUN_END. Outside this window
# the sun is too low over Uummannaq for a usable optical scene.
#
# Day 53, 22 February, is measured rather than chosen. Take only genuinely clear
# scenes, cloud under 10 percent, in the weeks when this fjord is frozen with
# near certainty, and count how often one of them reports under 0.15 ice, which
# can only be a classification failure:
#
#     1 to 21 Feb   sun  7.8 deg   25 percent fail   median ice 0.56
#    22 to 28 Feb   sun 10.7 deg    0 percent        median ice 0.94
#     1 to  7 Mar   sun 13.1 deg   15 percent        median ice 0.83
#     8 to 14 Mar   sun 15.7 deg    0 percent        median ice 0.97
#      from 15 Mar  sun 18+  deg   0 to 4 percent    median ice 0.99
#
# The window used to open on day 45 and so carried eight days in which one clear
# scene in four reads a frozen fjord as open water, and the median reads 0.56
# where a week later it reads 0.94. That is the sun clearing about 10 degrees.
#
# The 15 percent in the first week of March is not darkness: three scenes from
# 2021 and 2026, where 2020 reads 0.96 at the same sun elevation. That is a
# genuinely late freeze, and the optical chain cannot tell it from a dim scene.
#
# The end is not a light problem, the sun sits at 42 degrees there. It stays at
# 180 so the whole melt is in the picture; cutting it earlier would be an
# analysis choice, where the start is a physical one.
SEASON_START_DOY = 53
SEASON_END_DOY = 180

# Gap-filling and smoothing constants, from the notebook that produced the
# published series. Changing either changes every number the story shows.
SHORT_GAP_DAYS = 14
SMOOTH_WINDOW_DAYS = 7

HERE = Path(__file__).resolve().parent
DEFAULT_RAW_CSV = HERE / "data" / "summary_raw.csv"
DEFAULT_CLEAN_CSV = HERE / "data" / "summary_test_cleaned.csv"
# The copy the story offers as a download, linked from the methodology box as
# /data/summary_test_cleaned.csv.
PUBLIC_COPY = HERE.parent / "frontend" / "public" / "data" / "summary_test_cleaned.csv"
# Written by hand, not by any script, and it shadows the CSV fallback in
# backend/main.py. If it exists and the database is unreachable, the API keeps
# serving it no matter what the CSV says.
STALE_JSON = HERE.parent / "backend" / "data" / "fjord_data.json"

CLI_NAME = "uummannaq-ice"

INSTALL_HINT = (
    f"The {CLI_NAME} CLI is not on PATH. It is the package that owns the "
    f"classifier and the published thresholds. Install it with:\n\n"
    f'    pip install "git+https://github.com/lukaskreibig/'
    f'uummannaq-ice-from-space"\n\n'
    f"or, if you have the repository checked out next to this one:\n\n"
    f"    pip install -e ../../uummannaq-ice-from-space\n"
)


# --------------------------------------------------------------------------
# raw scenes -> daily series
# --------------------------------------------------------------------------


def _usable_mask(frame: pd.DataFrame) -> pd.Series:
    """Whether a scene READ enough of the fjord, not merely saw enough of it.

    The classifier's own `usable` column asks whether the scene could see past
    the cloud. Seeing is not reading: a cell needs NDSI plus the brightness
    floors to be ice and NDWI to be water, and a dark one is neither, so a scene
    can clear the visibility bar and still come out almost blank.

    61 of the 694 scenes that passed classified less than half of what they
    could see. 2017-06-15 saw 90 percent of the fjord and classified nothing at
    all; 2017-06-16 classified 6 percent of what it saw, reported 0.51 ice from
    that sliver, and that was enough to set the season's break-up date.

    So this recomputes the gate on the same 0.30 the classifier uses, against
    the share of the AOI that actually came out as ice or water. It drops 77 of
    694 scenes. Rebuilt here rather than by re-running the classifier, because
    the archive carries the counts; where it does not, the stored column stands.
    """
    counts = {"solid_px", "light_px", "water_px", "cloud_px", "land_px", "nodata_px"}
    if not counts.issubset(frame.columns):
        return (
            frame["usable"].astype(int)
            if "usable" in frame.columns
            else pd.Series(1, index=frame.index)
        )

    num = lambda c: pd.to_numeric(frame[c], errors="coerce").fillna(0.0)  # noqa: E731
    classified = num("solid_px") + num("light_px") + num("water_px")
    total = classified + num("cloud_px") + num("land_px") + num("nodata_px")
    share = classified.divide(total.where(total > 0))
    return (share >= MIN_CLASSIFIED_SHARE).astype(int)


# Mirrors MIN_CLEAR_SHARE in the classifier, and means the same thing there now.
MIN_CLASSIFIED_SHARE = 0.30


def _classified_ice_fraction(frame: pd.DataFrame) -> pd.Series:
    """Ice over the cells that came out as SOMETHING, not merely as visible.

    A cell can be visible and still land in no class: ice needs NDSI and the
    brightness gate, water needs NDWI above its cut, and a dark cell that fails
    both is neither. Shadowed and wet ice at low sun does exactly that. Those
    cells sat in the `_clear` denominator while they could never reach a
    numerator, which is the whole-grid error one scale down and pointing the
    same way, only ever pushing the ice fraction down.

    Rebuilt from the counts rather than re-running the classifier, because the
    archive already carries every part: `solid_px`, `light_px`, `water_px`.
    Where those are missing the published `_clear` percentages are used as they
    stand, so an older archive still resolves to a number.

    Measured over the reprocessed archive: 282 of 694 usable scenes carry such
    cells, the median scene does not move, the mean moves by +0.008, the worst
    by +0.204, and the early-to-late decline goes from 27.6 to 27.2 percent.
    """
    counts = {"solid_px", "light_px", "water_px"}
    if not counts.issubset(frame.columns):
        return (
            pd.to_numeric(frame["solid_pct_clear"], errors="coerce").fillna(0.0)
            + pd.to_numeric(frame["light_pct_clear"], errors="coerce").fillna(0.0)
        )

    solid = pd.to_numeric(frame["solid_px"], errors="coerce").fillna(0.0)
    light = pd.to_numeric(frame["light_px"], errors="coerce").fillna(0.0)
    water = pd.to_numeric(frame["water_px"], errors="coerce").fillna(0.0)
    classified = solid + light + water
    return (solid + light).divide(classified.where(classified > 0))


def _scene_ice_fraction(frame: pd.DataFrame) -> pd.Series:
    """Ice fraction per scene, cloud independent where the columns allow it.

    The classifier emits two sets of percentages. The `_clear` ones divide by the
    cells that could actually be judged, that is everything not cloud, land or
    data gap. The plain ones divide by the whole grid.

    The plain ones make the measurement depend on the weather: a cloud cell can
    never be ice, so a cloudy day reports less ice even when the fjord underneath
    is unchanged. That would be tolerable if cloud were evenly spread, and it is
    not. Over the analysed window the 2017 to 2020 seasons average 21.3 percent
    cloud and the 2021 to 2025 seasons 29.7 percent, so the whole-grid
    denominator turns a weather trend into an apparent ice trend. Measured on the
    published archive, the early-to-late seasonal loss comes out at 35.7 percent
    that way and 22.7 percent with the clear-sky denominator.

    Scenes the classifier marked unusable are dropped rather than averaged in.
    318 of 1552 published scenes were over 80 percent cloud and entered the daily
    series unfiltered, with a mean reported ice fraction of 0.014.

    An archive written before these columns existed is not simply passed through
    on the whole-grid denominator any more. It used to be, with a warning, on the
    reasoning that changing the meaning of the series silently is worse than
    publishing a known bias. That trade was wrong: the warning goes to a
    terminal nobody rereads while the biased number goes on the page. The same
    quantity can be derived from the columns a legacy archive does carry, so it
    is, and the derivation is stated rather than assumed. See
    `_legacy_clear_fraction`.
    """
    has_clear = {"solid_pct_clear", "light_pct_clear"}.issubset(frame.columns)
    if not has_clear:
        return _legacy_clear_fraction(frame)

    usable = _usable_mask(frame)
    fraction = _classified_ice_fraction(frame)
    dropped = int((usable == 0).sum())
    if dropped:
        print(
            f"[INFO] {dropped} of {len(frame)} scenes read too little of the "
            f"fjord to be a measurement and were dropped, not averaged in."
        )
        if "usable" in frame.columns:
            stored = int((frame["usable"].astype(int) == 0).sum())
            print(
                f"[INFO] the archive's own column drops {stored}; the extra "
                f"{dropped - stored} saw the fjord but classified too little of it."
            )
    return fraction.where(usable == 1)


# The classifier's own visibility gate. A scene that saw less than this share of
# the fjord is not a measurement of it, and dividing by a sliver of clear sky
# turns noise into a confident-looking number.
LEGACY_MIN_CLEAR_SHARE = 0.30


def _legacy_clear_fraction(frame: pd.DataFrame) -> pd.Series:
    """The clear-sky ice fraction, derived from an archive that predates the column.

    The published 2017 to 2025 archive was written before the classifier emitted
    `solid_pct_clear`, but it carries every part needed to reconstruct it:

        clear = 1 - cloud_pct - land_pct - nodata_pct
        ice   = (solid_pct + light_pct) / clear

    which is what `solid_pct_clear + light_pct_clear` means. Doing this rather
    than falling back to the whole-grid denominator matters more than it sounds,
    because cloud cover over the analysed window is not stationary: the 2017 to
    2020 seasons average 0.149 and the 2021 to 2025 seasons 0.273, so a
    denominator that includes cloud converts almost a doubling of cloudiness into
    apparent ice loss.

    The early-to-late decline, on the smoothed daily series the API publishes:

        window and aggregation                  whole grid   clear sky
        day 45 to 180, mean of period means        31.9 %      22.7 %
        day 45 to 180, ratio of paired-day sums    32.4 %      23.4 %   <- the API
        day 60 to 151, mean of period means        32.4 %      22.5 %
        day 60 to 151, ratio of paired-day sums    32.4 %      22.5 %

    Which is the useful way to read it: window and aggregation move the answer by
    less than a percentage point, the denominator moves it by ten. So the
    denominator is the decision that has to be defended, and the rest is
    bookkeeping. On the raw scene values rather than the smoothed series the
    clear-sky figure is 20.4 percent, or 19.1 percent once unusable scenes are
    dropped as well.

    The archive's class percentages do not always add up, which this derivation
    has to survive rather than repair, and it does so in two places:

    * Where they overshoot far enough to drive `clear` to zero or below, no
      fraction exists at all and the scene is dropped.
    * Where they overshoot less, the ratio lands above 1. That happened on 87 of
      the 1120 scenes clearing the visibility gate, a median of 1.033 and a
      maximum of 1.192, so it is real inconsistency rather than rounding. Those
      are clamped to 1.0 rather than dropped. Dropping them would remove almost
      exclusively fully frozen days and bend the series downwards, while 1.0 is
      the physical ceiling and is what a fjord frozen shore to shore means. The
      clamp is one sided and it lowers the early period more than the late one,
      so it makes the headline decline smaller, not larger.

    A derived denominator does not undo the other defects of that archive, so
    every number above holds only until the reprocess replaces it.
    """
    needed = {"solid_pct", "light_pct", "cloud_pct", "land_pct", "nodata_pct"}
    missing = needed - set(frame.columns)
    if missing:
        raise ValueError(
            "raw archive carries neither the clear-sky columns nor the parts to "
            f"derive them; missing {sorted(missing)}"
        )

    numeric = {
        name: pd.to_numeric(frame[name], errors="coerce").fillna(0.0) for name in needed
    }
    clear = 1.0 - numeric["cloud_pct"] - numeric["land_pct"] - numeric["nodata_pct"]
    ice = numeric["solid_pct"] + numeric["light_pct"]

    usable = clear > LEGACY_MIN_CLEAR_SHARE
    dropped = int((~usable).sum())
    broken = int((clear <= 0).sum())
    fraction = (ice / clear).where(usable)

    over_one = int((fraction > 1.0).sum())
    clamped = fraction.clip(upper=1.0)

    print(
        f"[INFO] Legacy archive: clear-sky ice fraction derived from "
        f"solid+light over 1-cloud-land-nodata. {dropped} of {len(frame)} scenes "
        f"saw less than {LEGACY_MIN_CLEAR_SHARE:.0%} of the fjord and were dropped"
        + (f", including {broken} whose class percentages sum past the grid" if broken else "")
        + "."
    )
    if over_one:
        worst = float(fraction.max())
        print(
            f"[INFO] {over_one} of {int(usable.sum())} remaining scenes came out above "
            f"1.0 (worst {worst:.3f}) because their class percentages overshoot the "
            f"grid. Clamped to 1.0, which is the physical ceiling; see "
            f"_legacy_clear_fraction for why clamping beats dropping here."
        )
    return clamped


def clean_series(raw: pd.DataFrame) -> pd.DataFrame:
    """Turn one row per scene into one row per day, gap filled and smoothed.

    Five steps, in this order:

      1. ice fraction per scene, then averaged over the scenes of a day (there
         should only ever be one). See _scene_ice_fraction for which columns.
      2. reindex to every calendar day between the first and the last scene, so
         missing days become explicit NaN rather than absent rows.
      3. gaps up to 14 days are interpolated linearly; anything longer falls
         back to the day-of-year mean across all years. Outside the sun window
         nothing is filled at all.
      4. two passes of a centred 7-day mean, which is a 13-day triangular
         kernel.
      5. the smoothed column is blanked outside the sun window, because there
         is nothing there to smooth.
    """
    frame = raw.copy()
    frame["date"] = pd.to_datetime(frame["timestamp"], format="%Y%m%dT%H%M%S", utc=True)
    frame["year"] = frame["date"].dt.year
    frame["doy"] = frame["date"].dt.dayofyear
    frame["frac"] = _scene_ice_fraction(frame)

    daily = frame.groupby("date", as_index=False).agg(
        year=("year", "first"), doy=("doy", "first"), frac=("frac", "mean")
    )
    daily["date"] = pd.to_datetime(daily["date"]).dt.normalize()
    if daily["date"].duplicated().any():
        clashing = sorted(
            {d.date().isoformat() for d in daily.loc[daily["date"].duplicated(keep=False), "date"]}
        )
        raise SystemExit(
            f"[FAIL] more than one scene on {len(clashing)} day(s): {clashing[:8]}.\n"
            f"       The classifier is supposed to keep one scene per day. Run\n"
            f"       scripts/check_summary.py on the raw CSV before cleaning it."
        )
    daily = daily.set_index("date").asfreq("D").reset_index()
    daily["year"] = daily["date"].dt.year
    daily["doy"] = daily["date"].dt.dayofyear

    climatology = daily.groupby("doy")["frac"].mean().rename("clim_frac").reset_index()
    daily = daily.merge(climatology, on="doy")

    def fill_one_year(group: pd.DataFrame) -> pd.DataFrame:
        indexed = group.set_index("doy").sort_index()
        in_window = (indexed.index >= SEASON_START_DOY) & (indexed.index <= SEASON_END_DOY)
        frac = indexed["frac"].astype(float).copy()
        frac = frac.interpolate(limit=SHORT_GAP_DAYS, limit_direction="both")
        frac = frac.fillna(indexed["clim_frac"])
        # Outside the window nothing is invented: whatever the scene said, or
        # nothing at all.
        frac.loc[~in_window] = indexed["frac"].loc[~in_window]
        indexed["frac_filled"] = frac
        return indexed.reset_index()

    # Year by year rather than groupby.apply, which in pandas 2.2 warns about
    # operating on the grouping column and will change behaviour.
    daily = pd.concat(
        [fill_one_year(group) for _, group in daily.groupby("year", sort=True)],
        ignore_index=True,
    )

    daily["frac_smooth"] = daily.groupby("year")["frac_filled"].transform(
        lambda series: series.rolling(SMOOTH_WINDOW_DAYS, center=True, min_periods=1)
        .mean()
        .rolling(SMOOTH_WINDOW_DAYS, center=True, min_periods=1)
        .mean()
    )
    outside = (daily["doy"] < SEASON_START_DOY) | (daily["doy"] > SEASON_END_DOY)
    daily.loc[outside, "frac_smooth"] = np.nan

    return daily[["date", "year", "doy", "frac", "frac_filled", "frac_smooth"]].sort_values(
        "date"
    )


def write_clean(raw_path: Path, clean_path: Path, copy_public: bool = True) -> pd.DataFrame:
    if not raw_path.exists():
        raise SystemExit(f"[FAIL] no raw scene CSV at {raw_path}")
    raw = pd.read_csv(raw_path, low_memory=False)
    required = {"timestamp", "solid_pct", "light_pct"}
    missing = required.difference(raw.columns)
    if missing:
        raise SystemExit(
            f"[FAIL] {raw_path} is missing {sorted(missing)}. That file is the "
            f"per-scene output of the classifier, not the daily series."
        )
    print(f"[INFO] cleaning {len(raw)} scene rows from {raw_path}")
    daily = clean_series(raw)

    if clean_path.exists():
        previous = pd.read_csv(clean_path, parse_dates=["date"])
        _report_shift(previous, daily)

    clean_path.parent.mkdir(parents=True, exist_ok=True)
    daily.to_csv(clean_path, index=False, float_format="%.6f")
    print(f"[OK]   wrote {len(daily)} daily rows to {clean_path}")

    if copy_public:
        PUBLIC_COPY.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(clean_path, PUBLIC_COPY)
        print(f"[OK]   copied to {PUBLIC_COPY} (the download the story links to)")

    if STALE_JSON.exists():
        print(
            f"[WARN] {STALE_JSON} exists. backend/main.py serves that file whenever "
            f"the database is unreachable, ahead of the CSV, so a local API will "
            f"keep returning the old numbers until it is deleted or regenerated."
        )
    return daily


def _report_shift(previous: pd.DataFrame, current: pd.DataFrame) -> None:
    """Say how far the series just moved, before overwriting it."""
    old = previous[["date", "frac_smooth"]].rename(columns={"frac_smooth": "was"})
    new = current[["date", "frac_smooth"]].rename(columns={"frac_smooth": "now"})
    old["date"] = pd.to_datetime(old["date"], utc=True)
    new["date"] = pd.to_datetime(new["date"], utc=True)
    joined = old.merge(new, on="date", how="inner").dropna(subset=["was", "now"])
    if joined.empty:
        return
    joined["delta"] = joined["now"] - joined["was"]
    print(
        f"[INFO] against the current series: {len(joined)} shared days, "
        f"mean shift {joined['delta'].mean():+.4f}, "
        f"largest {joined['delta'].abs().max():.4f}"
    )
    joined["year"] = joined["date"].dt.year
    per_year = joined.groupby("year")[["was", "now"]].mean().round(4)
    per_year["delta"] = (per_year["now"] - per_year["was"]).round(4)
    print(per_year.to_string())


# --------------------------------------------------------------------------
# which days are missing
# --------------------------------------------------------------------------


def season_window(day: date) -> tuple[date, date]:
    """The observable window of the year that `day` falls in."""
    start = date(day.year, 1, 1) + timedelta(days=SEASON_START_DOY - 1)
    end = date(day.year, 1, 1) + timedelta(days=SEASON_END_DOY - 1)
    return start, end


def last_observed_day(csv_path: Path) -> date | None:
    """Newest day already in the series, from Postgres if configured, else CSV.

    The database is authoritative when present because that is what the API
    serves; the CSV is the local development copy.
    """
    db_url = os.getenv("DATABASE_URL") or os.getenv("DATABASE_PUBLIC_URL")
    if db_url:
        try:
            from sqlalchemy import create_engine, text

            engine = create_engine(db_url)
            with engine.connect() as conn:
                value = conn.execute(
                    text("SELECT MAX(date) FROM fjord_daily")
                ).scalar()
            if value is not None:
                parsed = pd.to_datetime(value).date()
                print(f"[INFO] Newest day in fjord_daily (Postgres): {parsed}")
                return parsed
        except Exception as exc:  # noqa: BLE001
            print(f"[WARN] Could not read fjord_daily from Postgres: {exc}")
            print("[WARN] Falling back to the CSV.")

    if not csv_path.exists():
        print(f"[WARN] No series found at {csv_path}.")
        return None
    frame = pd.read_csv(csv_path, usecols=["date"])
    parsed = pd.to_datetime(frame["date"], utc=True, errors="coerce").max()
    if pd.isna(parsed):
        return None
    result = parsed.date()
    print(f"[INFO] Newest day in {csv_path.name}: {result}")
    return result


def resolve_windows(
    last_day: date | None,
    today: date,
    explicit_start: date | None,
    explicit_end: date | None,
) -> list[tuple[date, date]]:
    """Every observable window still missing, oldest first.

    Returns a list, not a single window, because a backlog can span several
    seasons: the series stopped at 2025-06-23, so catching up in 2026 means the
    tail of the 2025 season AND all of 2026. One window per season keeps each
    classifier invocation bounded, and the caller can stop after any of them.
    """
    if explicit_start and explicit_end:
        return [(explicit_start, explicit_end)]

    first_year = (
        (explicit_start or (last_day + timedelta(days=1))).year
        if (explicit_start or last_day)
        else today.year
    )
    cursor = (
        explicit_start
        or (last_day + timedelta(days=1) if last_day else season_window(today)[0])
    )

    windows: list[tuple[date, date]] = []
    for year in range(first_year, today.year + 1):
        season_open, season_close = season_window(date(year, 6, 1))
        start = max(cursor, season_open)
        # Never ask for days the sun has not reached, nor for the future.
        end = min(season_close, explicit_end or today)
        if start <= end:
            windows.append((start, end))
        cursor = date(year + 1, 1, 1)
    return windows


def run_classifier(start: date, end: date, raw_path: Path, dry_run: bool) -> None:
    binary = shutil.which(CLI_NAME)
    if binary is None:
        raise SystemExit(INSTALL_HINT)

    command = [
        binary,
        "--start-date",
        start.isoformat(),
        "--end-date",
        end.isoformat(),
        "--output-dir",
        str(raw_path.parent),
        "--csv-name",
        raw_path.name,
    ]
    print(f"[INFO] {' '.join(command)}")
    if dry_run:
        print("[DRY-RUN] Not executing. The CLI appends by default, so a repeat "
              "run over the same window does not duplicate rows.")
        return
    # Anonymous access to the public Sentinel-2 bucket. Without it every band
    # read is a 403 and the run finishes fast with an empty CSV.
    env = dict(os.environ, AWS_NO_SIGN_REQUEST="YES")
    subprocess.run(command, check=True, env=env)


def run_aggregate(clean_path: Path) -> None:
    """Recompute the derived fjord tables the API reads.

    update_fjord_data.py defaults FJORD_CSV_PATH to /app/data/..., which only
    exists inside the pipeline container, so outside Docker it has to be told
    where the series actually is. It also needs DATABASE_URL; without one there
    is nothing to write to and the API falls back to reading the CSV directly.
    """
    script = HERE / "update_fjord_data.py"
    if not (os.getenv("DATABASE_URL") or os.getenv("DATABASE_PUBLIC_URL")):
        print(
            "[WARN] No DATABASE_URL or DATABASE_PUBLIC_URL set, so the derived "
            "tables cannot be written. The CSV is up to date and backend/main.py "
            "will compute the payload from it, but only if backend/data/"
            "fjord_data.json is not sitting in front of it."
        )
        return
    env = dict(os.environ, FJORD_CSV_PATH=str(clean_path))
    print(f"[INFO] FJORD_CSV_PATH={clean_path} {sys.executable} {script}")
    subprocess.run([sys.executable, str(script)], check=True, cwd=HERE, env=env)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Classify the Sentinel-2 days missing from the fjord series."
    )
    parser.add_argument("--start", type=date.fromisoformat)
    parser.add_argument("--end", type=date.fromisoformat)
    parser.add_argument(
        "--raw",
        type=Path,
        default=DEFAULT_RAW_CSV,
        help="Per-scene CSV the classifier writes and appends to.",
    )
    parser.add_argument(
        "--csv",
        type=Path,
        default=DEFAULT_CLEAN_CSV,
        help="Daily series the API reads. Derived from --raw, never written by the classifier.",
    )
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--clean-only",
        action="store_true",
        help="Skip the classifier; just rebuild the daily series from --raw.",
    )
    parser.add_argument(
        "--skip-aggregate",
        action="store_true",
        help="Classify and clean but do not recompute the derived tables.",
    )
    parser.add_argument(
        "--no-public-copy",
        action="store_true",
        help="Do not copy the result into frontend/public/data.",
    )
    parser.add_argument(
        "--today",
        type=date.fromisoformat,
        help="Override today's date, for testing the window logic.",
    )
    args = parser.parse_args()

    if args.clean_only:
        write_clean(args.raw, args.csv, copy_public=not args.no_public_copy)
        if args.skip_aggregate:
            print("[INFO] Skipping the aggregate step.")
            return
        run_aggregate(args.csv)
        print("[OK] Fjord series rebuilt from the raw scenes.")
        return

    today = args.today or date.today()
    last_day = last_observed_day(args.csv)
    windows = resolve_windows(last_day, today, args.start, args.end)

    if not windows:
        print(
            f"[OK] The fjord series is up to date. Newest day {last_day}, and "
            f"the {today.year} observation window has nothing newer to offer."
        )
        return

    total = sum((end - start).days + 1 for start, end in windows)
    print(f"[INFO] {len(windows)} season(s) to catch up, {total} days in total:")
    for start, end in windows:
        print(f"[INFO]   {start} to {end}  ({(end - start).days + 1} days)")

    for start, end in windows:
        run_classifier(start, end, args.raw, args.dry_run)

    if args.dry_run:
        print("[INFO] Skipping the clean and aggregate steps.")
        return

    write_clean(args.raw, args.csv, copy_public=not args.no_public_copy)

    if args.skip_aggregate:
        print("[INFO] Skipping the aggregate step.")
        return
    run_aggregate(args.csv)
    print("[OK] Fjord series refreshed.")


if __name__ == "__main__":
    main()
