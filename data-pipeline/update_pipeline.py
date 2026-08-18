import pandas as pd
import numpy as np
import json
import os
import subprocess
import sys
import time
from dataclasses import dataclass
from datetime import date, datetime
import requests
import io

# For inserting into Postgres
from sqlalchemy import create_engine

# ===========================================================================
# Shared source registry, HTTP fetching and freshness assertions
# ===========================================================================
#
# WHY THIS BLOCK LIVES HERE
# -------------------------
# This module is the single authoritative refresh path, so there is exactly ONE
# definition of every source URL and every freshness rule.  There used to be a
# second, divergent copy in backend/update_data.py, driven by its own GitHub
# Action; that is how the dead NSIDC host survived in two places at once for a
# year.  Both the duplicate and its Action are gone.  The Railway cron runs this
# file, and .github/workflows/fallback-refresh.yml runs this same file by hand
# when the fallback data.json needs rebuilding.
#
# The helpers are kept inside update_pipeline.py rather than in a separate
# sibling module on purpose: data-pipeline/Dockerfile copies an explicit
# allowlist of files into the Railway image
#     COPY update_pipeline.py update_fjord_data.py wait_for_db.py ./
# so a new sibling module would simply be absent at runtime there and the cron
# job would crash on import.  If that COPY line ever becomes a wildcard, this
# block can be lifted into its own module unchanged.
#
# Importing this module is side effect free: everything below is definitions,
# and the pipeline only executes under the __main__ guard at the bottom.
# ---------------------------------------------------------------------------

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/114.0.0.0 Safari/537.36"
)

DEFAULT_TIMEOUT_SECONDS = 60
DEFAULT_ATTEMPTS_PER_URL = 3
RETRY_BACKOFF_SECONDS = 3

# --- Source URL chains -----------------------------------------------------
# Each chain is tried in order and the first host that answers 200 with a
# parseable header wins.  An env var may prepend extra candidates as a
# comma separated list; the verified defaults always remain as a safety net.

# NSIDC NOAA G02135 Northern Hemisphere daily sea ice extent, v4 CSV.
# The masie_web host was retired and no longer resolves.  It is kept LAST so
# that deployments still pinned to it degrade predictably instead of changing
# behaviour silently.
SEA_ICE_DAILY_CSV_URL_ENV = "SEA_ICE_DAILY_CSV_URL"
SEA_ICE_DAILY_CSV_URLS = (
    "https://noaadata.apps.nsidc.org/NOAA/G02135/north/daily/data/N_seaice_extent_daily_v4.0.csv",
    "https://masie_web.apps.nsidc.org/pub/DATASETS/NOAA/G02135/north/daily/data/N_seaice_extent_daily_v4.0.csv",
)
SEA_ICE_HEADER_TOKENS = ("year", "month", "day", "extent")

# NASA GISS GISTEMP v4 zonal annual means.
GISTEMP_CSV_URL_ENV = "GISTEMP_ZONANN_CSV_URL"
GISTEMP_CSV_URLS = (
    "https://data.giss.nasa.gov/gistemp/tabledata_v4/ZonAnn.Ts+dSST.csv",
)
GISTEMP_HEADER_TOKENS = ("year", "glob")

# Our World in Data annual CO2 emissions by region.
OWID_CO2_CSV_URL_ENV = "OWID_CO2_CSV_URL"
OWID_CO2_CSV_URLS = (
    "https://ourworldindata.org/grapher/annual-co-emissions-by-region.csv"
    "?v=1&csvType=full&useColumnShortNames=true",
)
OWID_CO2_HEADER_TOKENS = ("entity", "year", "emissions_total")

# --- Freshness budgets -----------------------------------------------------
# A scheduled job that SUCCEEDS while writing year old data is the exact
# failure mode that let this story publish 2025 numbers in 2026.  Every source
# therefore gets a maximum age, and breaching it raises StaleDataError so the
# job goes red instead of quietly committing stale rows.
#
# Daily series: measured against the newest calendar date in the file.
SEA_ICE_MAX_AGE_DAYS_ENV = "SEA_ICE_MAX_AGE_DAYS"
SEA_ICE_MAX_AGE_DAYS = 10

# Annual series: an annual row is dated to 31 December of the year it covers,
# so the age budget must cover the publication lag of the whole next release.
#
# GISTEMP publishes year N in January of year N+1, so the worst legitimate age
# is roughly 13 months. 400 days gives about five weeks of slack.
GISTEMP_MAX_AGE_DAYS_ENV = "GISTEMP_MAX_AGE_DAYS"
GISTEMP_MAX_AGE_DAYS = 400

