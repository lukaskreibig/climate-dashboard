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
from schemas import FjordDataBundle
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
FJORD_EARLY_YEARS = [2017, 2018, 2019, 2020]
FJORD_LATE_YEARS = [2021, 2022, 2023, 2024, 2025]
FJORD_KM2 = 3450

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
    data["meta"] = {
        "latestSeaIceDate": _row_date(latest_daily) if latest_daily else None,
        "latestSeaIceYear": latest_sea_ice_year,
        "latestAnnualYear": max(latest_annual_years) if latest_annual_years else None,
        "latestTemperatureYear": max(latest_temperature_years) if latest_temperature_years else None,
        "source": "NSIDC Sea Ice Index, NASA GISTEMP, Our World in Data CO2",
        "baselineYears": f"{settings.seaice_anom_baseline_start}-{settings.seaice_anom_baseline_end}",
        "generatedAt": generated_at or _utc_now_iso(),
    }
    return data


def _attach_fjord_meta(payload: dict[str, Any]) -> dict[str, Any]:
    daily = payload.get("daily", [])
    latest_daily = _latest_daily_row(daily if isinstance(daily, list) else [])
    years = [
        _row_year(row)
        for row in daily
        if isinstance(row, dict) and _row_year(row) is not None
    ]
    payload["meta"] = {
        "latestDate": _row_date(latest_daily) if latest_daily else None,
        "latestYear": _row_year(latest_daily) if latest_daily else (max(years) if years else None),
        "source": "Sentinel-2 Uummannaq computer-vision pipeline",
        "baselineYears": "2017-2020 vs 2021-2025",
        "generatedAt": _utc_now_iso(),
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

    rows = rows[["date", "year", "doy", "frac_smooth"]].rename(columns={"frac_smooth": "frac"}).copy()
    rows["date"] = pd.to_datetime(rows["date"], errors="coerce")
    rows["year"] = pd.to_numeric(rows["year"], errors="coerce")
    rows["doy"] = pd.to_numeric(rows["doy"], errors="coerce")
    rows["frac"] = pd.to_numeric(rows["frac"], errors="coerce")
    rows = rows.dropna(subset=["date", "year", "doy"]).sort_values(["date"]).copy()
    rows["year"] = rows["year"].astype(int)
    rows["doy"] = rows["doy"].astype(int)

    season = []
    for doy in range(FJORD_SUN_START, FJORD_SUN_END + 1):
        early = rows[(rows["year"].isin(FJORD_EARLY_YEARS)) & (rows["doy"] == doy)]["frac"]
        late = rows[(rows["year"].isin(FJORD_LATE_YEARS)) & (rows["doy"] == doy)]["frac"]
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
    baseline_years = [year for year in FJORD_EARLY_YEARS if year in spring_means.index]
    baseline = spring_means.loc[baseline_years].mean() if baseline_years else np.nan
    spring = []
    for year, value in spring_means.sort_index().items():
        anomaly = None
        if not pd.isna(value) and not pd.isna(baseline):
            anomaly = round((float(value) - float(baseline)) * FJORD_KM2, 1)
        spring.append({"year": int(year), "anomaly": anomaly})

    frac_means = (
        rows[(rows["doy"] >= FJORD_SUN_START) & (rows["doy"] <= FJORD_SUN_END)]
        .groupby("year")["frac"]
        .mean()
    )
    frac = [
        {"year": int(year), "mean": round(float(value), 4) if not pd.isna(value) else None}
        for year, value in frac_means.sort_index().items()
    ]

    freeze = []
    for year, grp in rows.groupby("year"):
        frozen = grp.loc[grp["frac"] >= FJORD_THRESHOLD, "doy"].dropna()
        freeze.append({
            "year": int(year),
            "freeze": int(frozen.min()) if len(frozen) else None,
            "breakup": int(frozen.max()) if len(frozen) else None,
        })

    daily = []
    for row in rows.itertuples(index=False):
        daily.append({
            "date": pd.Timestamp(row.date).date().isoformat(),
            "year": int(row.year),
            "doy": int(row.doy),
            "frac": _json_float(row.frac),
        })

    diffs = []
    for row in season:
        early_mean = row["eMean"]
        late_mean = row["lMean"]
        if early_mean is not None and late_mean is not None and early_mean != 0:
            diffs.append(1 - (late_mean / early_mean))
    season_loss_pct = round(sum(diffs) / len(diffs) * 100, 1) if diffs else None

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
            return _attach_data_meta(data)
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
        data = _attach_data_meta(data)
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

                # mean %-loss Feb–Jun (nur, wenn beide Mittel vorhanden)
                diffs = []
                for row in merged:
                    e, l = row["eMean"], row["lMean"]
                    if e is not None and l is not None and e != 0:
                        diffs.append(1 - (l / e))
                season_loss_pct = round(sum(diffs) / len(diffs) * 100, 1) if diffs else None

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
