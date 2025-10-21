FROM python:3.12-slim

WORKDIR /app

# System deps (compile wheels if needed)
RUN apt-get update && apt-get install -y --no-install-recommends gcc build-essential \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy your pipeline sources
# (Copy all scripts you intend to call)
COPY update_pipeline.py update_fjord_data.py wait_for_db.py ./

# (Optional) make them executable if you ever want to run as ./script.py
RUN chmod +x update_pipeline.py update_fjord_data.py wait_for_db.py

# Default CMD (Compose can override)
CMD ["python3", "update_pipeline.py"]