# Sanity CMS Migration Plan

This document outlines the recommended schema, content modelling guidelines, and rollout steps for migrating the climate story to Sanity.

## Objectives

1. Externalise all narrative copy, scene metadata, and GSAP timings so editors can iterate without code changes.
2. Preserve deterministic data loading (Mapbox preload registry, chart configs) by mirroring schema to existing TypeScript types.
3. Support multi-language content (currently German and English) with room for additional locales.
4. Keep deployments zero-downtime: content publishes via Sanity Studio while Next.js fetches via GROQ/GraphQL at build time + ISR.

## Dataset Structure

Use a single dataset (e.g. `production`). Enable the Internationalisation plugin for shared documents across locales.

### Core Document Types

| Type | Purpose | Key Fields |
|------|---------|------------|
| `storySettings` | Global settings (hero copy, CTA toggles, preload options). Singleton. | `slug`, `betaDialog` (title, description, feedback copy), `mapPreload` (array of references to scene fragments) |
| `scene` | Represents a chapter in the scrollytelling experience. | `order`, `slug`, `kind` (`"chart" | "photo" | "map" | ...`), `title`, `summary`, `gsapTriggers` (JSON), `component` (reference to component block), `preFetchMargin` |
| `chartConfig` | Parameter sets specific to chart components. | `component` (enum), `dataBindings` (object), `gsapTweens`, `copy` (rich text) |
| `mapScene` | Reusable Mapbox/MapTiler configurations. | `center`, `zoom`, `pitch`, `bearing`, `waypoints` (array with optional orbit/speed), `overlayImages` (asset refs) |
| `mediaAsset` | Named external assets (images/video) with metadata. | `title`, `file`, `alt`, `credit`, `preload` (boolean) |
| `footerLegal` | Legal texts for imprint/privacy. | `title`, `body`, `locale` |
| `faqEntry` | Optional future chatbot/FAQ data. | `question`, `answer`, `locale` |

### Shared Fields & Objects

- `localizedString`: { `en`: string, `de`: string, ... } via `defineField({type: 'internationalizedArray'})`.
- `gsapStep`: { `label`, `start`, `end`, `properties` } stored as JSON to hydrate ChartScene actions.
- `chartCopy`: { `headline`, `body`, `footnote` } with Portable Text.
- `mapWaypoint`: { `lng`, `lat`, `zoom`, `pitch`, `bearing`, `orbit`, `flySpeed` }.
- `preloadAsset`: { `asset` (ref), `type` (`mapTile`, `image`, `data`)}.

### Example Schema Snippets

```ts
// schemas/scene.ts
import {defineType, defineField} from 'sanity';

export default defineType({
  name: 'scene',
  title: 'Scene',
  type: 'document',
  fields: [
    defineField({ name: 'order', type: 'number', validation: rule => rule.required().min(1) }),
    defineField({ name: 'slug',  type: 'slug', options: { source: 'title' } }),
    defineField({ name: 'title', type: 'internationalizedString' }),
    defineField({
      name: 'kind',
      type: 'string',
      options: { list: ['chart','photo','map','narrative'] },
      validation: rule => rule.required(),
    }),
    defineField({ name: 'summary', type: 'internationalizedText' }),
    defineField({
      name: 'component',
      type: 'reference',
      to: [{ type: 'chartConfig' }, { type: 'mapScene' }, { type: 'photoScene' }],
    }),
    defineField({
      name: 'gsapTriggers',
      type: 'array',
      of: [{ type: 'gsapStep' }],
    }),
    defineField({
      name: 'preFetchMargin',
      type: 'number',
      description: 'Pixel margin for pre-mounting via ChartScene',
    }),
  ],
  orderings: [{ name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }],
});
```

```ts
// schemas/mapScene.ts
export default defineType({
  name: 'mapScene',
  title: 'Map Scene',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'internationalizedString' }),
    defineField({ name: 'styleUrl', type: 'url', initialValue: 'mapbox://styles/mapbox/satellite-streets-v12' }),
    defineField({ name: 'center', type: 'geopoint', validation: rule => rule.required() }),
    defineField({ name: 'zoom', type: 'number', validation: rule => rule.min(0).max(22) }),
    defineField({ name: 'pitch', type: 'number', initialValue: 0 }),
    defineField({ name: 'bearing', type: 'number', initialValue: 0 }),
    defineField({
      name: 'waypoints',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'title', type: 'internationalizedString' },
          { name: 'center', type: 'geopoint' },
          { name: 'zoom', type: 'number' },
          { name: 'pitch', type: 'number' },
          { name: 'bearing', type: 'number' },
          { name: 'orbit', type: 'number' },
          { name: 'flySpeed', type: 'number' },
        ],
      }],
    }),
    defineField({
      name: 'overlayImages',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'mediaAsset' }] }],
    }),
    defineField({ name: 'preloadAssets', type: 'array', of: [{ type: 'reference', to: [{ type: 'mediaAsset' }] }] }),
  ],
});
```

## Frontend Integration Plan

1. **Client**: replace static config imports with GROQ fetchers in `app/[lng]/page.tsx`. Use `@sanity/client` + `next-sanity` for ISR + preview.
2. **Typing**: auto-generate TypeScript types from Sanity schema via `@sanity-codegen/client`. Map them to existing `DashboardData` structures.
3. **Preload Registry**: create GROQ snippet that returns `mapScene` waypoints and overlay URLs to hydrate `registerMapPreload` at build time.
4. **Internationalisation**: query with `where(_lang == $lng)` or use Sanity i18n plugin's `__i18n_refs`. Populate `frontend/locales` via fallback until runtime fetch integrated.
5. **Preview**: add `/api/sanity/preview` route that sets draft mode and streams GROQ results to components.

## Migration Steps

1. **Bootstrap Sanity Project**
   - `npm create sanity@latest -- --template clean`. Enable internationalisation plugin and define datasets.
   - Commit schema definitions (`schemas/index.ts` importing the documents above).

2. **Model Content**
   - Import existing copy: transform `locales/en.json` & `de.json` into Sanity documents via script using `sanity import` or `groq` CLI.
   - Seed map scenes and chart configs with current static files (e.g. `mapScene` for Geographic Journey, Satellite Scene).

3. **Adapt Frontend**
   - Add GROQ queries (e.g. `queries/story.ts`) returning ordered scenes with embedded config.
   - Replace `scenesConfig.tsx` static array by building it from fetched data. Keep fallback static file behind feature flag during rollout.
   - Wire preview hooks for draft content.

4. **Deployment**
   - Host Sanity Studio (on Vercel or Sanity managed). Restrict write access.
   - Configure webhooks to trigger Vercel revalidation on publish (call `/api/revalidate?tag=story`).

5. **Validation**
   - Set up Sentry (or similar) to capture GROQ errors.
   - Add integration tests fetching from Sanity sandbox dataset to ensure schema parity.

## Timeline & Ownership

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Schema design | 2-3 days | Sanity schemas, codegen config, sample content seeded |
| Frontend integration | 3-4 days | GROQ queries, runtime adapters, preview route |
| QA & rollback | 1-2 days | Playwright regression, fallback to static config, editor training |

Maintaining the static JSON alongside Sanity for one deployment cycle is recommended. Once parity is confirmed, remove statically defined translations and rely entirely on CMS-driven content.
