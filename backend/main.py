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

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI(
    title="Climate Report API",
    version="0.1",
    description="API zum Bereitstellen der Klima-Daten und ML-Vorhersagen."
)

origins = [
    "https://climate-dashboard-three.vercel.app",  
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
embedder = SentenceTransformer("sentence-transformers/all-mpnet-base-v2")
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