# Our World in Data tracks the Global Carbon Budget, which publishes year N in
# roughly November of year N+1.  Just before a release the newest row is
# legitimately about 700 days old, so 400 would cry wolf every single autumn.
# A freshness alarm that fires on healthy data gets muted, and then we are back
# to shipping stale numbers, so this one gets its own, larger budget.
OWID_CO2_MAX_AGE_DAYS_ENV = "OWID_CO2_MAX_AGE_DAYS"
OWID_CO2_MAX_AGE_DAYS = 800

# Climatology window for the annual sea ice anomaly bars. This must stay equal
# to backend/settings.py seaice_anom_baseline_start / seaice_anom_baseline_end,
# which the decadal anomaly chart uses and which the story names in its copy.
# Two charts on two baselines is how the annual bars ended up 0.335 M km2 away
# from the reference line the reader had just been taught.
SEA_ICE_ANOM_BASELINE_START_ENV = "SEA_ICE_ANOM_BASELINE_START"
SEA_ICE_ANOM_BASELINE_START = 1981
SEA_ICE_ANOM_BASELINE_END_ENV = "SEA_ICE_ANOM_BASELINE_END"
SEA_ICE_ANOM_BASELINE_END = 2010


class SourceUnavailableError(RuntimeError):
    """Every candidate URL for a source failed to deliver a usable CSV."""


class StaleDataError(RuntimeError):
    """A source answered, but its newest row is older than the age budget."""


@dataclass
class FetchedSource:
    """A CSV payload plus the URL that actually served it."""

    label: str
    url: str
    text: str

    def frame(self, **read_csv_kwargs) -> pd.DataFrame:
        return pd.read_csv(io.StringIO(self.text), **read_csv_kwargs)


def resolve_urls(env_var: str, defaults) -> list:
    """Build the candidate chain: env override first, verified defaults after.

    The env var accepts a comma separated list so an operator can point at a
    mirror without losing the built in fallbacks.  Read at call time, not at
    import time, so tests and one off runs can set it late.
    """
    candidates = []
    override = os.getenv(env_var, "").strip()
    if override:
        candidates.extend(part.strip() for part in override.split(",") if part.strip())
    for url in defaults:
        if url not in candidates:
            candidates.append(url)
    return candidates


def env_int(env_var: str, fallback: int) -> int:
    """Read a tunable integer from the environment, ignoring blank values."""
    raw = os.getenv(env_var, "").strip()
    if not raw:
        return fallback
    try:
        return int(raw)
    except ValueError:
        raise ValueError(
            f"Environment variable {env_var}={raw!r} is not an integer."
        )


def _header_line(text: str) -> str:
    for line in text.splitlines():
        if line.strip():
            return line
    return ""


def _check_header(text: str, required_tokens) -> None:
    """Reject payloads that are not the CSV we expect.

    A captive portal, a maintenance page or an S3 style XML error can all come
    back with HTTP 200.  Without this check pandas would happily parse the
    HTML into a one column frame and the run would continue on garbage.
    """
    header = _header_line(text).lower()
    if not header:
        raise ValueError("response body was empty")
    missing = [token for token in required_tokens if token not in header]
    if missing:
        preview = header[:120]
        raise ValueError(
            f"header is missing {missing}; first line was {preview!r}"
        )


def fetch_csv(
    label: str,
    env_var: str,
    default_urls,
    required_tokens,
    attempts: int = DEFAULT_ATTEMPTS_PER_URL,
    timeout: int = DEFAULT_TIMEOUT_SECONDS,
) -> FetchedSource:
    """Return the first candidate URL that serves a parseable CSV.

    Tries every URL in the chain, retrying each one a few times because
    data.giss.nasa.gov in particular refuses connections intermittently.
    Raises SourceUnavailableError with the full failure log if none succeed,
    so the scheduled job reports which hosts were tried and why each failed.
    """
    candidates = resolve_urls(env_var, default_urls)
    headers = {"User-Agent": USER_AGENT}
    failures = []

    for url in candidates:
        for attempt in range(1, attempts + 1):
            try:
                response = requests.get(url, headers=headers, timeout=timeout)
                response.raise_for_status()
                _check_header(response.text, required_tokens)
            except Exception as exc:
                failures.append(f"  {url} (attempt {attempt}/{attempts}): {exc}")
                print(
                    f"[WARN] {label}: attempt {attempt}/{attempts} failed for {url}: {exc}"
                )
                if attempt < attempts:
                    time.sleep(RETRY_BACKOFF_SECONDS)
                continue
            print(f"[OK] {label}: fetched {len(response.text)} bytes from {url}")
            return FetchedSource(label=label, url=url, text=response.text)

    joined = "\n".join(failures)
    raise SourceUnavailableError(
        f"{label}: every candidate URL failed.\n{joined}\n"
        f"Set {env_var} to a working mirror to override the chain."
    )


