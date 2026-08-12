# Frontend

The scrollytelling story itself: Next.js 15 App Router, React 19, Tailwind 4,
GSAP/ScrollTrigger for the scroll choreography, Recharts for the charts, and
Mapbox GL for the globe and the flight into Uummannaq.

The repository-wide README covers architecture and the backend. This file only
covers working inside `frontend/`.

## Running it

Yarn 3, pinned through `.yarn/releases/`, with the node-modules linker. The
Yarn binary comes with the repository, so `yarn install` works without
installing Yarn first.

```bash
yarn install
yarn dev
```

The story is then at `http://localhost:3000/de` and `/en`. It needs the backend
on port 8000; without it every chart renders its empty state, which is a
legitimate way to work on layout but not on data.

Two environment variables belong in `frontend/.env.local`:

```ini
BACKEND_INTERNAL_URL=http://localhost:8000
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your-token
```

Mapbox draws the globe and the map scenes and is required. It is the only key
the story needs.

The ground and the relief over Uummannaq used to come from MapTiler and now come
from this project. Mapbox's own imagery renders this fjord as an unbroken dark
field with no island in it at the closest waypoint, so the ground is a Sentinel-2
scene from the same archive the analysis runs on, 24 July 2026, in
`public/images/basemap-summer.jpg`. The relief is in `public/terrain`, from
ArcticDEM v4.1 at 2 m: Mapbox returns 198 m for that mountain and Copernicus DEM
returns 792, against a measured 1206. Both are built by
`scripts/build_basemap_image.py` and `scripts/build_terrain_tiles.py` in the
science repo. See `lib/basemapLayers.ts`. Nothing here needs a second key.

## Checks

```bash
yarn tsc --noEmit    # types
yarn test            # unit tests, vitest
yarn test:e2e        # story guardrails, Playwright
```

`tests/e2e/` holds two suites, and both need a server already running at
`PLAYWRIGHT_BASE_URL`. `layout.spec.ts` asserts things the story must not lose,
such as the season interval being explained in both languages.
`responsive-audit.spec.ts` walks all 26 scenes at six viewport widths and fails
on any overlap or overflow it finds. Both abort the imagery providers through
`tests/e2e/fixtures.ts`, so a run costs nobody any tiles.

## Where things live

| Path | What it is |
|---|---|
| `components/scenes/scenesConfig.tsx` | Every scene of the story in order: which chart, which captions, how long it scrolls. Start here. |
| `components/scenes/ChartScene.tsx` | The scroll machinery all chart scenes share. |
| `components/Rechart/` | The charts. |
| `locales/de.json`, `locales/en.json` | All copy. No user-facing string belongs in a component. |
| `lib/chartData.ts` | Everything derived from the API before it reaches a chart. |
| `scripts/` | Build-time generators. `gen-image-meta.mjs` reads the photo dimensions, `gen-satellite-rasters.mjs` builds the WebP satellite rasters. |

## Two rules worth knowing before editing

Copy goes through i18next in both languages or it does not go in. A German
reader seeing an English label is a bug, and the e2e suite checks for a few of
those specifically.

Motion respects `prefers-reduced-motion`. The scroll choreography has a reduced
path throughout, and new animation is expected to use it.
