FROM python:3.12-slim

WORKDIR /app

# Install system dependencies if needed
RUN apt-get update && apt-get install -y gcc build-essential

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy your pipeline script into the container
COPY update_pipeline.py .

# Use the absolute path to Python
CMD ["python3", "update_pipeline.py"]