def annual_row_day(year: int) -> date:
    """Date an annual observation to the last day of the year it covers."""
    return date(int(year), 12, 31)


def assert_fresh(
    latest_day: date,
    label: str,
    max_age_days: int,
    source_url: str,
    env_var: str,
    now: date = None,
) -> int:
    """Fail loudly when the newest row is older than the age budget.

    Returns the age in days so callers can log it.
    """
    today = now or date.today()
    age_days = (today - latest_day).days
    if age_days > max_age_days:
        raise StaleDataError(
            f"{label} is STALE: newest row is {latest_day.isoformat()}, "
            f"which is {age_days} days old on {today.isoformat()}. "
            f"The limit is {max_age_days} days. "
            f"Served by {source_url}. "
            f"Refusing to publish stale data. "
            f"If this source has legitimately changed its update cadence, "
            f"raise {env_var}; if the source moved, update its URL chain."
        )
    print(
        f"[OK] {label}: newest row {latest_day.isoformat()}, "
        f"{age_days} days old, budget {max_age_days} days."
    )
    return age_days


# Warnings collected during a run, surfaced at the end and in the payload so a
# degraded refresh is visible rather than silent.
DEGRADED_SOURCES = []


def fetch_annual_source(
    label: str,
    env_var: str,
    default_urls,
    required_tokens,
    cache_path: str,
):
    """Fetch an annual series, falling back to the last good local copy.

    The daily sea ice series is the story's headline dataset. GISTEMP and the
    OWID CO2 series only feed the correlation matrix, yet a single outage at
    data.giss.nasa.gov used to abort the whole run before anything was written,
    because the sources were fetched in sequence and data.json is written once
    at the end. A NASA outage must not be able to freeze the ice record.

    So these two degrade instead of blocking: if every candidate URL fails we
    reuse the copy the previous successful run saved, record the degradation,
    and carry on. Annual series change once a year, so a day on cached values
    costs nothing. The staleness stays visible: the age check still runs, a
    breach is recorded rather than raised, and backend/main.py reports each
    source's age to the reader.

    Returns (frame, source_url, degraded).
    """
    try:
        source = fetch_csv(
            label=label,
            env_var=env_var,
            default_urls=default_urls,
            required_tokens=required_tokens,
        )
        return source.frame(), source.url, False
    except SourceUnavailableError as exc:
        if not os.path.exists(cache_path):
            raise SourceUnavailableError(
                f"{label}: every candidate URL failed and there is no cached "
                f"copy at {cache_path} to fall back on. Original error: {exc}"
            ) from exc
        note = (
            f"{label}: every candidate URL failed, falling back to the cached "
            f"copy at {cache_path} from the last successful run. The ice record "
            f"still updates. Original error: {exc}"
        )
        print(f"[DEGRADED] {note}")
        DEGRADED_SOURCES.append(note)
        return pd.read_csv(cache_path), f"cache:{cache_path}", True


def check_annual_freshness(
    latest_day: date,
    label: str,
    max_age_days: int,
    source_url: str,
    env_var: str,
) -> None:
    """Record, do not raise, when an annual series is behind.

    An annual series being late is a fact worth reporting, not a reason to stop
    publishing a daily ice measurement taken yesterday.
    """
    try:
        assert_fresh(
            latest_day=latest_day,
            label=label,
            max_age_days=max_age_days,
            source_url=source_url,
            env_var=env_var,
        )
    except StaleDataError as exc:
        # assert_fresh's text ends in "Refusing to publish stale data", which is
        # true where it aborts but wrong here: this path does publish, with the
        # lag recorded. Restate it so the log cannot be misread.
        note = str(exc).replace(
            "Refusing to publish stale data. ",
            "Publishing anyway because this is an annual series and the daily "
            "ice record is current; the lag is recorded and reported. ",
        )
        print(f"[DEGRADED] {note}")
        DEGRADED_SOURCES.append(note)


