# Architecture Overview

The climate story is delivered by three cooperating subsystems that share a single repository and a common type system.

```
┌───────────────────────┐        ┌─────────────────────────┐
│  Frontend (Next.js)   │ <────► │  Backend API (FastAPI)  │
│  `frontend/`          │        │  `backend/`             │
│                       │        │                         │
│  • GSAP scroll scenes │        │  • /data (climate)      │
│  • Mapbox warm-up     │        │  • /uummannaq (fjord)   │
│  • i18n + progress UI │        │  • LLM helper routes    │
└─────────▲─────────────┘        └──────┬──────────────────┘
          │                              │
          │ typed DTOs (`frontend/types` │  `backend/schemas.py`)
          │                              │
┌─────────┴─────────────┐        ┌──────▼──────────────────┐
│  Pipelines & ML jobs  │ ─────► │  PostgreSQL / JSON dump │
│  `data-pipeline/`     │        │  (Railway + fallback)   │
│  `satellite/`         │        └─────────────────────────┘
│  • NASA / NOAA / OWID │
│  • Sentinel‑2 UNet    │
│  • Cron + CI jobs     │
└───────────────────────┘
```

The guiding principle is **type-driven development**: every JSON payload is represented by Pydantic models in the backend and mirrored by TypeScript interfaces in `frontend/types/`. Changes propagate from those contracts and are validated by TypeScript, ESLint, and Vitest before deployment.

---

## Frontend architecture (`frontend/`)

### Route structure & localisation

- The application uses the Next.js 15 **app router** with a `[lng]` segment for localisation (`/de`, `/en`). Incoming requests pass through `middleware.ts` to detect preferred languages via `accept-language` headers.
- Translations live in `locales/{lng}.json` and are loaded with `next-intl` + `react-i18next`. Per-scene text remains co-located with the component until the CMS migration (see `docs/CMS_SANITY.md`).

### Story runtime

1. **Boot sequence** (`app/[lng]/page.tsx`)
   - Preload all lazily imported components listed in `components/scenes/dynamicModules.ts`.
   - Fetch `/api/data` and `/api/uummannaq` concurrently through `lib/apiClient.ts`.
   - Normalise payloads into a `DashboardData` object (see `types/dashboard.ts`).
   - Register map viewpoints and overlay assets with `registerMapPreload`.

2. **Scroll orchestration**
   - `components/scenes/ChartScene.tsx` is a generic wrapper that handles:
     - GSAP timelines (fade-in/out, parallax, slide-up).
     - Caption positioning/guardrails (`pxShift`) to avoid overlaps with the progress rail.
     - IntersectionObserver logic that determines when charts mount/unmount.
     - Per-scene actions (e.g. hooking into chart APIs or map animations).
   - Specific charts (Recharts and D3 variants) live inside `components/Rechart` and `components/D3`.
   - Map scenes inherit from `components/MapFlyScene.tsx` or `components/SeaIceScene.tsx`, which in turn consume preloaded Mapbox/MapTiler assets.

3. **Progress rail & navigation**
   - `components/StoryProgress.tsx` renders dots on the right edge and keeps them in sync with scroll position using IntersectionObserver callbacks.
   - Each scene sets `data-progress` attributes so the rail can highlight the active step.

4. **Error resilience**
   - `components/SceneErrorBoundary.tsx` wraps individual scenes to keep the narrative alive if one chart fails to render.
   - `lib/apiClient.ts` exposes typed error classes so network issues can be surfaced with reader-friendly messaging.

### Asset warm-up

- `MapboxPreloader.tsx` runs exactly once per browser tab.
- It boots a hidden WebGL canvas, applies the Mapbox style in the current language, and jumps through registered viewpoints (`registerMapPreload`).
- Additional overlays (e.g. satellite rasters) are preloaded via `<img>` to avoid flash-of-empty-map.
- Map scenes call `preloadTiles()` before they animate so the first visible frame is already rendered.

### Styling & theming

- TailwindCSS 4 and CSS modules coexist. Global variables and spacing tokens live in `globals.css`.
- UI primitives (buttons, switches, tooltip wrappers) are built on top of Radix UI to guarantee accessibility (keyboard focus, ARIA attributes).
- Dark mode is enforced for the story (`ThemeProvider` with `dark` default).

---

## Backend architecture (`backend/`)

### FastAPI service

- **Endpoints**
  - `GET /data` — returns the main climate dataset (`DataResponse`). If a PostgreSQL connection is available (`DATABASE_URL`), data is fetched from tables; otherwise it falls back to `data/data.json`. Decadal daily anomalies are computed on the fly via `compute_decadal_daily_anomaly`.
  - `GET /uummannaq` (in `schemas.py`) — returns fjord-specific bundles produced by the pipeline (`FjordDataBundle`).
  - `POST /chat` (not documented here) — optional helper endpoint that proxies to OpenAI.
- **Middlewares**
  - CORS is whitelisted for the Vercel frontend + local dev.
  - Custom exception handlers translate Pandas/SQL errors into HTTP 5xx responses.
- **Caching**
  - Expensive transformations (`compute_decadal_daily_anomaly`) use `functools.lru_cache` to avoid recomputation inside the same process.
