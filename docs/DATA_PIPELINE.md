## Data Pipeline

The pipeline (see `data-pipeline/`) runs on Railway/GitHub Actions to keep the datasets fresh.

1. **Collection** – `update_pipeline.py` downloads raw NOAA sea-ice, NASA GISTEMP anomalies, and OWID CO₂ series.
2. **Normalisation** – helper functions clean headers, align the calendar to a 365-day baseline, and convert all output to long-form tables.
3. **Derived Metrics** – decadal anomalies, interquartile ranges, and rolling means are computed via Pandas so the frontend only has to render final numbers.
4. **Export** – processed tables are written both to CSV files (for archival) and to the backend database JSON loader.

Whenever the backend is unavailable, the frontend still works—the `GET /data` route falls back to `data/data.json`, which is kept in sync with the pipeline exports.