def parse_sea_ice_daily_csv(source: FetchedSource) -> pd.DataFrame:
    """Turn the NSIDC v4 daily CSV into a long frame.

    Adds Date, Year, DayOfYear and Extent columns alongside the original ones.
    Single definition, so no second copy of this logic can drift away
    into parsing the same file differently.
    """
    # Row 2 of the NSIDC v4 daily CSV is a units row, not data.  Skip it.
    df_raw = source.frame(skiprows=[1])
    df_raw.columns = [str(c).strip() for c in df_raw.columns]

    # The v4 daily CSV uses 'Year', 'Month', 'Day', 'Extent' and optionally
    # 'Missing' and 'Source Data'.  Normalise to short internal names.
    rename_map = {}
    for col in df_raw.columns:
        c = col.strip().lower()
        if c.startswith("year"):
            rename_map[col] = "year"
        elif c.startswith("month") or c.startswith("mm"):
            rename_map[col] = "mo"
        elif c.startswith("day") or c.startswith("dd"):
            rename_map[col] = "da"
        elif "extent" in c:
            rename_map[col] = "extent"
    df_raw = df_raw.rename(columns=rename_map)

    required_cols = {"year", "mo", "da", "extent"}
    missing_cols = required_cols - set(df_raw.columns)
    if missing_cols:
        raise KeyError(
            f"Sea ice CSV from {source.url} is missing expected columns "
            f"{missing_cols}. Available columns: {list(df_raw.columns)}"
        )

    df_raw["Date"] = pd.to_datetime(
        {
            "year": df_raw["year"].astype(int),
            "month": df_raw["mo"].astype(int),
            "day": df_raw["da"].astype(int),
        },
        errors="coerce",
    )
    df_raw = df_raw.dropna(subset=["Date", "extent"]).copy()
    if df_raw.empty:
        raise ValueError(
            f"Sea ice CSV from {source.url} produced no usable rows."
        )
    df_raw["Year"] = df_raw["Date"].dt.year.astype(int)
    df_raw["DayOfYear"] = df_raw["Date"].dt.dayofyear.astype(int)
    df_raw["Extent"] = df_raw["extent"].astype(float)
    return df_raw


def normalize_co2_columns(frame: pd.DataFrame) -> pd.DataFrame:
    """Give the OWID CO2 frame the capitalised keys the pipeline expects.

    The download currently ships lower case headers
    (entity, code, year, emissions_total) while every downstream groupby and
    pivot asks for 'Year' and 'Entity'.  Normalising here means both this
    pipeline gets the same treatment for every source.
    """
    frame = frame.rename(columns={c: str(c).strip() for c in frame.columns})
    lowered = {str(col).lower(): col for col in frame.columns}
    renames = {}
    for wanted in ("Year", "Entity"):
        key = wanted.lower()
        if key in lowered and wanted not in frame.columns:
            renames[lowered[key]] = wanted
    if renames:
        frame = frame.rename(columns=renames)
    return frame


def latest_year_in(frame: pd.DataFrame, label: str) -> int:
    """Largest usable value of the Year column of an annual frame."""
    years = pd.to_numeric(frame["Year"], errors="coerce").dropna()
    if years.empty:
        raise ValueError(f"{label}: no parseable Year values found.")
    return int(years.max())


