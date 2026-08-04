from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from openai import OpenAI
from pathlib import Path
import json
from pydantic import BaseModel
from typing import Any, List
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from schemas import FjordDataBundle, Freshness
import pandas as pd
import numpy as np
from typing import Optional
from functools import lru_cache
import logging
from urllib.parse import urlparse
from typing import TYPE_CHECKING
from datetime import datetime, timezone, date, timedelta

if TYPE_CHECKING:
    from sentence_transformers import SentenceTransformer


# load backend/.env regardless of the process working directory (so the key is
# found whether you launch from repo root or from backend/). On Railway there is
# no .env — real env vars are used and take priority.
load_dotenv(Path(__file__).resolve().parent / ".env")
from settings import get_settings  # noqa: E402  (after load_dotenv)

settings = get_settings()

# Chat LLM: prefer OpenRouter (OpenAI-compatible API), fall back to direct
# OpenAI. Claude Haiku 4.5 gives fast first tokens with strong storytelling
# and native-quality German — right fit for a persona chatbot.
if settings.openrouter_api_key:
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=settings.openrouter_api_key,
        default_headers={
            "HTTP-Referer": "https://github.com/lukaskreibig",
            "X-Title": "Schmelzpunkt - Knud Rasmussen",
        },
    )
    CHAT_MODEL = "anthropic/claude-haiku-4.5"
elif settings.openai_api_key:
    client = OpenAI(api_key=settings.openai_api_key)
    CHAT_MODEL = "gpt-4o-mini"
else:
    client = None
    CHAT_MODEL = ""
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_FILE = DATA_DIR / "data.json"
FJORD_DATA_FILE = DATA_DIR / "fjord_data.json"
FJORD_CSV_CANDIDATES = [
    DATA_DIR / "summary_test_cleaned.csv",
    BASE_DIR.parent / "data-pipeline" / "data" / "summary_test_cleaned.csv",
    BASE_DIR.parent / "frontend" / "public" / "data" / "summary_test_cleaned.csv",
]
CHROMA_PATH = DATA_DIR / "chroma_db"
LOGGER = logging.getLogger("backend.api")

FJORD_SUN_START = 45
FJORD_SUN_END = 180
FJORD_SPRING_A = 60
FJORD_SPRING_B = 151
FJORD_THRESHOLD = 0.15
# The early/late split that defines the headline loss figure. The boundary is a
# single year, not two enumerated lists: the late group used to stop at 2025, so
# a 2026 season would have been highlighted as "late" by the frontend (which
# groups on year >= FJORD_LATE_START_YEAR) while the backend silently left it out
# of the percentage. Deriving both groups from one boundary keeps them in step.
FJORD_LATE_START_YEAR = 2021
FJORD_FIRST_YEAR = 2017


def _fjord_year_groups(years) -> tuple[list[int], list[int]]:
    """Split observed years into the early and late groups, open ended."""
    observed = sorted({int(y) for y in years})
    early = [y for y in observed if FJORD_FIRST_YEAR <= y < FJORD_LATE_START_YEAR]
    late = [y for y in observed if y >= FJORD_LATE_START_YEAR]
    return early, late


# Kept as module-level names because they are read in several places; they cover
# the seasons published so far and are recomputed from the data where it matters.
FJORD_EARLY_YEARS = list(range(FJORD_FIRST_YEAR, FJORD_LATE_START_YEAR))
FJORD_LATE_YEARS = [2021, 2022, 2023, 2024, 2025]
# The fjord WATER surface the ice fraction is a fraction OF, and the one number
# every area statement in the story has to come from.
#
# Three different figures were in circulation, which is one too many for a
# quantity that multiplies the published anomaly: 257 here, 253 implied by the
# classifier's land mask, and 243 implied by the land share recorded in the
# published archive. The archive's 0.0900 is not geometry at all, it is the
# artefact of the painted mask that covered the same FRACTION of every scene
# whatever its grid.
#
# This is the measured one. src/uummannaq_ice/assets/landmask.tif, EPSG:32622 at
# 10 m, 1474 by 1812 cells: a grid of 267.09 km2 of which 0.05143 is land, so
# 253.35 km2 of water. Corrected onto the WGS84 ellipsoid the grid is 267.29 km2,
# a UTM distortion of -0.08 percent, giving 253.5 km2 of water.
#
# It was 3450 once, 13.4x too large, and because the spring anomaly is multiplied
# by it the served anomalies exceeded the entire area they were measured on.
FJORD_KM2 = 253.5

app = FastAPI(
    title="Climate Report API",
    version="0.1",
    description="API zum Bereitstellen der Klima-Daten und ML-Vorhersagen."
)

