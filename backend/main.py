from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, List
import json
import os

app = FastAPI(
    title="Climate Report API",
    version="1.0",
    description="API zum Bereitstellen der Klima-Daten und zukünftiger ML-Vorhersagen."
)

# CORS-Konfiguration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change this for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic
class DataResponse(BaseModel):
    annual: List[Any]
    dailySeaIce: List[Any]
    annualAnomaly: List[Any]
    corrMatrix: List[Any]
    iqrStats: List[Any]
    partial2025: List[Any]

@app.get("/data", response_model=DataResponse)
async def get_data():
    file_path = os.path.join(os.getcwd(), "data", "data.json")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Data file not found")
    try:
        with open(file_path, "r") as f:
            data = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading data file: {e}")
    return data

# Placeholder Endpoint for ML
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
