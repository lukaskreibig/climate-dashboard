# Frontend Runtime Guide

This document explains how the scrollytelling experience is assembled, how scenes cooperate with the progress rail, and how to add new interactive modules without breaking the story.

---

## High-level flow

```
app/[lng]/page.tsx
   ├─ preloadTiles() / registerMapPreload()
   ├─ fetchClimateData()   --> /api/data
   ├─ fetchFjordBundle()   --> /api/uummannaq
   └─ render <StoryShell/>
           ├─ <MapboxPreloader/>
           ├─ <StoryProgress/>
           └─ {scenes.map(scene => <ChartScene cfg={scene} />)}
```

Each `ChartScene` receives a configuration object (`SceneCfg`) that defines captions, animation switches, chart render functions, and optional GSAP actions.

---

## Key components

### `ChartScene.tsx`

Responsibilities:

- **Lifecycle control** — pre-mount charts before they enter the viewport (`prefetchMarginPx`) and unmount when they leave.
- **GSAP timelines** — fade/slide/parallax transitions for charts, captions, and helper elements.
- **Caption management** — stacks captions on narrow viewports, applies left/right gutters, and triggers slide-in animations.
- **X-shift guardrails** — calculates safe positions for the chart so it never collides with the caption or the progress rail. Reacts to resize events and caption width changes via `ResizeObserver`.
- **Snow overlay toggle** — tells the `ArcticBackgroundSystem` when to fade the snow layer for specific scenes.
- **Scene actions** — allows scenes to trigger chart-specific logic (e.g. update axes, focus map waypoints).

Adding a new scene:

1. Define a config entry in `components/scenes/scenesConfig.tsx`.
2. Implement the chart/map/photo component referenced by the config (`cfg.chart`).
3. Register any map viewpoints with `registerMapPreload`.
4. Provide captions (`cfg.captions`) with optional `captionSide` hints.

### `StoryProgress.tsx`

- Observes each scene via `IntersectionObserver`.
- Highlights the active dot, updates the label (based on `data-title` attributes), and allows users to click dots to scroll.
- Receives `onSectionChange` callbacks so analytics can record story depth.

### `MapboxPreloader.tsx` & `mapPreloadRegistry.ts`

- Maintains a singleton hidden Mapbox map per browser tab.
- Warm-up steps:
  1. Prewarm WebGL workers (`mapboxgl.prewarm()`).
  2. Load the Satellite Streets style in the current language.
  3. Jump through registered viewpoints (Mapbox/MapTiler) and wait for `idle`.
  4. Preload overlay images referenced by map scenes.
- Exported helper `preloadTiles()` resolves once warm-up is complete. Map scenes await it before rendering to avoid flash-of-empty-map.

### `components/StoryShell.tsx` (implicit)

- Wraps scenes in layout, mounts background systems (aurora, snow), and adds the legal footer.
- Responsible for locale switching (`LanguageSwitcher`) and theme.

---

## Adding new scene types

### Chart (Recharts / D3)

1. Create a chart component in `components/Rechart/` or `components/D3/`.
2. Accept `data` and a `ref` if the chart exposes an imperative API.
3. In `scenesConfig.tsx`, supply a `chart` function that renders the component and wires up callbacks.
4. Provide `captionSide` hints in `captions` to influence initial chart shift.
5. Optional: add `actions` array for GSAP triggers (e.g. highlight a data series).

### Map scene

1. Register viewpoints + overlay images via `registerMapPreload`.
2. Await `preloadTiles()` inside the component before instantiating `mapboxgl.Map`.
3. Keep map state in refs to avoid re-renders (`useRef`).
4. When reacting to scroll, use GSAP ScrollTrigger tied to the scene container (see `MapFlyScene.tsx` for reference).

### Fullscreen photo / media section

1. Use `chartSide: "fullscreen"` to bypass shift logic.
2. `ChartScene` will stack captions below the media when the viewport is narrow.
3. For parallax backgrounds, set `cfg.parallax = true` and adjust `CHART_PARALLAX` in `ChartScene.tsx`.

---

## Guardrail checklist

- **Captions vs. progress rail** — verify on 1280px width (typical laptop). Charts should never extend beyond `--progress-gutter`.
- **Stacked mode** — shrink the viewport below 1024px to ensure captions stack and maintain padding.
- **Map preloading** — confirm `Mapbox warmup failed` does not appear in console; if it does, ensure tokens are valid or reduce registered viewpoints.
- **Accessibility** — captions are plain HTML; use semantic headings (`<h2>`, `<h3>`) and consider `aria-live` regions for dynamic content.
- **Performance** — keep GSAP animations simple; prefer `gsap.to()` with durations < 0.6s to maintain responsiveness.

---

## Debugging tips

- Enable `?debug` query parameter (if implemented) to show scene boundaries and caption widths.
- Use the GSAP dev tools (`window.gsap.globalTimeline.getChildren()`) to inspect running tweens.
- For Mapbox issues, set `localStorage.setItem('mapbox-gl-debug', 'true')` to enable verbose logs.
- If captions overlap the progress rail, log `layoutBounds` from `ChartScene` to check the computed gutter.

---

## Future enhancements

- Extract scene configs into Sanity CMS (`docs/CMS_SANITY.md`).
- Introduce Playwright regression tests that scroll through the entire story and capture screenshots.
- Instrument shift timings (time-to-interactive chart) and report them to Sentry for performance budgets.
- Allow editors to toggle caption sides without redeploying.

For comprehensive system architecture see [docs/ARCHITECTURE.md](ARCHITECTURE.md). For pipeline details refer to [docs/DATA_PIPELINE.md](DATA_PIPELINE.md).