- **LLM assistants**
  - The service can load an OpenAI API key to generate language variants or answer questions (currently experimental).
- **Configuration**
  - `settings.py` uses `pydantic-settings` to provide typed access to environment variables (database URL, OpenAI keys, smoothing windows). Unit tests guard the defaults and ensure overrides behave as expected.

### Data contracts

The following table shows how schemas flow through the stack:

| Concept | Backend (`backend/schemas.py`) | Frontend (`frontend/types/`) |
|---------|--------------------------------|-------------------------------|
| Climate dashboard payload | `DataResponse` | `DashboardData`, `AnnualDatum`, `DecadalDailyDatum`, `CorrelationCell`, … |
| Uummannaq fjord bundle | `FjordDataBundle` | `FjordDailyDatum`, `FjordSeasonBand`, `FjordFreezeBreakup` |
| Legal footer copy | Static in `LegalFooter.tsx` (to be CMS-driven) | `LegalFooterProps` |

Whenever a schema changes, run:

```bash
# Type-check both worlds
cd frontend && yarn tsc --noEmit
cd ../backend && mypy (TODO)  # currently validated via runtime
```

---

## Data pipelines (`data-pipeline/` & `satellite/`)

See [docs/DATA_PIPELINE.md](docs/DATA_PIPELINE.md) for the full playbook. A brief summary:

1. **`update_pipeline.py`**
   - Downloads NOAA, NASA, and OWID datasets.
   - Normalises calendars to 365-day years, removes leap days, smooths daily series (Hamming window), and computes anomalies.
   - Writes results to CSV and PostgreSQL tables (`annual`, `daily_sea_ice`, `iqr_stats`, …).
   - Exports JSON so the backend can serve a static fallback.

2. **`update_fjord_data.py`**
   - Reads processed Sentinel‑2 segmentation output (generated by the satellite job).
  - Derives season bands, spring anomalies, mean fractions, and freeze/breakup dates.
   - Upserts into `fjord_*` tables in PostgreSQL.

3. **Sentinel‑2 segmentation (`satellite/` script)**
   - Uses pystac to query Earth Search, downloads Level‑1C tiles, and runs a UNetMobilenetV2 model (PyTorch + segmentation_models_pytorch) to segment solid/light ice vs. water.
   - Applies domain-specific thresholds (NDSI, NDWI, NDVI) and exports overlay imagery + CSV summaries.
   - Results feed into the fjord pipeline above.

Pipelines run on Railway via cron triggers and are mirrored by GitHub Actions for redundancy. Outputs are immutable historical tables so backfills are reproducible.

---

## Sequence diagrams

### Page load (happy path)

```
Browser           Next.js app        FastAPI            PostgreSQL
   │ GET /de           │                 │                    │
   │──────────────────▶│                 │                    │
   │                   │ fetch /api/data │                    │
   │                   │────────────────▶│  SELECT * …        │
   │                   │                 │───────────────────▶│
   │                   │                 │◀───────────────────│ rows
   │                   │◀────────────────│ aggregate + cache  │
   │                   │                 │
   │                   │ fetch /api/uummannaq                 │
   │                   │────────────────▶│                   │
   │                   │                 │ (same pattern)     │
   │                   │◀────────────────│                   │
   │ hydrate scenes    │                 │                    │
   │ render + stream   │                 │                    │
```

If PostgreSQL is unreachable the backend serves `data/data.json` instead; the frontend does not need to change.

### Map scene warm-up

```
Map scene component          MapboxPreloader          Mapbox CDN / Tile servers
          │ register view/images │
          │─────────────────────▶│
          │                      │ boot hidden map          ┌──────────────┐
          │                      │─────────────────────────▶│    Tile CDN  │
scroll into scene                │ jump through viewpoints  └──────────────┘
          │ await preloadTiles() │                          (tiles cached)
          │◀─────────────────────│
          │ instantiate visible map with warmed resources
```

---

## Observability & resilience

- **Logging** — GSAP/log-heavy operations log to `console.debug` in development; production noise is suppressed. Backend uses Python `logging` with configurable levels (`LOG_LEVEL` env).
- **Monitoring** — Sentry (frontend) captures runtime errors; Railway dashboard monitors backend/pipeline health; Slack webhook (optional) notifies pipeline failures.
- **Fallbacks** — When `ChartScene` detects overlap or missing data, it degrades to center alignment or hides the caption box instead of hard failing.
- **Disaster recovery** — Re-run `update_pipeline.py` with `OVERWRITE=1` to backfill the database; JSON fallback can be regenerated manually and committed.

---

## Roadmap & improvement areas

See the project README for high-level opportunities (CMS migration, additional automated tests, Playwright coverage). Architectural priorities include:

- Converging on a single source of truth for copy (Sanity CMS).
  
- Wiring strict typing for FastAPI responses via `mypy` + `pydantic-settings`.
  
- Adding Playwright regression tests to cover scroll choreography.
  
- Instrumenting Mapbox warm-up telemetry (time-to-first-frame).

Contributions should document architectural decisions in this directory (`docs/`) so the next engineer can reason about them quickly.
