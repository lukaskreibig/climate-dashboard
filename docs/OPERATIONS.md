# Operations Runbook

This document describes how the Arctic Climate Story is deployed, which services it depends on, and how to keep it healthy in production.

---

## Environments at a glance

| Environment | Purpose | Hosting | Source branch |
|-------------|---------|---------|----------------|
| **Production** | Public story (`https://arctic.rip`) | Vercel (frontend) + Railway (backend, pipelines, Postgres) | `main` |
| **Preview** | Deploy previews for pull requests | Vercel preview deployments | PR branches |
| **Local** | Developer workstation | Node.js / Python / Docker | Any |

Secrets are managed in Vercel/Railway dashboards. Do **not** commit credentials.

---

## Frontend (Vercel)

- Framework: Next.js 15 (app router, React 19).
- Build command: `yarn install && yarn build`.
- Environment variables:

  | Variable | Description |
  |----------|-------------|
  | `NEXT_PUBLIC_MAPBOX_TOKEN` | Public token with static tiles + vector privileges. |
  | `NEXT_PUBLIC_MAPTILER_KEY` | MapTiler raster overlays. |
  | `BACKEND_INTERNAL_URL` | Railway backend URL (used during ISR revalidation). |
  | `NEXT_PUBLIC_BACKEND_URL` (optional) | Public API base when running without middleware. |

- Analytics & monitoring:
  - Sentry (optional) receives production errors.
  - Vercel Analytics is enabled for performance regression tracking.

### Revalidation

- Use Vercel webhooks (`/api/revalidate?tag=story`) to re-fetch data after pipeline runs or CMS updates.
- Currently revalidation is triggered manually; add a Railway webhook or GitHub Action for automation.

---

## Backend (Railway)

- Container built from `backend/Dockerfile`.
- Entrypoint: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
- Environment variables:

  | Variable | Description |
  |----------|-------------|
  | `DATABASE_URL` | PostgreSQL connection string. |
  | `OPENAI_API_KEY` | Optional – only needed when `/chat` endpoints are enabled. |
  | `LOG_LEVEL` | Python logging level (default `INFO`). |
  | `SEAICE_*` | Optional overrides for anomaly calculations (see README). |

- Observability:
  - Railway provides request logs (`railway logs`).
  - Add Sentry or OpenTelemetry exporters if deeper tracing is required.

### PostgreSQL schema

Tables managed by the pipelines:

```
annual
daily_sea_ice
annual_anomaly
corr_matrix
iqr_stats
partial_2025
fjord_daily
fjord_season_band
fjord_spring_anomaly
fjord_mean_fraction
fjord_freeze_breakup
```

Backups: enable Railway automatic snapshots (daily). For manual exports use `pg_dump`.

---

## Pipelines & scheduling

| Job | Command | Platform | Schedule | Notes |
|-----|---------|----------|----------|-------|
| Global ingest | `python update_pipeline.py` | Railway cron (Python environment) | Daily 03:00 UTC | Writes climate tables and `data/data.json`. |
| Fjord aggregates | `python update_fjord_data.py` | Railway cron | Daily 03:10 UTC | Depends on latest Sentinel‑2 CSV. |
| Sentinel‑2 segmentation | `python fast_cloudsen12.py` | Manual GPU runner / GitHub self-hosted runner | Ad-hoc (monthly) | Produces `summary_test.csv`. |
| Data QA notebooks | Jupyter (`backend/jupyter_notebook/`) | Manual | After pipeline changes | Validate smoothing/anomaly outputs. |
| Frontend build | `yarn build` | Vercel | On push to `main` | ISR handles runtime data freshness. |

**GitHub Actions** mirror the daily ingest as a safety net and can be expanded to include lint/test gates.

---

## Incident response

1. **Frontend outage** — check Vercel dashboard. If caused by data mismatch, roll back to previous deployment (Vercel UI) and inspect backend responses.
2. **Backend outage** — use Railway logs. If Postgres is unavailable the API falls back to JSON (`backend/data/data.json`). Regenerate it via `update_pipeline.py`.
3. **Pipeline failure** — re-run job manually; inspect logs for upstream HTTP failures. Apply exponential backoff in scripts when required.
4. **Data corruption** — restore from PostgreSQL snapshot or rerun pipelines with historical date ranges. Commit the regenerated JSON fallback for traceability.
5. **Mapbox quota exceeded** — MapboxPreloader logs warn about 401 responses. Rotate tokens or reduce tile preloading (see `MapboxPreloader.tsx`).

Notify stakeholders via Slack/Email with root cause and remediation steps. Keep a changelog in PR descriptions for traceability.

---

## Access control

- Vercel team: grant deploy permissions to maintainers; restrict environment variable editing to admins.
- Railway: enable two-factor auth and restrict database credentials to deploy tokens.
- S3 / bucket storing Sentinel‑2 outputs: use IAM roles scoped to upload-only keys.

---

## Frequently performed tasks

| Task | Command / Action |
|------|------------------|
| Tail backend logs | `railway logs --service climate-backend` |
| SSH into pipeline container | `railway shell --service climate-pipeline` |
| Trigger full data refresh | `railway run python update_pipeline.py && python update_fjord_data.py` |
| Regenerate JSON fallback | Run pipelines locally and commit `backend/data/data.json` |
| Clear Mapbox cache (dev) | Call `resetMapPreloadRegistry()` in console, refresh page |

For developer onboarding and local tooling, read [docs/DEVELOPMENT.md](DEVELOPMENT.md). For architecture-level discussions, see [docs/ARCHITECTURE.md](ARCHITECTURE.md).
