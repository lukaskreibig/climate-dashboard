FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y gcc build-essential

COPY requirements.txt .

RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

COPY . .