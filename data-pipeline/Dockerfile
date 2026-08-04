FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# The chained refresh below already runs every stage explicitly, so the in-script
# chaining in update_pipeline.py must stay off. Baking this into the image means the
# behaviour is identical whether Railway applies the startCommand from railway.toml
# or falls back to the image CMD.
ENV PIPELINE_SINGLE_STAGE=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY update_pipeline.py update_fjord_data.py wait_for_db.py ./
COPY data ./data

# One authoritative refresh command, kept byte for byte in sync with the
# startCommand in railway.toml. No ENTRYPOINT: a bare ENTRYPOINT ["python3"] turns
# any platform level start command into arguments of python3, which is how the
# service command drifted away from railway.toml in the first place.
#
# wait_for_db.py runs first on purpose. It exits non zero when DATABASE_URL is
# missing, which turns a silent no op (update_pipeline.py happily skips the Postgres
# write when no database is configured) into a loud failure.
CMD ["sh", "-c", "python3 -u wait_for_db.py && python3 -u update_pipeline.py && python3 -u update_fjord_data.py"]
