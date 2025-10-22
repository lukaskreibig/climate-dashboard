## Architecture Overview

The Climate Dashboard is a mono-repo that combines three subsystems:

| Subsystem | Location | Description |
|-----------|----------|-------------|
| Frontend  | `frontend/` | Next.js 15 application that renders the story-driven experience, orchestrates Mapbox/MapTiler assets, and provides interactive data visualisations. |
| Backend   | `backend/`  | FastAPI service that aggregates climate datasets (sea-ice, temperature anomalies, emissions) and exposes them via REST endpoints. |
| Data Pipeline | `data-pipeline/` | Scheduled Python jobs that download, clean, and publish fresh data to the backend or directly to the shared data JSON. |

All three services share a common schema defined in `backend/schemas.py` and mirrored on the frontend in `frontend/types/`. This alignment guarantees type safety end-to-end.

### Frontend Runtime Flow

1. `app/[lng]/page.tsx` performs three warm-up steps:
   - Preload all lazily evaluated modules (`dynamicModules`) so the story scroll is jank-free.
   - Fetch the base `/api/data` payload (annual metrics + decadal anomaly) and the `/api/uummannaq` fjord bundle in parallel via `lib/apiClient.ts`.
   - Assemble a strongly typed `DashboardData` object which is passed down to every scene.
2. `components/scenes/ChartScene.tsx` orchestrates scroll-based activation using GSAP, applies the right gutter so text never overlaps the progress rail, and renders each scene inside `SceneErrorBoundary` to keep the story resilient.
3. Map-heavy components register viewpoints/images with `mapPreloadRegistry.ts`, allowing `MapboxPreloader.tsx` to warm Mapbox workers, terrain tiles, MapTiler rasters, and overlay imagery before any scene comes into view.

### Data Contracts

The `frontend/types` package is the single source of truth for fetch contracts:

- `types/api.ts` mirrors the FastAPI `DataResponse`.
- `types/dashboard.ts` defines the merged structure that the story consumes.
- `types/index.ts` retains domain-specific Fjord types and re-exports the shared interfaces.

A thin `lib/apiClient.ts` wraps `fetch`, centralises error handling, and returns typed data. Any new data endpoint should extend those interfaces first.

### Error Resilience & Observability

- Client-side chart rendering is protected by `SceneErrorBoundary` so a single faulty dataset does not crash the narrative.
- Map warming logs are confined to `ApiError` handling so network failures are surfaced with actionable messages.
- Proxy routes in `app/api/` normalise error payloads and timeouts before the data reaches the browser.

### Testing Strategy

- Unit tests are powered by Vitest (configured in `vitest.config.ts`). The first suite (`lib/__tests__/mapPreloadRegistry.test.ts`) verifies registry deduplication.
- Additional suites should target scroll orchestration (`ChartScene`) and data transformation helpers.
- Playwright is recommended for full-page regression (not yet added).

### Continuous Improvement Checklist

- Run `yarn lint && yarn test` locally before pushing. ESLint warnings for string escaping and lingering `any` should be resolved incrementally.
- Add end-to-end coverage for the scrollytelling journey once Playwright is wired up.
- Expand unit tests around data adapters to detect schema drift early.
