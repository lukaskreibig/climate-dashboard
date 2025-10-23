# Arctic Climate Story — Technical Reference

An immersive, data-driven scrollytelling experience that visualises how the Arctic is changing. The project blends high-resolution satellite imagery, interactive charts, and narrative copy to guide the reader through temperature anomalies, sea-ice decline, and local stories from Uummannaq Fjord.

<p align="center">
  <img width="1200" alt="Story overview" src="https://github.com/user-attachments/assets/983ba157-e598-42a6-944a-82161b72d1c7" />
</p>

**Live story** → [arctic.rip](https://arctic.rip)  
**Tech deep dives** → [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) • [docs/DATA_PIPELINE.md](docs/DATA_PIPELINE.md) • [docs/OPERATIONS.md](docs/OPERATIONS.md)

---

## Table of Contents

1. [Why this project exists](#why-this-project-exists)
2. [System at a glance](#system-at-a-glance)
3. [Repository layout](#repository-layout)
4. [Getting started locally](#getting-started-locally)
5. [Data sources & refresh cadence](#data-sources--refresh-cadence)
6. [Frontend runtime highlights](#frontend-runtime-highlights)
7. [Testing & quality gates](#testing--quality-gates)
8. [Deployment & operations](#deployment--operations)
9. [Contributing & coding conventions](#contributing--coding-conventions)
10. [Further reading](#further-reading)

---

## Why this project exists

Clients and employers use this repository as a qualitative benchmark for senior-level engineering. It demonstrates:

- **Story-first UX** — GSAP-powered scroll choreography, Mapbox/MapTiler warm-up, and pre-fetched scene assets keep the narrative fluid.
- **Data credibility** — reproducible pipelines pull from NASA GISTEMP, NOAA NSIDC, OWID CO₂, and a custom Sentinel‑2 sea-ice segmentation job.
- **Operational maturity** — a typed FastAPI backend, Railway-hosted pipelines, and Vercel deployments with daily refresh workflows.
- **Internationalisation & accessibility** — German/English copy, Radix primitives, and guardrails in `ChartScene` to prevent overlap with the progress rail.

Use the rest of this document to explore the tech stack, reproduce the environment, and dive into the data plumbing.

---

## System at a glance

| Layer | Stack | Responsibilities |
|-------|-------|------------------|
| **Frontend** (`frontend/`) | Next.js 15, React 19, GSAP, D3, Recharts, Mapbox GL, Tailwind 4 | Scrollytelling runtime, chart orchestration, Mapbox/MapTiler preload registry, localisation (i18next + file-based routing). |
| **Backend** (`backend/`) | FastAPI, SQLAlchemy, Pandas, OpenAI SDK | Serves aggregated climate datasets, computes on-demand decadal sea-ice anomalies, exposes Uummannaq fjord bundles, and supports LLM-backed helper endpoints. |
| **Pipelines** (`data-pipeline/`, `satellite/`) | Python, Pandas, PyTorch (UNet), segmentation_models_pytorch, pystac, Dask | Nightly ingestion & normalisation of NASA/NOAA/OWID data, plus Sentinel‑2 segmentation to derive fjord freeze/breakup metrics. |
| **Infrastructure** | Vercel (frontend), Railway (backend & pipelines), GitHub Actions, Supabase/PostgreSQL | Continuous delivery, cron-style refresh jobs, and data persistence. |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed sequence diagrams, contract boundaries, and caching strategy.

---

## Repository layout

```
├── frontend/          # Next.js application (scrollytelling experience)
│   ├── app/           # Route groups (`/[lng]/` for locale-aware pages)
│   ├── components/    # Map/Chart scenes, StoryProgress rail, UI primitives
│   ├── lib/           # Mapbox preload registry, API client, map tiler helpers
│   ├── locales/       # i18n JSON bundles (EN/DE)
│   ├── types/         # Shared TypeScript contracts mirroring backend schemas
│   └── vitest.config.ts
├── backend/           # FastAPI service exposed on Railway
│   ├── main.py        # `/data`, `/uummannaq`, and helper endpoints
│   ├── schemas.py     # Pydantic models shared with the frontend
│   └── update_data.py # Legacy refresh script kept for reference
├── data-pipeline/     # NOAA/NASA/OWID ingestion + fjord aggregations
│   ├── update_pipeline.py     # Core climate aggregation job
│   ├── update_fjord_data.py   # Uummannaq derived metrics loader
│   └── wait_for_db.py         # Utility for Railway deployments
├── docs/              # Living documentation (architecture, ops, CMS plan…)
└── satellite/ (see docs)  # Sentinel‑2 segmentation pipeline (UNetMobV2)
```

> **Tip:** The TypeScript types in `frontend/types/` are the single source of truth for data contracts. When backend schemas evolve, update them first and regenerate mirroring Pydantic models.

---

## Getting started locally

### Prerequisites

- Node.js 20+ with Corepack (`corepack enable`) to use Yarn 3.
- Python 3.11 (virtualenv or `pyenv` recommended).
- Docker (optional) if you want to run the pipelines in containers.
- Mapbox and MapTiler API keys, plus any backend URL if consuming remote data.

### 1. Install dependencies

```bash
# Frontend
cd frontend
yarn install

# Backend (FastAPI)
cd ../backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Data pipeline (optional)
cd ../data-pipeline
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Set up environment variables

Create the following files (examples for local development):

```ini
# frontend/.env.local
BACKEND_INTERNAL_URL=http://localhost:8000
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your-token
NEXT_PUBLIC_MAPTILER_KEY=your-key
```

```ini
# backend/.env
DATABASE_URL=postgresql://user:pass@localhost:5432/climate
OPENAI_API_KEY=sk-...
```

For pipeline jobs, see [docs/DATA_PIPELINE.md](docs/DATA_PIPELINE.md#environment-variables).

### 3. Run the stack

```bash
# Terminal 1 – backend (FastAPI + hot reload)
cd backend
uvicorn main:app --reload --port 8000

# Terminal 2 – frontend (Next.js with Turbopack)
cd frontend
yarn dev
```

The story is now available at [http://localhost:3000/de](http://localhost:3000/de) or `/en`.

### 4. Optional: execute the pipelines locally

```bash
cd data-pipeline
python update_pipeline.py        # ingest NOAA/NASA/OWID data
python update_fjord_data.py      # refresh Uummannaq aggregates
```

For the Sentinel‑2/UNet segmentation job see [docs/DATA_PIPELINE.md#sentinel-2-sea-ice-segmentation](docs/DATA_PIPELINE.md#sentinel-2-sea-ice-segmentation).

### 5. Docker Compose workflow

The repository ships with a `docker-compose.yml` that provisions PostgreSQL, the FastAPI backend, and the data pipeline runner. This is the quickest way to spin up an end-to-end environment:

```bash
# start Postgres + API
docker compose up api db

# (optional) run the data pipeline once
docker compose --profile pipeline up pipeline
```

The compose file uses environment overrides from `docker/.env.dev`. Mounts are configured so pipeline CSV outputs can be swapped without rebuilding the image. See [docs/OPERATIONS.md](docs/OPERATIONS.md#docker-compose) for more detail.

---

## Data sources & refresh cadence

| Dataset | Source | Refresh | Consumed by |
|---------|--------|---------|-------------|
| Global + Arctic temperature anomalies | [NASA GISTEMP](https://data.giss.nasa.gov/gistemp/) | daily scheduled job | Annual anomaly charts, correlation matrix |
| Arctic sea-ice extent (daily) | [NOAA NSIDC Sea Ice Index](https://nsidc.org/data/seaice_index) | daily scheduled job | Daily anomaly chart, decadal analysis |
| CO₂ emissions (global & per entity) | [Our World in Data](https://ourworldindata.org/co2-emissions) | weekly (source) / daily (pipeline) | Z-score chart, correlation matrix |
| Uummannaq fjord passive microwave data | Internal satellite pipeline (see below) | ad-hoc / monthly | Fjord scene (freeze/breakup, anomalies) |

Pipelines dump results into PostgreSQL on Railway and export a JSON fallback (`backend/data/data.json`) for offline/local development. Detailed transformations, smoothing windows, and anomaly definitions are documented in [docs/DATA_PIPELINE.md](docs/DATA_PIPELINE.md).

---

## Frontend runtime highlights

- **Scroll orchestration** — `components/scenes/ChartScene.tsx` owns GSAP triggers, caption animation, and x-shift logic that keeps charts away from the progress rail. Guardrails remeasure captions + chart widths on resize to avoid overlap.
- **Map warm-up** — `MapboxPreloader.tsx` spins up a hidden WebGL map per tab, jumps through registered viewpoints (`lib/mapPreloadRegistry.ts`), and preloads overlay imagery before the user scrolls into map scenes.
- **Story Progress rail** — `components/StoryProgress.tsx` is driven by IntersectionObserver hooks, syncing route chapters with the gutter on the right.
- **Internationalisation** — locales are handled via `app/[lng]/` route segments; translations live in `frontend/locales/`, with runtime language detection using `accept-language`.
- **Error resilience** — each scene renders inside `SceneErrorBoundary` so data issues degrade gracefully without breaking the scroll experience.

See [docs/FRONTEND_RUNTIME.md](docs/FRONTEND_RUNTIME.md) for diagrams, timing charts, and guidance on adding new scenes.

---

## Testing & quality gates

- **Unit tests** — run `yarn test` (Vitest) for frontend modules; coverage currently targets the Mapbox preload registry with TODOs for ChartScene math and data adapters.
- **Linting** — `yarn lint` enforces Next.js + custom ESLint rules. Tailwind-specific linting runs via Stylelint (`npx stylelint "**/*.css"`).
- **Type safety** — `yarn tsc --noEmit` ensures the app is type clean.
- **Backend** — run `pytest` inside `backend/` to exercise FastAPI routes and typed settings.
- **E2E layout checks** — run `yarn test:e2e` (Playwright) against a running dev server to ensure charts and captions respect the progress-rail gutter. Install the Playwright browsers once via `yarn playwright install`.
- **Pipelines** — notebooks in `backend/jupyter_notebook/` validate transformations; add integration tests when modifying anomaly calculations.

Recommended CI command bundle:

```bash
yarn lint
yarn test
yarn tsc --noEmit
# Optional but recommended
pytest            # from backend/
yarn test:e2e     # requires `yarn dev` in another terminal
```

---

## Deployment & operations

A full runbook lives in [docs/OPERATIONS.md](docs/OPERATIONS.md). Highlights:

- **Frontend** → Vercel (`main` branch auto-deploy, environment variables for Mapbox/MapTiler, ISR revalidation hooks).
- **Backend** → Railway (FastAPI container, Postgres add-on, custom domains).
- **Pipelines** → Railway scheduled tasks + GitHub Actions for nightly refresh (`update_pipeline.py`, `update_fjord_data.py`).
- **Satellite segmentation** → executed manually or via specialised GPU runner; outputs are uploaded to S3 and ingested by the fjord pipeline.
- **Monitoring** → Sentry (frontend), Railway logs (backend), Slack notifications (pipelines).

Secrets and API keys are managed through Vercel/Railway dashboards; see the operations doc for the canonical list.

---

## Contributing & coding conventions

- Prefer **type-safe adapters** — add/extend types in `frontend/types/` and `backend/schemas.py` before touching runtime logic.
- Keep GSAP timelines declarative inside `ChartScene`; avoid anonymous side effects.
- For Mapbox scenes, register viewpoints and overlay assets via `registerMapPreload` so the preloader can warm them.
- When touching pipelines, document parameter changes (`docs/DATA_PIPELINE.md`) and regenerate the JSON fallback.
- Run the quality gates (`lint`, `test`, `tsc`) locally before opening a PR.

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for onboarding tips, coding style, and recommended VS Code settings.

---

## Further reading

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — subsystem deep dive, sequence diagrams, contract tables.
- [docs/DATA_PIPELINE.md](docs/DATA_PIPELINE.md) — ingestion, anomaly math, Sentinel‑2 segmentation pipeline.
- [docs/OPERATIONS.md](docs/OPERATIONS.md) — deployments, cron jobs, monitoring, disaster recovery.
- [docs/FRONTEND_RUNTIME.md](docs/FRONTEND_RUNTIME.md) — how scenes, captions, and the progress rail cooperate.
- [docs/CMS_SANITY.md](docs/CMS_SANITY.md) — migration plan to externalise narrative copy via Sanity CMS.

---

**Maintainers** — reach out to @lukaskreibig for strategic direction or infrastructure access.

## License

All rights reserved. See [LICENSE](LICENSE) for evaluation terms and usage restrictions.