def update_data():
    """
    Download and process climate datasets to produce a unified JSON payload
    and optionally persist results into a Postgres database.  This version
    uses the v4 daily sea ice extent CSV from NSIDC (NOAA G02135) instead
    of the deprecated v3 Excel file.  All downstream calculations and
    output structures remain unchanged so that the frontend continues to
    receive the same camelCase keys.  When a DATABASE_URL is provided,
    each DataFrame is written into snake_case tables.
    """
    DEGRADED_SOURCES.clear()
    os.makedirs("data", exist_ok=True)

    # ------------------------------------------------------------------
    # 1) Daily sea ice extent data from NSIDC (NOAA G02135 v4)
    # The v3 Excel file is no longer available.  Version 4 publishes
    # CSVs per hemisphere.  We'll download the Northern Hemisphere
    # daily extent file and derive Date, Year and DayOfYear columns.
    #
    # This runs FIRST and is the only source allowed to abort the run. It is the
    # story's headline dataset; the annual series below only feed the
    # correlation matrix and degrade to cached copies instead of blocking.
    sea_source = fetch_csv(
        label="NSIDC daily sea ice extent",
        env_var=SEA_ICE_DAILY_CSV_URL_ENV,
        default_urls=SEA_ICE_DAILY_CSV_URLS,
        required_tokens=SEA_ICE_HEADER_TOKENS,
    )
    df_raw = parse_sea_ice_daily_csv(sea_source)
    # Build the working df_ice
    df_ice = df_raw[["Date", "Year", "DayOfYear", "Extent"]].copy()

    # Freshness gate for the daily series.  This is the one that silently went
    # 373 days stale, so it gets the tightest budget.
    assert_fresh(
        latest_day=df_ice["Date"].max().date(),
        label="NSIDC daily sea ice extent",
        max_age_days=env_int(SEA_ICE_MAX_AGE_DAYS_ENV, SEA_ICE_MAX_AGE_DAYS),
        source_url=sea_source.url,
        env_var=SEA_ICE_MAX_AGE_DAYS_ENV,
    )

    # Save raw CSV for reproducibility
    os.makedirs("data/csv", exist_ok=True)
    df_raw.to_csv(os.path.join("data", "original_ice_noaa.csv"), index=False)

    # ------------------------------------------------------------------
    # 2) NASA GISS temperature data (annual). Degrades to the cached copy if
    # data.giss.nasa.gov is unreachable, which it demonstrably is at times.
    temp_cache = os.path.join("data", "original_temperature_nasa.csv")
    temp_df, temp_url, temp_degraded = fetch_annual_source(
        label="GISTEMP annual zonal means",
        env_var=GISTEMP_CSV_URL_ENV,
        default_urls=GISTEMP_CSV_URLS,
        required_tokens=GISTEMP_HEADER_TOKENS,
        cache_path=temp_cache,
    )
    temp_df.columns = [str(c).strip() for c in temp_df.columns]
    check_annual_freshness(
        latest_day=annual_row_day(latest_year_in(temp_df, "GISTEMP")),
        label="GISTEMP annual zonal means",
        max_age_days=env_int(GISTEMP_MAX_AGE_DAYS_ENV, GISTEMP_MAX_AGE_DAYS),
        source_url=temp_url,
        env_var=GISTEMP_MAX_AGE_DAYS_ENV,
    )
    if not temp_degraded:
        temp_df.to_csv(temp_cache, index=False)

    # ------------------------------------------------------------------
    # 3) CO₂ emissions data from Our World in Data
    co2_cache = os.path.join("data", "original_co2_worldindata.csv")
    annual_co_emissions, co2_url, co2_degraded = fetch_annual_source(
        label="OWID annual CO2 emissions",
        env_var=OWID_CO2_CSV_URL_ENV,
        default_urls=OWID_CO2_CSV_URLS,
        required_tokens=OWID_CO2_HEADER_TOKENS,
        cache_path=co2_cache,
    )
    annual_co_emissions = normalize_co2_columns(annual_co_emissions)
    check_annual_freshness(
        latest_day=annual_row_day(latest_year_in(annual_co_emissions, "OWID CO2")),
        label="OWID annual CO2 emissions",
        max_age_days=env_int(OWID_CO2_MAX_AGE_DAYS_ENV, OWID_CO2_MAX_AGE_DAYS),
        source_url=co2_url,
        env_var=OWID_CO2_MAX_AGE_DAYS_ENV,
    )
    if not co2_degraded:
        annual_co_emissions.to_csv(co2_cache, index=False)

    # ------------------------------------------------------------------
    # 4) Clean sea ice data and compute derived statistics
    # For v4 CSV the data is already long-format.  Remove NaN Extent rows.
    df_ice_clean = df_ice.dropna(subset=["Extent"]).copy()
    # Sorting ensures downstream calculations (e.g. rolling means) work as expected
    df_ice_clean.sort_values(["Year", "DayOfYear"], inplace=True)

    # Compute annual mean sea ice extent to merge with temperature data
    sea_ice_annual = (
        df_ice_clean.groupby("Year")["Extent"]
        .mean()
        .reset_index(name="SeaIceMean")
    )

    # ------------------------------------------------------------------
    # 5) Merge temperature & sea ice and process CO₂ data
    merged_tempice = pd.merge(temp_df, sea_ice_annual, on="Year", how="inner")

    if "emissions_total" not in annual_co_emissions.columns:
        raise KeyError(
            "Missing column 'emissions_total' in CO₂ data. "
            f"Check actual columns: {annual_co_emissions.columns}"
        )
    if "Year" not in annual_co_emissions.columns:
        raise KeyError(
            "Missing column 'Year' in CO₂ data after normalization. "
            f"Check actual columns: {annual_co_emissions.columns}"
        )
    if "Entity" not in annual_co_emissions.columns:
        raise KeyError(
            "Missing column 'Entity' in CO₂ data after normalization. "
            f"Check actual columns: {annual_co_emissions.columns}"
        )

    # Global CO2 per year: the "World" row, not a mean over entities.
    #
    # This used to average emissions_total across every OWID entity in a year.
    # That set holds 247 rows mixing individual countries with aggregates like
    # "World", "Asia", "European Union (27)", "High-income countries" and
    # "International shipping", so the average was not a physical quantity at
    # all, and it came out about 38x too small: 0.91 Gt for 2020 against a true
    # world total of 35.13 Gt. The frontend divides this by 1e9 and labels the
    # axis "CO2 (Gt)", so the reader saw the wrong number under a correct unit.
    # The entity list also grows from 230 to 247 over the record, which bent the
    # trend on top of the scale error.
    world_rows = annual_co_emissions[annual_co_emissions["Entity"] == "World"]
    if world_rows.empty:
        raise ValueError(
            "The OWID CO2 table has no 'World' entity. Entities seen: "
            f"{sorted(annual_co_emissions['Entity'].unique())[:12]} ... "
            "Refusing to fall back to a mean over entities, which is what "
            "produced a figure 38x too small."
        )
    world_totals = (
        world_rows.groupby("Year")["emissions_total"].sum().round()
    )
    annual_co_emissions["GlobalCO2Mean"] = annual_co_emissions["Year"].map(
        world_totals
    )
    # Pivot to wide form by region for correlation matrix
    co2_wide = annual_co_emissions.pivot(index="Year", columns="Entity", values="emissions_total")
    merged_all = pd.merge(merged_tempice, co2_wide, on="Year", how="left")
    global_co2 = annual_co_emissions[["Year", "GlobalCO2Mean"]].drop_duplicates()
    merged_all = pd.merge(merged_all, global_co2, on="Year", how="left")

    # ------------------------------------------------------------------
    # 6) Compute z-score columns
    arctic_series = merged_all["64N-90N"]
    seaice_series = merged_all["SeaIceMean"]
    co2_series = merged_all["GlobalCO2Mean"]

    arctic_mean, arctic_std = arctic_series.mean(), arctic_series.std()
    seaice_mean, seaice_std = seaice_series.mean(), seaice_series.std()
    co2_mean, co2_std = co2_series.mean(), co2_series.std()

    merged_all["Arctic_z"] = (arctic_series - arctic_mean) / arctic_std
    merged_all["SeaIce_z"] = (seaice_series - seaice_mean) / seaice_std
    merged_all["SeaIce_z_inv"] = -(merged_all["SeaIce_z"])
    merged_all["GlobCO2Mean_z"] = (co2_series - co2_mean) / co2_std

    # ------------------------------------------------------------------
    # 7) Build correlation matrix for Recharts heatmap
    corr_vars = ["Glob", "64N-90N", "GlobalCO2Mean"]
    subset_df = merged_all[corr_vars].dropna()
    corr_matrix = subset_df.corr(method="pearson")
    heatmap_list = []
    for row_var in corr_vars:
        for col_var in corr_vars:
            val = corr_matrix.loc[row_var, col_var]
            heatmap_list.append(
                {"rowLabel": row_var, "colLabel": col_var, "value": float(val)}
            )

    # ------------------------------------------------------------------
    # 8) Precompute IQR stats (exclude the running year)
    #
    # The year to exclude is the newest one in the data, not a literal. It used
    # to be `!= 2025`, which silently inverted its own purpose the moment the
    # feed advanced: 2026 arrived as a partial year and went into the
    # climatology, while a complete 2025 was dropped. 2025 holds the daily
    # record low on 103 of 366 days, so every one of those was missing from
    # iqrStats.minVal, and the API passes iqrStats straight through to the
    # reader. Deriving the year means the band self-corrects each January.
    current_year = int(df_ice_clean["Year"].max())
    main_iqr = df_ice_clean[df_ice_clean["Year"] != current_year]
    grouped = main_iqr.groupby("DayOfYear")["Extent"]
    min_series = grouped.min().rename("minVal")
    q25_series = grouped.quantile(0.25).rename("q25")
    q75_series = grouped.quantile(0.75).rename("q75")
    mean_series = grouped.mean().rename("meanVal")
    iqr_stats = pd.concat(
        [min_series, q25_series, q75_series, mean_series], axis=1
    ).reset_index()
    iqr_stats_list = iqr_stats.to_dict(orient="records")

    # ------------------------------------------------------------------
    # 9) The running, incomplete season. Key stays "partial2025" because the
    # frontend and the DB table are named that way; the contents are whatever
    # year is currently running. backend/main.py recomputes this from
    # latestSeaIceSeason anyway, so this is the fallback path.
    partial_2025_df = df_ice_clean[df_ice_clean["Year"] == current_year].copy()
    if len(partial_2025_df) > 0:
        partial_2025_list = partial_2025_df[["DayOfYear", "Extent"]].to_dict(
            orient="records"
        )
    else:
        partial_2025_list = []

    # ------------------------------------------------------------------
    # 10) Annual sea ice extent anomalies for bar chart
    #
    # The climatology is the 1981-2010 window, the same baseline the decadal
    # chart uses (backend/settings.py seaice_anom_baseline_start/end) and the
    # same one the story names in the copy. It used to be the mean over the
    # WHOLE record, which silently folds the decline into its own reference
    # level: the full-record day-mean is 11.31 M km2 against 11.64 for
    # 1981-2010, so every bar sat 0.335 M km2 too high. That moved the last
    # above-zero year from 1999 to 2003 and cut the number of below-average
    # years from 25 to 20, on a chart whose whole job is to say when the record
    # crossed the line. A creeping baseline also re-draws every historical bar
    # each time a new year lands.
    baseline_start = env_int(
        SEA_ICE_ANOM_BASELINE_START_ENV, SEA_ICE_ANOM_BASELINE_START
    )
    baseline_end = env_int(SEA_ICE_ANOM_BASELINE_END_ENV, SEA_ICE_ANOM_BASELINE_END)
    baseline_rows = df_ice_clean[
        (df_ice_clean["Year"] >= baseline_start)
        & (df_ice_clean["Year"] <= baseline_end)
    ]
    if baseline_rows.empty:
        raise ValueError(
            f"No sea ice rows in the anomaly baseline {baseline_start}-"
            f"{baseline_end}; the record covers "
            f"{int(df_ice_clean['Year'].min())}-{int(df_ice_clean['Year'].max())}. "
            "Refusing to fall back to a full-record climatology, which is what "
            "put the annual bars 0.335 M km2 off the story's baseline."
        )
    seasonal_mean = (
        baseline_rows.groupby("DayOfYear")["Extent"]
        .mean()
        .reset_index(name="Seasonal_Mean")
    )
    merged_for_anomaly = df_ice_clean.merge(
        seasonal_mean, on="DayOfYear", how="left"
    )
    uncovered = merged_for_anomaly["Seasonal_Mean"].isna().sum()
    if uncovered:
        raise ValueError(
            f"{uncovered} daily rows have no {baseline_start}-{baseline_end} "
            "climatology for their day of year, so their anomaly would be NaN "
            "and the annual mean would silently drop them."
        )
    merged_for_anomaly["DailyAnomaly"] = (
        merged_for_anomaly["Extent"] - merged_for_anomaly["Seasonal_Mean"]
    )
    df_annual_anomaly = merged_for_anomaly.groupby("Year", as_index=False)[
        "DailyAnomaly"
    ].mean()
    df_annual_anomaly.rename(
        columns={"DailyAnomaly": "AnnualAnomaly"}, inplace=True
    )
    # Drop the running year. Its mean covers only the days observed so far, and
    # the truncation bias is not even a constant offset (+0.42 for 2024 seen to
    # day 214, +0.14 for 2025), so the bar would not be comparable with any
    # other bar in the chart. The chart renders every row it receives.
    df_annual_anomaly = df_annual_anomaly[
        df_annual_anomaly["Year"] != current_year
    ]
    annual_anomaly_list = df_annual_anomaly.to_dict(orient="records")

    # ------------------------------------------------------------------
    # 11) Daily sea ice records
    df_ice_clean["DateStr"] = df_ice_clean["Date"].dt.strftime("%Y-%m-%d")
    daily_ice_records = df_ice_clean.drop(columns=["Date"]).to_dict(
        orient="records"
    )
    # Replace NaNs with None for JSON serialization
    daily_ice_records = [
        {k: (None if pd.isna(v) else v) for k, v in row.items()}
        for row in daily_ice_records
    ]

    # ------------------------------------------------------------------
    # 12) Convert final DataFrames to Python dicts for JSON
    merged_all = merged_all.replace({np.nan: None})
    annual_records = merged_all.to_dict(orient="records")

    final_output = {
        "annual": annual_records,
        "dailySeaIce": daily_ice_records,
        "corrMatrix": heatmap_list,
        "iqrStats": iqr_stats_list,
        "partial2025": partial_2025_list,
        "annualAnomaly": annual_anomaly_list,
    }

    # A degraded run still publishes, but it must say so. The watchdog reads
    # this and the API surfaces per-source age, so a fallback to cached annual
    # data cannot pass for a healthy refresh.
    if DEGRADED_SOURCES:
        final_output["pipelineWarnings"] = list(DEGRADED_SOURCES)
        print(
            f"\n[DEGRADED] Refresh completed with {len(DEGRADED_SOURCES)} "
            f"degraded source(s). The daily ice record is current; see "
            f"pipelineWarnings in data.json."
        )

    # ------------------------------------------------------------------
    # 13) Persist to CSV/JSON for local development
    annual_df = pd.DataFrame(annual_records)
    daily_df = pd.DataFrame(daily_ice_records)
    corr_df = pd.DataFrame(heatmap_list)
    iqr_df = pd.DataFrame(iqr_stats_list)
    p2025_df = pd.DataFrame(partial_2025_list)
    anomaly_df = pd.DataFrame(annual_anomaly_list)

    # Create directories if not present
    os.makedirs("data/csv", exist_ok=True)
    os.makedirs("data/csv/dropped", exist_ok=True)
    # Save CSVs
    annual_df.to_csv(os.path.join("data/csv", "annual.csv"), index=False)
    daily_df.to_csv(os.path.join("data/csv", "dailySeaIce.csv"), index=False)
    corr_df.to_csv(os.path.join("data/csv", "corrMatrix.csv"), index=False)
    iqr_df.to_csv(os.path.join("data/csv", "iqrStats.csv"), index=False)
    p2025_df.to_csv(os.path.join("data/csv", "partial2025.csv"), index=False)
    anomaly_df.to_csv(os.path.join("data/csv", "annualAnomaly.csv"), index=False)

    # Save combined JSON
    with open(os.path.join("data", "data.json"), "w") as f:
        json.dump(final_output, f, indent=2)

    # ------------------------------------------------------------------
    # 14) Optionally insert each DataFrame into Postgres if DATABASE_URL is set
    database_url = os.getenv("DATABASE_URL") or os.getenv("DATABASE_PUBLIC_URL")
    if database_url:
        engine = create_engine(database_url)
        print("[INFO] Inserting DataFrames into Postgres...")
        # Write into snake_case tables.  These names are mapped back to
        # camelCase in the API response for the frontend.
        annual_df.to_sql("annual", engine, if_exists="replace", index=False)
        daily_df.to_sql("daily_sea_ice", engine, if_exists="replace", index=False)
        corr_df.to_sql("corr_matrix", engine, if_exists="replace", index=False)
        iqr_df.to_sql("iqr_stats", engine, if_exists="replace", index=False)
        p2025_df.to_sql("partial_2025", engine, if_exists="replace", index=False)
        anomaly_df.to_sql(
            "annual_anomaly", engine, if_exists="replace", index=False
        )
        print("[INFO] Successfully inserted data into Postgres.")
    else:
        print("[INFO] No DATABASE_URL / DATABASE_PUBLIC_URL found, skipping Postgres insert.")

    print(
        f"Data updated at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} "
        f"and saved to data/data.json"
    )


def _has_database_url() -> bool:
    return bool(os.getenv("DATABASE_URL") or os.getenv("DATABASE_PUBLIC_URL"))


def _should_run_chained_pipeline() -> bool:
    if os.getenv("PIPELINE_SINGLE_STAGE") == "1":
        return False
    # Railway cron currently has drifted service-level commands in some environments.
    # Running the full chain here keeps the job correct even when the service command
    # is still `python3 update_pipeline.py`.
    return bool(os.getenv("RAILWAY_ENVIRONMENT"))


def _run_step(script_name: str) -> None:
    subprocess.run([sys.executable, script_name], check=True)


if __name__ == "__main__":
    if _should_run_chained_pipeline():
        if _has_database_url():
            _run_step("wait_for_db.py")
    # The fjord step is NOT chained here. See data-pipeline/railway.toml: it is
    # owned by refresh_fjord_season.py, which runs when there are new Sentinel-2
    # days to classify, and calling it daily made it a second writer that only
    # ever rewrote the same tables from whatever this file happened to contain.
    update_data()
