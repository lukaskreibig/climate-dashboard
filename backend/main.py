from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from openai import OpenAI
import os
import json
import chromadb
from sentence_transformers import SentenceTransformer
from pydantic import BaseModel
from typing import Any, List
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from schemas import FjordDataBundle
import pandas as pd
import numpy as np
from typing import Optional


load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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
    decadalAnomaly: Optional[List[Any]] = None

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
    YR_MIN = int(os.getenv('SEAICE_YR_MIN', '1980'))
    YR_MAX = int(os.getenv('SEAICE_YR_MAX', '2100'))
    BASE0  = int(os.getenv('SEAICE_ANOM_BASELINE_START', '1981'))
    BASE1  = int(os.getenv('SEAICE_ANOM_BASELINE_END',   '2010'))
    W_YEAR = max(1, int(os.getenv('SEAICE_SMOOTH_WINDOW', '7')))       # jährl. Vor-Glättung
    W_DEC  = max(1, int(os.getenv('SEAICE_DECADAL_SMOOTH', '15')))     # n a c h Dekadenmittel

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
async def get_data():
    db_url = os.getenv("DATABASE_URL")
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

            return data
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error reading data from database: {e}")

    # --- Fallback zu JSON-Datei wie gehabt -------------------
    file_path = os.path.join(os.getcwd(), "data", "data.json")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Data file not found")
    try:
        with open(file_path, "r") as f:
            data = json.load(f)
        # NEW: auch im File-Fallback berechnen
        data["decadalAnomaly"] = compute_decadal_daily_anomaly(data.get("dailySeaIce", []))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading data file: {e}")
    return data

@app.get("/uummannaq", response_model=FjordDataBundle)
async def get_fjord_data():
    from datetime import date, timedelta

    def label_for_doy(doy: int) -> str:
        # stabile englische Monatskürzel, unabhängig vom Locale
        MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
        d = date(2020, 1, 1) + timedelta(days=doy - 1)
        return f"{d.day:02d}-{MONTHS[d.month-1]}"

    db_url = os.getenv("DATABASE_URL")
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
                        "day":  label_for_doy(doy),
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

                return {
                    "spring": [dict(r) for r in spring_rows],
                    "season": merged,                   # <— merged Struktur
                    "frac":   [dict(r) for r in frac_rows],
                    "freeze": [dict(r) for r in freeze_rows],
                    "daily":  [dict(r) for r in daily_rows],
                    "seasonLossPct": season_loss_pct,   # optional
                }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error reading fjord data: {e}")

    # fallback: JSON (optional – hier könntest du ebenfalls 'season' schon gemerged vorhalten)
    file_path = os.path.join(os.getcwd(), 'data', 'fjord_data.json')
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Fjord data file not found")
    with open(file_path, 'r') as f:
        return json.load(f)



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

@app.get("/health")
async def health():
    return {"status": "ok"}

# Original chat
class ChatRequest(BaseModel):
    query: str

class ChatResponse(BaseModel):
    answer: str

# Chroma setup
from threading import Lock

_embedder = None
_embedder_lock = Lock()


def get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        with _embedder_lock:
            if _embedder is None:
                _embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    return _embedder


chroma_client = chromadb.PersistentClient(path="./data/chroma_db")
try:
    collection = chroma_client.get_collection("eskimo-folktales")
except:
    collection = chroma_client.create_collection("eskimo-folktales")

@app.post("/chat_stream")
async def chat_stream(req: ChatRequest):
    user_query = req.query.strip()
    if not user_query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    embedder = get_embedder()
    query_embedding = embedder.encode([user_query])[0]
    results = collection.query(query_embeddings=[query_embedding], n_results=3)
    retrieved_chunks = results.get("documents", [[]])[0]
    context = "\n\n".join(retrieved_chunks)

    print("DEBUG - Retrieved Context:\n", context)
    if not context:
        raise HTTPException(status_code=404, detail="No relevant context found")

    prompt = f"""
            You are Knud Rasmussen, the renowned Danish-Greenlandic explorer who traveled extensively across Greenland, carefully gathering stories from the Inuit people. You share these traditional Eskimo folktales as vividly and respectfully as when you first heard them.

            Here is context from your collected Eskimo Folk-Tales:
            {context}

            A listener has approached you with the following question or request:
            "{user_query}"

            Answer by narrating an appropriate Inuit folktale or sharing relevant insights from your journeys, always maintaining your authentic voice as Knud Rasmussen. Speak thoughtfully and warmly, reflecting your genuine respect and fascination for Inuit culture don't invent anything, but only draw from the context provided.

            If the provided context does not contain relevant information or if you're unsure, respond gently and thoughtfully with something like: "Ah, my friend, my memory does not recall such a tale clearly."
            Also tell the the listener that you are not a real person, but a computer program that simulates the voice of Knud Rasmussen if they ask.
            """
    
    try:
        stream = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "user", "content": prompt}
            ],
            stream=True, 
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calling OpenAI API: {e}")

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
