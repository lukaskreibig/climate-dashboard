FROM python:3.12-slim

WORKDIR /app

# System dependencies if needed:
RUN apt-get update && apt-get install -y gcc build-essential

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY update_pipeline.py .

CMD ["python3", "update_pipeline.py"]