origins = [
    "https://climate-dashboard-three.vercel.app", 
    "https://nextjs-frontend-production-9055.up.railway.app",
    "http://localhost:3000",                      
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DataResponse(BaseModel):
    annual: List[Any]
    dailySeaIce: List[Any]
    annualAnomaly: List[Any]
    corrMatrix: List[Any]
    iqrStats: List[Any]
    partial2025: List[Any]
    latestSeaIceSeason: Optional[List[Any]] = None
    decadalAnomaly: Optional[List[Any]] = None
    meta: Optional[dict[str, Any]] = None


def _resolved_database_url() -> Optional[str]:
    return settings.database_url or getattr(settings, "database_public_url", None)


def _database_host(db_url: Optional[str]) -> Optional[str]:
    if not db_url:
        return None
    try:
        return urlparse(db_url).hostname
    except Exception:
        return None


def _set_source_headers(
    response: Response,
    *,
    route_name: str,
    source: str,
    db_status: str,
    db_host: Optional[str] = None,
) -> None:
    response.headers["X-Climate-Route"] = route_name
    response.headers["X-Climate-Data-Source"] = source
    response.headers["X-Climate-Db-Status"] = db_status
    if db_host:
        response.headers["X-Climate-Db-Host"] = db_host


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _as_int(value: Any) -> Optional[int]:
    try:
        if value is None:
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def _row_year(row: dict[str, Any]) -> Optional[int]:
    return _as_int(row.get("Year", row.get("year")))


def _row_doy(row: dict[str, Any]) -> Optional[int]:
    return _as_int(row.get("DayOfYear", row.get("doy", row.get("day"))))


def _row_date(row: dict[str, Any]) -> Optional[str]:
    value = row.get("DateStr", row.get("date"))
    return str(value) if value is not None else None


def _latest_daily_row(rows: List[Any]) -> Optional[dict[str, Any]]:
    dict_rows = [dict(row) for row in rows if isinstance(row, dict)]
    dated = [row for row in dict_rows if _row_date(row)]
    if dated:
        return max(dated, key=lambda row: str(_row_date(row)))

    with_year = [row for row in dict_rows if _row_year(row) is not None]
    if not with_year:
        return None
    return max(with_year, key=lambda row: (_row_year(row) or 0, _row_doy(row) or 0))


def _latest_sea_ice_season(
    data: dict[str, Any],
    latest_year: Optional[int],
) -> List[dict[str, Any]]:
    if latest_year is None:
        return []

    season = []
    for row in data.get("dailySeaIce", []):
        if not isinstance(row, dict) or _row_year(row) != latest_year:
            continue
        doy = _row_doy(row)
        if doy is None:
            continue
        season.append({
            "DayOfYear": doy,
            "Extent": row.get("Extent", row.get("extent")),
        })

    return sorted(season, key=lambda row: row["DayOfYear"])


# ── Freshness ────────────────────────────────────────────────────────────────
# The story used to publish whatever the database happened to hold, with no way
# for a reader (or for us) to tell a value measured yesterday from one measured
# last year. Every payload now carries, per upstream dataset, the newest
# observation, its age in days, and a status derived from explicit thresholds.
# The thresholds travel with the payload so the rule is auditable, not implied.
#
# Thresholds reflect each source's real publication cadence:
#   seaIce      NSIDC posts daily with about a one-day lag.
#   temperature GISTEMP closes a year in mid-January of the following year.
#   co2         OWID refreshes its annual series in the autumn of the next year.
#   fjord       Sentinel-2 season runs mid-February to late June, so a gap over
#               the dark winter is expected; a gap past one year means a whole
#               melt season was never observed.
_FRESHNESS_UNKNOWN = "unknown"


def _parse_iso_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def _freshness_status(
    age_days: Optional[int],
    lagging_after: int,
    stale_after: int,
) -> str:
    if age_days is None:
        return _FRESHNESS_UNKNOWN
    if age_days > stale_after:
        return "stale"
    if age_days > lagging_after:
        return "lagging"
    return "current"


def _source_freshness(
    *,
    key: str,
    label: str,
    cadence: str,
    latest_date: Optional[str],
    latest_year: Optional[int],
    reference_date: Optional[date],
    lagging_after: int,
    stale_after: int,
    today: date,
) -> dict[str, Any]:
    age_days = (today - reference_date).days if reference_date else None
    return {
        "key": key,
        "label": label,
        "cadence": cadence,
        "latestDate": latest_date,
        "latestYear": latest_year,
        "referenceDate": reference_date.isoformat() if reference_date else None,
        "ageDays": age_days,
        "status": _freshness_status(age_days, lagging_after, stale_after),
        "laggingAfterDays": lagging_after,
        "staleAfterDays": stale_after,
    }


_STATUS_RANK = {"current": 0, "lagging": 1, "stale": 2, _FRESHNESS_UNKNOWN: 3}


def _freshness_block(sources: List[dict[str, Any]], *, checked_at: str) -> dict[str, Any]:
    known = [s for s in sources if s.get("status")]
    overall = _FRESHNESS_UNKNOWN
    if known:
        overall = max(known, key=lambda s: _STATUS_RANK.get(s["status"], 3))["status"]
    return {
        "checkedAt": checked_at,
        "status": overall,
        "sources": sources,
    }


def _latest_year_with_value(rows: List[Any], column: str) -> Optional[int]:
    years = [
        _as_int(row.get("Year", row.get("year")))
        for row in rows
        if isinstance(row, dict) and row.get(column) is not None
    ]
    years = [y for y in years if y is not None]
    return max(years) if years else None


def _year_end(year: Optional[int]) -> Optional[date]:
    return date(year, 12, 31) if year else None


def _attach_data_meta(
    data: dict[str, Any],
    *,
    generated_at: Optional[str] = None,
) -> dict[str, Any]:
    latest_daily = _latest_daily_row(data.get("dailySeaIce", []))
    latest_sea_ice_year = _row_year(latest_daily) if latest_daily else None
    latest_annual_years = [
        _as_int(row.get("Year", row.get("year")))
        for row in data.get("annualAnomaly", [])
        if isinstance(row, dict) and _as_int(row.get("Year", row.get("year"))) is not None
    ]
    latest_temperature_years = [
        _as_int(row.get("Year", row.get("year")))
        for row in data.get("annual", [])
        if isinstance(row, dict) and _as_int(row.get("Year", row.get("year"))) is not None
    ]

    latest_season = _latest_sea_ice_season(data, latest_sea_ice_year)
    data["latestSeaIceSeason"] = latest_season
    data["partial2025"] = latest_season

    latest_sea_ice_date = _row_date(latest_daily) if latest_daily else None
    latest_temperature_year = (
        _latest_year_with_value(data.get("annual", []), "Glob")
        or (max(latest_temperature_years) if latest_temperature_years else None)
    )
    latest_co2_year = _latest_year_with_value(data.get("annual", []), "GlobalCO2Mean")

    today = datetime.now(timezone.utc).date()
    freshness_sources = [
        _source_freshness(
            key="seaIce",
            label="NSIDC Sea Ice Index, daily Arctic extent",
            cadence="daily",
            latest_date=latest_sea_ice_date,
            latest_year=latest_sea_ice_year,
            reference_date=_parse_iso_date(latest_sea_ice_date),
            lagging_after=7,
            stale_after=30,
            today=today,
        ),
        _source_freshness(
            key="temperature",
            label="NASA GISTEMP, annual temperature anomaly",
            cadence="annual",
            latest_date=None,
            latest_year=latest_temperature_year,
            reference_date=_year_end(latest_temperature_year),
            lagging_after=400,
            stale_after=730,
            today=today,
        ),
        _source_freshness(
            key="co2",
            label="Our World in Data, annual CO2 emissions",
            cadence="annual",
            latest_date=None,
            latest_year=latest_co2_year,
            reference_date=_year_end(latest_co2_year),
            lagging_after=500,
            stale_after=865,
            today=today,
        ),
    ]

    data["meta"] = {
        "latestSeaIceDate": latest_sea_ice_date,
        "latestSeaIceYear": latest_sea_ice_year,
        "latestAnnualYear": max(latest_annual_years) if latest_annual_years else None,
        "latestTemperatureYear": latest_temperature_year,
        "latestCo2Year": latest_co2_year,
        "source": "NSIDC Sea Ice Index, NASA GISTEMP, Our World in Data CO2",
        "baselineYears": f"{settings.seaice_anom_baseline_start}-{settings.seaice_anom_baseline_end}",
        "generatedAt": generated_at or _utc_now_iso(),
        "freshness": Freshness(
            **_freshness_block(freshness_sources, checked_at=_utc_now_iso())
        ).model_dump(),
    }
    return data


# Das annual-Frame trägt den kompletten OWID-Länderdatensatz (268 Spalten), von dem
# die Story neun liest. dailySeaIce führt Month/Day/DateStr, die sich alle aus
# Year + DayOfYear ergeben. Beides erst nach _attach_data_meta anwenden, das liest
# DateStr noch.
_ANNUAL_KEEP = {
    "Year", "Glob", "64N-90N", "GlobalCO2Mean", "SeaIceMean",
    "Arctic_z", "GlobCO2Mean_z", "SeaIce_z", "SeaIce_z_inv",
}
_DAILY_DROP = {"Month", "Day", "DateStr"}


def _slim_data_payload(data: dict[str, Any]) -> dict[str, Any]:
    annual = data.get("annual")
    if isinstance(annual, list):
        data["annual"] = [
            {k: v for k, v in row.items() if k in _ANNUAL_KEEP} if isinstance(row, dict) else row
            for row in annual
        ]
    daily = data.get("dailySeaIce")
    if isinstance(daily, list):
        data["dailySeaIce"] = [
            {k: v for k, v in row.items() if k not in _DAILY_DROP} if isinstance(row, dict) else row
            for row in daily
        ]
    return data


# How many resamples back the per-season sampling error. 2000 is well past the
# point where the estimate stops moving and still costs milliseconds.
SEASON_BOOTSTRAP_DRAWS = 2000


def _season_sampling_error(season_rows: "pd.DataFrame", year: int) -> dict[str, Any]:
    """How much a season mean would move if different days had been observed.

    A season mean is an average over the days a satellite happened to see, and
    the seasons are not equally observed: 2017 has 26 measured days inside the
    analysed window against 58 to 76 for the others. Presenting all of them as
    equally firm point values overstates what the record can carry.

    The error is measured rather than assumed. Resampling the measured days of a
    season with replacement gives the spread of means the same season would have
    produced under a different overpass schedule. That needs no assumption about
    the distribution, and unlike sd/sqrt(n) it does not silently rely on the days
    being independent, which consecutive days of ice cover are not.

    Measured on the published archive this comes out around 0.055 for a
    26-day season, so roughly 0.11 at 95 percent, which is about half the
    difference between the early and late period means. Seasonal means are not
    point values, and the charts should not draw them as such.

    Only days with an actual observation count. Gap-filled days carry no
    independent information and would shrink the interval by pretending to.
    """
    measured_column = "frac_raw" if "frac_raw" in season_rows.columns else "frac"
    values = pd.to_numeric(
        season_rows.loc[season_rows["year"] == year, measured_column], errors="coerce"
    ).dropna()
    observed = int(len(values))
    if observed < 3:
        return {"observedDays": observed, "standardError": None, "ci95": None}

    sample = values.to_numpy()
    generator = np.random.default_rng(seed=year)
    draws = generator.choice(sample, size=(SEASON_BOOTSTRAP_DRAWS, observed))
    means = draws.mean(axis=1)
    return {
        "observedDays": observed,
        "standardError": round(float(means.std(ddof=1)), 4),
        "ci95": [
            round(float(np.percentile(means, 2.5)), 4),
            round(float(np.percentile(means, 97.5)), 4),
        ],
    }


# A single day must not be able to declare the fjord frozen or open. The dates
# used to be min and max of the days at or above the threshold, so one
# misclassified day decided a season: a cloudy July day read as ice pushed
# breakup weeks late, and a cloudy February day did the same to freeze-up. In
# the published archive that risk is real, the days reporting almost no ice in
# February have a median cloud cover of 0.72 while the rest have 0.00.
#
# Requiring the state to persist costs nothing when the season is clean and
# discards exactly the single-day artefacts.
FJORD_PERSISTENCE_DAYS = 7


def _first_run_start(flags: list[bool], need: int) -> Optional[int]:
    """Index where the first run of `need` consecutive True values begins."""
    run = 0
    for i, flag in enumerate(flags):
        run = run + 1 if flag else 0
        if run >= need:
            return i - need + 1
    return None


def _freeze_and_breakup(
    group: "pd.DataFrame",
    threshold: float = FJORD_THRESHOLD,
    need: int = FJORD_PERSISTENCE_DAYS,
) -> tuple[Optional[int], Optional[int]]:
    """First sustained frozen day and the first sustained open day after it."""
    ordered = group.sort_values("doy")
    doys = [int(d) for d in ordered["doy"].tolist()]
    values = ordered["frac"].tolist()

    frozen = [bool(v is not None and not pd.isna(v) and v >= threshold) for v in values]
    start = _first_run_start(frozen, need)
    if start is None:
        return None, None

    open_after = [
        bool(v is not None and not pd.isna(v) and v < threshold) for v in values[start:]
    ]
    end = _first_run_start(open_after, need)
    return doys[start], (doys[start + end] if end is not None else None)


def _attach_fjord_meta(payload: dict[str, Any]) -> dict[str, Any]:
    daily = payload.get("daily", [])
    latest_daily = _latest_daily_row(daily if isinstance(daily, list) else [])
    years = [
        _row_year(row)
        for row in daily
        if isinstance(row, dict) and _row_year(row) is not None
    ]
    latest_date = _row_date(latest_daily) if latest_daily else None
    latest_year = _row_year(latest_daily) if latest_daily else (max(years) if years else None)

    today = datetime.now(timezone.utc).date()
    fjord_source = _source_freshness(
        key="fjord",
        label="Sentinel-2 ice fraction, Uummannaq Bay",
        cadence="seasonal",
        latest_date=latest_date,
        latest_year=latest_year,
        reference_date=_parse_iso_date(latest_date),
        # The observing season ends in late June, so a silent winter is normal.
        # 240 days after the last scene the next season is already under way;
        # past 365 days a complete melt season went unobserved.
        lagging_after=240,
        stale_after=365,
        today=today,
    )

    payload["meta"] = {
        "latestDate": latest_date,
        "latestYear": latest_year,
        "source": "Sentinel-2 Uummannaq computer-vision pipeline",
        "baselineYears": "2017-2020 vs 2021-2025",
        "generatedAt": _utc_now_iso(),
        "freshness": _freshness_block([fjord_source], checked_at=_utc_now_iso()),
    }
    return payload


def _label_for_doy(doy: int) -> str:
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    day = date(2020, 1, 1) + timedelta(days=doy - 1)
    return f"{day.day:02d}-{months[day.month - 1]}"


def _json_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _mean_or_none(series: pd.Series) -> Optional[float]:
    series = pd.to_numeric(series, errors="coerce").dropna()
    return float(series.mean()) if len(series) else None


def _quantile_or_none(series: pd.Series, q: float) -> Optional[float]:
    series = pd.to_numeric(series, errors="coerce").dropna()
    return float(series.quantile(q)) if len(series) else None


def _find_fjord_csv() -> Optional[Path]:
    for path in FJORD_CSV_CANDIDATES:
        if path.exists():
            return path
    return None


def _build_fjord_payload_from_csv() -> Optional[dict[str, Any]]:
    csv_path = _find_fjord_csv()
    if csv_path is None:
        return None

    rows = pd.read_csv(csv_path, parse_dates=["date"])
    rows.columns = [c.lower() for c in rows.columns]
    required = {"date", "year", "doy", "frac_smooth"}
    missing = required.difference(rows.columns)
    if missing:
        raise ValueError(f"Missing fjord CSV columns: {', '.join(sorted(missing))}")

    # `frac` stays the smoothed series the charts plot, but the untouched
    # per-scene column travels with it as `fracRaw`, so the UI can tell an
    # actually observed day from an interpolated one instead of labelling
    # every filled day "Pipeline daily value".
    keep = ["date", "year", "doy", "frac_smooth"]
    has_raw = "frac" in rows.columns
    if has_raw:
        keep.append("frac")
    rows = rows[keep].copy()
    if has_raw:
        rows = rows.rename(columns={"frac": "frac_raw", "frac_smooth": "frac"})
    else:
        rows = rows.rename(columns={"frac_smooth": "frac"})
        rows["frac_raw"] = pd.NA
    rows["date"] = pd.to_datetime(rows["date"], errors="coerce")
    rows["year"] = pd.to_numeric(rows["year"], errors="coerce")
    rows["doy"] = pd.to_numeric(rows["doy"], errors="coerce")
    rows["frac"] = pd.to_numeric(rows["frac"], errors="coerce")
    rows["frac_raw"] = pd.to_numeric(rows["frac_raw"], errors="coerce")
    rows = rows.dropna(subset=["date", "year", "doy"]).sort_values(["date"]).copy()
    rows["year"] = rows["year"].astype(int)
    rows["doy"] = rows["doy"].astype(int)

    # Derived from the years actually present, so a new season joins the late
    # group automatically instead of being dropped by a frozen list.
    early_years, late_years = _fjord_year_groups(rows["year"])

    season = []
    for doy in range(FJORD_SUN_START, FJORD_SUN_END + 1):
        early = rows[(rows["year"].isin(early_years)) & (rows["doy"] == doy)]["frac"]
        late = rows[(rows["year"].isin(late_years)) & (rows["doy"] == doy)]["frac"]
        season.append({
            "day": _label_for_doy(doy),
            "eMean": _mean_or_none(early),
            "e25": _quantile_or_none(early, 0.25),
            "e75": _quantile_or_none(early, 0.75),
            "lMean": _mean_or_none(late),
            "l25": _quantile_or_none(late, 0.25),
            "l75": _quantile_or_none(late, 0.75),
        })

    spring_means = (
        rows[(rows["doy"] >= FJORD_SPRING_A) & (rows["doy"] <= FJORD_SPRING_B)]
        .groupby("year")["frac"]
        .mean()
    )
    baseline_years = [year for year in early_years if year in spring_means.index]
    baseline = spring_means.loc[baseline_years].mean() if baseline_years else np.nan
    spring = []
    for year, value in spring_means.sort_index().items():
        anomaly = None
        if not pd.isna(value) and not pd.isna(baseline):
            anomaly = round((float(value) - float(baseline)) * FJORD_KM2, 1)
        spring.append({"year": int(year), "anomaly": anomaly})

    season_rows = rows[
        (rows["doy"] >= FJORD_SUN_START) & (rows["doy"] <= FJORD_SUN_END)
    ]
    frac_means = season_rows.groupby("year")["frac"].mean()
    frac = [
        {
            "year": int(year),
            "mean": round(float(value), 4) if not pd.isna(value) else None,
            **_season_sampling_error(season_rows, int(year)),
        }
        for year, value in frac_means.sort_index().items()
    ]

    freeze = []
    for year, grp in rows.groupby("year"):
        freeze_doy, breakup_doy = _freeze_and_breakup(grp)
        freeze.append({
            "year": int(year),
            "freeze": freeze_doy,
            "breakup": breakup_doy,
        })

    daily = []
    for row in rows.itertuples(index=False):
        daily.append({
            "date": pd.Timestamp(row.date).date().isoformat(),
            "year": int(row.year),
            "doy": int(row.doy),
            "frac": _json_float(row.frac),
            # None where no usable scene existed and the value was filled
            "fracRaw": _json_float(getattr(row, "frac_raw", None)),
        })

    # Seasonal loss = ratio of the two period MEANS, not the mean of per-day
    # ratios. The old estimator divided by the early-period mean day by day; in
    # late June that mean falls to ~0.008, so single days produced terms as
    # extreme as -2.6 and dragged the headline figure down by roughly 3x.
    early_sum = 0.0
    late_sum = 0.0
    paired_days = 0
    for row in season:
        early_mean = row["eMean"]
        late_mean = row["lMean"]
        if early_mean is not None and late_mean is not None:
            early_sum += early_mean
            late_sum += late_mean
            paired_days += 1
    season_loss_pct = (
        round((1 - (late_sum / early_sum)) * 100, 1)
        if paired_days and early_sum > 0
        else None
    )
    season_loss_days = paired_days

    return _attach_fjord_meta({
        "spring": spring,
        "season": season,
        "frac": frac,
        "freeze": freeze,
        "daily": daily,
        "seasonLossPct": season_loss_pct,
    })


def _normalize_daily_columns(df: pd.DataFrame) -> pd.DataFrame:
    # toleriert unterschiedliche Groß/Kleinschreibung / Namen
    colmap = {c.lower(): c for c in df.columns}
    def grab(*cands):
        for c in cands:
            if c in df.columns: return c
            if c.lower() in colmap: return colmap[c.lower()]
        raise KeyError(cands[0])
    return df.rename(columns={
        grab('Year','year'): 'year',
        grab('DayOfYear','doy','dayofyear'): 'doy',
        grab('Extent','extent','value'): 'extent',
    })[['year','doy','extent']]

# ---------- helper: wissenschaftlich saubere Anomalien ----------
def compute_decadal_daily_anomaly(daily_rows: List[dict]) -> List[dict]:
    if not daily_rows:
        return []

    # -------- Konfiguration (ENV überschreibbar) -------------
    YR_MIN = settings.seaice_yr_min
    YR_MAX = settings.seaice_yr_max
    BASE0  = settings.seaice_anom_baseline_start
    BASE1  = settings.seaice_anom_baseline_end
    W_YEAR = max(1, settings.seaice_smooth_window)       # jährl. Vor-Glättung
    W_DEC  = max(1, settings.seaice_decadal_smooth)     # n a c h Dekadenmittel

    # -------- Hilfsfunktionen --------------------------------
    def _circular_smooth(y: np.ndarray, win: int) -> np.ndarray:
        """Zyklische Faltung (Wrap-Around) mit Hamming-Fenster."""
        if win <= 1 or not np.isfinite(y).any():
            return y
        if win % 2 == 0:  # Fenster muss ungerade sein
            win += 1
        k = np.hamming(win)
        k = k / k.sum()
        h = win // 2
        # fehlende Tage vorher per Interpolation füllen
        s = pd.Series(y, index=np.arange(1, 366), dtype="float64")
        s = s.interpolate(limit_direction="both")
        y = s.values
        ypad = np.r_[y[-h:], y, y[:h]]
        out = np.convolve(ypad, k, mode="same")[h:-h]
        return out

    # -------- Rohdaten normalisieren --------------------------
    df = pd.DataFrame(daily_rows)
    df = _normalize_daily_columns(df).copy()
    df = df.dropna(subset=['year','doy','extent'])
    df[['year','doy']] = df[['year','doy']].astype(int)
    df['extent'] = pd.to_numeric(df['extent'], errors='coerce')
    df = df[(df['year'] >= YR_MIN) & (df['year'] <= YR_MAX)].copy()

    # 29. Feb entfernen und auf 365-Tage-Kalender mappen
    dt = (pd.to_datetime(df['year'].astype(str), format='%Y')
          + pd.to_timedelta(df['doy'] - 1, unit='D'))
    mask_leap = (dt.dt.month == 2) & (dt.dt.day == 29)
    df = df.loc[~mask_leap].copy()
    dt = dt.loc[~mask_leap]
    df['day'] = pd.to_datetime(dt.dt.strftime('2001-%m-%d')).dt.dayofyear

    # jährliche Vor-Glättung (zentrierter MA)
    df = df.sort_values(['year','day'])
    df['extent_smooth'] = (
        df.groupby('year', sort=False)['extent']
          .transform(lambda s: s.rolling(window=W_YEAR, center=True,
                                         min_periods=max(2, W_YEAR//2)).mean())
          .bfill().ffill()
    )

    # Baseline 1981–2010 (oder ENV)
    clim = (df[(df['year']>=BASE0) & (df['year']<=BASE1)]
              .groupby('day', as_index=True)['extent_smooth']
              .mean())

    # Anomalie und Dekade
    df['an'] = df['extent_smooth'] - df['day'].map(clim)
    df['decade'] = ((df['year']//10)*10).astype(int).astype(str) + 's'

    # Tagesmittel je Dekade (+ SD, N)
    agg = (df.groupby(['decade','day'], as_index=False)['an']
             .agg(['mean','std','count'])
             .reset_index()
             .rename(columns={'mean':'an','std':'sd','count':'n'}))

    # Zyklische Glättung über den Saisonverlauf pro Dekade
    wide = (agg.pivot(index='day', columns='decade', values='an')
              .reindex(np.arange(1, 366)))
    smoothed_frames = []
    for dec in wide.columns:
        y = wide[dec].to_numpy(dtype='float64')
        y_s = _circular_smooth(y, W_DEC)
        smoothed_frames.append(
            pd.DataFrame({'decade': dec, 'day': np.arange(1, 366), 'an': np.round(y_s, 3)})
        )
    out = pd.concat(smoothed_frames, ignore_index=True)

    # sd und n wieder anheften (praktisch für Unsicherheitsbänder)
    meta = agg[['decade','day','sd','n']].copy()
    meta['sd'] = meta['sd'].round(3)
    out = out.merge(meta, on=['decade','day'], how='left').sort_values(['decade','day'])

    return out.to_dict(orient='records')


@app.get("/data", response_model=DataResponse)
async def get_data(response: Response):
    db_url = _resolved_database_url()
    db_host = _database_host(db_url)
    db_status = "not-configured"
    if db_url:
        try:
            engine = create_engine(db_url)
            table_map = {
                "annual":        "annual",
                "dailySeaIce":   "daily_sea_ice",
                "annualAnomaly": "annual_anomaly",
                "corrMatrix":    "corr_matrix",
                "iqrStats":      "iqr_stats",
                "partial2025":   "partial_2025",
            }
            data = {}
            with engine.connect() as conn:
                for key, table in table_map.items():
                    result = conn.execute(text(f"SELECT * FROM {table}"))
                    rows = [dict(row._mapping) for row in result]
                    data[key] = rows

            # NEW: decadalAnomaly on-the-fly aus dailySeaIce
            try:
                data["decadalAnomaly"] = compute_decadal_daily_anomaly(data["dailySeaIce"])
            except Exception as e:
                # Fallback: leer lassen, Frontend rechnet notfalls lokal weiter
                print("[WARN] decadalAnomaly computation failed:", e)
                data["decadalAnomaly"] = []

            _set_source_headers(
                response,
                route_name="/data",
                source="database",
                db_status="ok",
                db_host=db_host,
            )
            return _slim_data_payload(_attach_data_meta(data))
        except Exception as e:
            db_status = "error"
            LOGGER.warning(
                "Falling back to data.json after /data database read failed (host=%s): %s",
                db_host or "unknown",
                e,
            )

    # --- Fallback zu JSON-Datei wie gehabt -------------------
    file_path = DATA_FILE
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Data file not found")
    try:
        with open(file_path, "r") as f:
            data = json.load(f)
        # NEW: auch im File-Fallback berechnen
        data["decadalAnomaly"] = compute_decadal_daily_anomaly(data.get("dailySeaIce", []))
        data = _slim_data_payload(_attach_data_meta(data))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading data file: {e}")
    _set_source_headers(
        response,
        route_name="/data",
        source="json-fallback",
        db_status=db_status,
        db_host=db_host,
    )
    return data

@app.get("/uummannaq", response_model=FjordDataBundle)
async def get_fjord_data(response: Response):
    db_url = _resolved_database_url()
    db_host = _database_host(db_url)
    db_status = "not-configured"
    if db_url:
        engine = create_engine(db_url)
        try:
            with engine.connect() as conn:
                # Rohdaten holen
                season_rows = conn.execute(text("SELECT * FROM fjord_season_band ORDER BY doy")).mappings().all()
                spring_rows = conn.execute(text("SELECT year, anomaly FROM fjord_spring_anomaly ORDER BY year")).mappings().all()
                frac_rows   = conn.execute(text("SELECT year, mean FROM fjord_mean_fraction ORDER BY year")).mappings().all()
                freeze_rows = conn.execute(text("""
                    SELECT year, freeze_doy AS freeze, breakup_doy AS breakup
                    FROM fjord_freeze_breakup ORDER BY year
                """)).mappings().all()
                daily_rows  = conn.execute(text("""
                    SELECT date::text AS date, year, doy, frac
                    FROM fjord_daily ORDER BY date
                """)).mappings().all()

                # PIVOT: early/late je DOY zusammenführen
                by_doy: dict[int, dict[str, dict]] = {}
                for r in season_rows:
                    by_doy.setdefault(r["doy"], {})[r["period"]] = r

                merged = []
                for doy in sorted(by_doy.keys()):
                    early = by_doy[doy].get("early")
                    late  = by_doy[doy].get("late")
                    merged.append({
                        "day":  _label_for_doy(doy),
                        "eMean": early["mean"] if early else None,
                        "e25":  early["p25"]  if early else None,
                        "e75":  early["p75"]  if early else None,
                        "lMean": late["mean"]  if late  else None,
                        "l25":  late["p25"]   if late  else None,
                        "l75":  late["p75"]   if late  else None,
                    })

                # seasonal loss Feb–Jun: ratio of the two period MEANS
                # (see the CSV branch above for why per-day ratios are unusable)
                e_sum = l_sum = 0.0
                paired = 0
                for row in merged:
                    e, l = row["eMean"], row["lMean"]
                    if e is not None and l is not None:
                        e_sum += e
                        l_sum += l
                        paired += 1
                season_loss_pct = (
                    round((1 - (l_sum / e_sum)) * 100, 1) if paired and e_sum > 0 else None
                )

                payload = {
                    "spring": [dict(r) for r in spring_rows],
                    "season": merged,                   # <— merged Struktur
                    "frac":   [dict(r) for r in frac_rows],
                    "freeze": [dict(r) for r in freeze_rows],
                    "daily":  [dict(r) for r in daily_rows],
                    "seasonLossPct": season_loss_pct,   # optional
                }
                payload = _attach_fjord_meta(payload)
                _set_source_headers(
                    response,
                    route_name="/uummannaq",
                    source="database",
                    db_status="ok",
                    db_host=db_host,
                )
                return payload
        except Exception as e:
            db_status = "error"
            LOGGER.warning(
                "Falling back to fjord_data.json after /uummannaq database read failed (host=%s): %s",
                db_host or "unknown",
                e,
            )

    # fallback: JSON first, then local CSV so the app can run without a database.
    file_path = FJORD_DATA_FILE
    if not file_path.exists():
        try:
            payload = _build_fjord_payload_from_csv()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error reading fjord CSV fallback: {e}")
        if payload is None:
            raise HTTPException(status_code=404, detail="Fjord data file not found")
        _set_source_headers(
            response,
            route_name="/uummannaq",
            source="csv-fallback",
            db_status=db_status,
            db_host=db_host,
        )
        return payload

    with open(file_path, 'r') as f:
        payload = json.load(f)
    payload = _attach_fjord_meta(payload)
    _set_source_headers(
        response,
        route_name="/uummannaq",
        source="json-fallback",
        db_status=db_status,
        db_host=db_host,
    )
    return payload



# ML Prediction - unchanged
class PredictRequest(BaseModel):
    temperature: float
    co2: float

class PredictResponse(BaseModel):
    prediction: float
    model_version: str

@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    dummy_prediction = req.temperature * 0.5 + req.co2 * 0.1
    return PredictResponse(prediction=dummy_prediction, model_version="v1.0")

HEALTH_LOGGER = logging.getLogger("backend.health")


@lru_cache(maxsize=1)
def _engine():
    db_url = _resolved_database_url()
    if not db_url:
        return None
    return create_engine(db_url, pool_pre_ping=True, future=True)


@app.get("/health")
async def health():
    payload: dict[str, Any] = {"status": "ok"}
    db_report: dict[str, Any] = {"status": "skipped"}
    engine = _engine()

    if engine is not None:
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            db_report = {"status": "ok"}
        except Exception as exc:
            HEALTH_LOGGER.warning("Healthcheck database probe failed: %s", exc)
            db_report = {"status": "error", "error": str(exc)}
            payload["status"] = "degraded"

    payload["checks"] = {"database": db_report}
    # Always return HTTP 200 so Railway doesn't kill the container while the DB catches up.
    return JSONResponse(status_code=200, content=payload)

# Original chat
class ChatRequest(BaseModel):
    query: str

class ChatResponse(BaseModel):
    answer: str

# Chroma setup
from threading import Lock

_embedder = None
_embedder_lock = Lock()
_collection = None
_collection_lock = Lock()


def get_embedder() -> "SentenceTransformer":
    global _embedder
    if _embedder is None:
        with _embedder_lock:
            if _embedder is None:
                # Import lazily to avoid loading torch/sentence-transformers into RAM
                # until the chat endpoint is actually used.
                from sentence_transformers import SentenceTransformer

                _embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    return _embedder


def get_collection():
    global _collection
    if _collection is None:
        with _collection_lock:
            if _collection is None:
                # Lazily initialize Chroma so idle API instances stay smaller.
                import chromadb

                chroma_client = chromadb.PersistentClient(path=str(CHROMA_PATH))
                try:
                    _collection = chroma_client.get_collection("eskimo-folktales")
                except Exception:
                    _collection = chroma_client.create_collection("eskimo-folktales")
    return _collection

@app.post("/chat_stream")
async def chat_stream(req: ChatRequest):
    user_query = req.query.strip()
    if not user_query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    if client is None:
        raise HTTPException(
            status_code=503,
            detail="No chat LLM configured. Set OPENROUTER_API_KEY (or OPENAI_API_KEY).",
        )

    embedder = get_embedder()
    collection = get_collection()
    query_embedding = embedder.encode([user_query])[0]
    results = collection.query(query_embeddings=[query_embedding], n_results=3)
    retrieved_chunks = results.get("documents", [[]])[0]
    context = "\n\n".join(retrieved_chunks)

    print("DEBUG - Retrieved Context:\n", context)
    if not context:
        raise HTTPException(status_code=404, detail="No relevant context found")

    system_prompt = """You are Knud Rasmussen (1879-1933), the Danish-Greenlandic polar explorer who travelled Greenland by dog sled and collected the oral tradition of the Inuit, published as the "Eskimo Folk-Tales".

Setting: the listener has just scrolled through "Schmelzpunkt" / "The Big Melt", a data story about the vanishing winter sea ice around Uummannaq. These are the same fjords you once crossed on the frozen sea. You are the bridge between the elders' knowledge of the ice and what the listener has just seen in the satellite data.

How you speak:
- ALWAYS answer in the language of the question (German question, German answer; English question, English answer).
- Warm, vivid, concrete; never kitschy. 2-4 short paragraphs, at most ~180 words, unless the listener asks for a full tale.
- When it fits naturally, connect then and now: what reliable ice meant on your journeys, and how the listener has just seen it becoming shorter and less predictable. Do not invent modern statistics; the story itself has shown them.
- End with a small opening: a question back, or the offer of another tale.
- Typography: never use dashes as punctuation. No em dash, no en dash, no hyphen standing in for a pause. Use a comma, a colon, or a new sentence instead. Hyphens inside compound words are fine.

Honesty:
- Retell tales and details ONLY from the excerpts provided in the user message. If nothing there fits, say plainly that your memory does not recall such a tale, and offer what you do have.
- If asked whether you are real: say you are a computer program giving voice to Knud Rasmussen, drawing on his published collection."""

    user_prompt = f"""Excerpts from your collected Eskimo Folk-Tales:
{context}

The listener asks:
"{user_query}"
"""

    try:
        stream = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            stream=True,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calling chat API: {e}")

    def event_generator():
        try:
            for chunk in stream:
                print("STREAM CHUNK:", chunk)
                choice = chunk.choices[0]
                delta = choice.delta

                if delta.content:
                    text_chunk = delta.content
                    yield f"data: {json.dumps({'content': text_chunk})}\n\n"

            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"



    return StreamingResponse(event_generator(), media_type="text/event-stream")
