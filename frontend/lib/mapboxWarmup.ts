"use client";

import mapboxgl from "mapbox-gl";
import {
  getRegisteredMapPreloadImages,
  getRegisteredMapPreloadMaps,
  getRegisteredMapPreloadViews,
  type MapPreloadMap,
  type MapPreloadView,
  type MapSatelliteOverlayPreload,
} from "@/lib/mapPreloadRegistry";
import { TERRAIN, ensureBasemapLayers } from "@/lib/basemapLayers";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const STYLE_URL = (language: string) =>
  `mapbox://styles/mapbox/satellite-streets-v12?language=${language}`;

const DEFAULT_VIEW: MapPreloadView = {
  lng: 0,
  lat: 90,
  zoom: 1.3,
  pitch: 0,
  bearing: 0,
};

const RAW_SOURCE = "sr-raw";
const MASK_SOURCE = "sr-mask";
const RAW_LAYER = "sr-raw";
const MASK_LAYER = "sr-mask";

const languageMap: Record<string, string> = {
  de: "de",
  en: "en",
  fr: "fr",
  es: "es",
  it: "it",
  ja: "ja",
  ko: "ko",
  zh: "zh-Hans",
  ru: "ru",
};

type ProgressListener = (progress: number) => void;

interface StartWarmupOptions {
  language?: string;
  onProgress?: ProgressListener;
}

interface AwaitWarmupOptions extends StartWarmupOptions {
  timeoutMs?: number;
}

interface WarmMapState {
  id: string;
  host: HTMLDivElement;
  map: mapboxgl.Map;
  /** resolves once the style, layers and labels are attached: the loader's gate */
  styled: Promise<void>;
  /** resolves once every waypoint has been visited and its tiles are cached */
  primed: Promise<void>;
  /** kept so the imagery can be attached later than the map is built */
  overlay?: MapSatelliteOverlayPreload;
  overlayAttached: boolean;
  /** whether this warm map carries the relief; see the sweep below */
  terrain: boolean;
  ready: boolean;
  failed: boolean;
  claimedBy: HTMLElement | null;
}

let warmupRoot: HTMLElement | null = null;
let warmupPromise: Promise<void> | null = null;
let currentLanguage = "en";
let imagesWarmed = false;
let imageWarmPromise: Promise<void> | null = null;
let resizeBound = false;

const rootWaiters = new Set<(root: HTMLElement) => void>();
const progressListeners = new Set<ProgressListener>();
const warmMaps = new Map<string, WarmMapState>();

const hasNameToken = (value: unknown): boolean => {
  if (typeof value === "string") return value.includes("name");
  return Array.isArray(value) && value.some((item) => hasNameToken(item));
};

export const applyMapLanguage = (map: mapboxgl.Map, language: string): boolean => {
  if (!map.isStyleLoaded()) return false;

  const mapLanguage = languageMap[language] || "en";
  const layers = map.getStyle()?.layers ?? [];

  layers.forEach((layer) => {
    if (layer.type !== "symbol" || !layer.layout?.["text-field"]) return;
    if (!hasNameToken(layer.layout["text-field"])) return;

    map.setLayoutProperty(layer.id, "text-field", [
      "coalesce",
      ["get", `name:${mapLanguage}`],
      ["get", "name_international"],
      ["get", "name"],
    ]);
  });

  return true;
};

const emitProgress = (progress: number) => {
  const clamped = Math.max(0, Math.min(100, progress));
  progressListeners.forEach((listener) => listener(clamped));
};

const bindResize = () => {
  if (resizeBound || typeof window === "undefined") return;
  resizeBound = true;

  let frame = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      warmMaps.forEach((state) => state.map.resize());
    });
  });
};

const waitForRoot = () =>
  new Promise<HTMLElement>((resolve) => {
    if (warmupRoot?.isConnected) {
      resolve(warmupRoot);
      return;
    }

    rootWaiters.add(resolve);
  });

export function setMapWarmupRoot(root: HTMLElement): void {
  warmupRoot = root;

  rootWaiters.forEach((resolve) => resolve(root));
  rootWaiters.clear();

  warmMaps.forEach((state) => {
    if (state.claimedBy) return;
    applyHiddenHostStyle(state.host);
    root.appendChild(state.host);
    state.map.resize();
  });
}

export function clearMapWarmupRoot(root: HTMLElement): void {
  if (warmupRoot === root) {
    warmupRoot = null;
  }
}

const applyHiddenHostStyle = (host: HTMLDivElement) => {
  Object.assign(host.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    opacity: "0",
    visibility: "hidden",
    pointerEvents: "none",
  });
};

const applyClaimedHostStyle = (host: HTMLDivElement) => {
  Object.assign(host.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    opacity: "1",
    visibility: "visible",
    pointerEvents: "none",
  });
};

const waitForStyle = (map: mapboxgl.Map) =>
  new Promise<void>((resolve) => {
    if (map.isStyleLoaded()) {
      resolve();
      return;
    }

    map.once("style.load", () => resolve());
  });

const waitForIdle = (map: mapboxgl.Map, timeoutMs = 8000) =>
  new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      map.off("idle", finish);
      resolve();
    };
    const timer = window.setTimeout(finish, timeoutMs);
    map.once("idle", finish);
  });

const preloadImage = (src: string) =>
  new Promise<void>((resolve) => {
    if (typeof Image === "undefined") {
      resolve();
      return;
    }

    const img = new Image();
    // No crossOrigin. Everything warmed here is same-origin, and a CORS request
    // lands in a different cache partition from the plain <img> that consumes
    // it later, so asking for CORS would make this preload fetch the picture
    // for nobody.
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });

/**
 * The relief, fetched the moment the page loads.
 *
 * NOT behind the first-intent gate, and that is the entire point. It was, and it
 * lost every race: the gate fires on the reader's first scroll, which is the same
 * moment they start travelling toward the map, so the prefetch and the descent
 * began together and the mountain arrived second. The reader saw a flat island
 * inflate exactly as the map came into view.
 *
 * The imagery is gated because it is 3.2 MB of Sentinel-2 for a beat far down the
 * story. This is 20 same-origin PNGs and 1.2 MB, which is less than the story's
 * own fonts, so it can simply be fetched.
 *
 * Zoom 8 and 9 only, out of 11.3 MB for the whole set. That is enough for relief
 * to exist under the island from the first frame it is visible; zoom 10 and 11
 * refine it while the camera is still travelling, which is when streaming is
 * invisible. The ranges come from the builder's own manifest rather than being
 * guessed here.
 */
const COARSE_THROUGH = 9;

interface TerrainManifest {
  levels: Record<string, { x0: number; x1: number; y0: number; y1: number }>;
}

let terrainWarmed = false;
let terrainWarmPromise: Promise<void> | null = null;

export function preloadTerrainTiles(): Promise<void> {
  if (terrainWarmed) return Promise.resolve();
  if (terrainWarmPromise) return terrainWarmPromise;

  terrainWarmPromise = fetch("/terrain/meta.json")
    .then((response) => (response.ok ? response.json() : null))
    .then((manifest: TerrainManifest | null) => {
      if (!manifest?.levels) return;
      const urls: string[] = [];
      Object.entries(manifest.levels).forEach(([zoom, range]) => {
        const z = Number(zoom);
        if (z > COARSE_THROUGH) return;
        for (let x = range.x0; x <= range.x1; x += 1) {
          for (let y = range.y0; y <= range.y1; y += 1) {
            urls.push(
              TERRAIN.tiles[0]
                .replace("{z}", String(z))
                .replace("{x}", String(x))
                .replace("{y}", String(y)),
            );
          }
        }
      });
      return Promise.all(urls.map((src) => preloadImage(src))).then(() => undefined);
    })
    .catch(() => undefined)
    .then(() => {
      terrainWarmed = true;
    })
    .finally(() => {
      terrainWarmPromise = null;
    });

  return terrainWarmPromise;
}

export function preloadMapImages(): Promise<void> {
  if (imagesWarmed) return Promise.resolve();
  if (imageWarmPromise) return imageWarmPromise;

  const imageUrls = getRegisteredMapPreloadImages();
  if (!imageUrls.length) {
    imagesWarmed = true;
    return Promise.resolve();
  }

  imageWarmPromise = Promise.all(imageUrls.map((src) => preloadImage(src)))
    .then(() => {
      imagesWarmed = true;
    })
    .finally(() => {
      imageWarmPromise = null;
    });

  return imageWarmPromise;
}

const paddedCoords = (overlay: MapSatelliteOverlayPreload) => {
  const pad = overlay.pad ?? 0;
  if (!pad) return overlay.coords;

  return overlay.coords.map(([lng, lat]) => [
    lng + (lng < 0 ? -pad : pad),
    lat + (lat < 0 ? -pad : pad),
  ]) as MapSatelliteOverlayPreload["coords"];
};

const ensureSatelliteOverlay = (
  map: mapboxgl.Map,
  overlay?: MapSatelliteOverlayPreload
) => {
  if (!overlay) return;

  if (!map.getSource(RAW_SOURCE)) {
    map.addSource(RAW_SOURCE, {
      type: "image",
      url: overlay.rawImg,
      coordinates: paddedCoords(overlay),
    });
  }

  if (!map.getSource(MASK_SOURCE)) {
    map.addSource(MASK_SOURCE, {
      type: "image",
      url: overlay.maskImg,
      coordinates: paddedCoords(overlay),
    });
  }

  if (!map.getLayer(RAW_LAYER)) {
    map.addLayer({
      id: RAW_LAYER,
      type: "raster",
      source: RAW_SOURCE,
      paint: { "raster-opacity": 0 },
    });
  }

  if (!map.getLayer(MASK_LAYER)) {
    map.addLayer({
      id: MASK_LAYER,
      type: "raster",
      source: MASK_SOURCE,
      paint: { "raster-opacity": 0 },
    });
  }
};

const fallbackMapConfig = (): MapPreloadMap => {
  const views = getRegisteredMapPreloadViews();

  return {
    id: "default",
    views: views.length ? views : [DEFAULT_VIEW],
    images: getRegisteredMapPreloadImages(),
    terrain: true,
  };
};

const createHost = (root: HTMLElement, id: string) => {
  const host = document.createElement("div");
  host.dataset.mapWarmupId = id;
  applyHiddenHostStyle(host);
  root.appendChild(host);
  return host;
};

const warmRegisteredMap = async (
  config: MapPreloadMap,
  root: HTMLElement,
  onStep: () => void
) => {
  const existing = warmMaps.get(config.id);
  if (existing) {
    if (!existing.host.isConnected && !existing.claimedBy) {
      root.appendChild(existing.host);
    }
    await existing.styled;
    return;
  }

  const views = config.views.length ? config.views : [DEFAULT_VIEW];
  const first = views[0] ?? DEFAULT_VIEW;
  const host = createHost(root, config.id);

  const map = new mapboxgl.Map({
    container: host,
    style: STYLE_URL(currentLanguage),
    center: [first.lng, first.lat],
    zoom: first.zoom,
    pitch: first.pitch ?? 0,
    bearing: first.bearing ?? 0,
    interactive: false,
    attributionControl: false,
    maxPitch: 85,
  });

  const state: WarmMapState = {
    id: config.id,
    host,
    map,
    styled: Promise.resolve(),
    primed: Promise.resolve(),
    overlay: config.satelliteOverlay,
    overlayAttached: false,
    terrain: config.terrain ?? true,
    ready: false,
    failed: false,
    claimedBy: null,
  };

  const onFailure = (error: unknown) => {
    state.failed = true;
    if (process.env.NODE_ENV !== "production") {
      console.error(`Mapbox warmup failed for ${config.id}`, error);
    }
  };

  // What the loading overlay waits for is the map being BUILT: style parsed,
  // terrain and overlay layers attached, labels in the reader's language. That
  // is the part a reader must not see happening, and it takes about a second.
  //
  // It deliberately does not wait for tiles. Waiting for `idle` never actually
  // succeeded here: two maps and 225 tile requests meant even the opening view
  // ran into its 8s timeout, so the old overlay sat for 12 seconds and then let
  // the reader in anyway with a map that was two thirds cold. Tiles resolving
  // progressively on a map already on screen is what maps normally look like,
  // and by the time the reader has scrolled past the intro they are there.
  const styleReady = (async () => {
    try {
      await waitForStyle(map);
      // The relief IS attached here, and it used to not be.
      //
      // The comment this replaces was right for its time: with MapTiler's DEM
      // on the map, the sweep below jumped through every waypoint and fetched
      // MapTiler tiles for each, 260 requests before the reader had scrolled,
      // out of 571 for a page view against a 100 000 a month plan. That plan ran
      // out in August 2026 and the keys were suspended. MapTiler is gone from
      // this project entirely; the ground is a Sentinel-2 scene out of the same
      // archive the analysis runs on, and the relief is ArcticDEM.
      //
      // The relief now ships with the story as 47 static files under
      // public/terrain, so a sweep over it costs a few hundred kilobytes of
      // same-origin cache and nobody's quota. Leaving it out was the reason the
      // mountain arrived only once the reader had already zoomed in, and then
      // popped: mapbox-gl asks for DEM tiles for the view it is in, so with no
      // terrain during the sweep, nothing was ever asked for in advance.
      ensureBasemapLayers(map, { terrain: state.terrain, ground: false });
      applyMapLanguage(map, currentLanguage);
      // The satellite overlay is NOT attached here. Mapbox fetches an image
      // source the moment it is added, and these two are 2.4 MB for a scene far
      // down the story, so a phone paid for them before the reader had moved.
      // attachSatelliteOverlays() does it on the reader's first movement, and
      // claimWarmedMap does it unconditionally, so a scene can never get the
      // map without them.
      performance.mark?.(`map-warm-styled:${config.id}`);
    } catch (error) {
      onFailure(error);
    }
  })();

  // Tiles along the flight path then prime in the background while the reader
  // is still on the intro, so the scroll-driven descent has them cached. If a
  // scene takes the map over the camera belongs to the reader, so the sweep
  // stops rather than fighting it for both the viewport and the bandwidth.
  state.primed = styleReady.then(async () => {
    try {
      for (const view of views) {
        if (state.claimedBy || state.failed) return;
        map.jumpTo({
          center: [view.lng, view.lat],
          zoom: view.zoom,
          pitch: view.pitch ?? 0,
          bearing: view.bearing ?? 0,
        });
        await waitForIdle(map);
      }
      if (state.claimedBy) return;
      state.ready = true;
      performance.mark?.(`map-warm-ready:${config.id}`);
    } catch (error) {
      onFailure(error);
    }
  });


  state.styled = styleReady;
  warmMaps.set(config.id, state);
  performance.mark?.(`map-warm-start:${config.id}`);

  await styleReady;
  onStep();
};

const runWarmup = async () => {
  bindResize();
  mapboxgl.prewarm?.();
  emitProgress(2);

  const root = await waitForRoot();
  const maps = getRegisteredMapPreloadMaps();
  const mapConfigs = maps.length ? maps : [fallbackMapConfig()];
  // one step per map (its opening view) plus one for the images; the deeper
  // waypoints prime after the overlay is gone and no longer move the bar
  const totalSteps = mapConfigs.length + 1;
  let doneSteps = 0;

  const onStep = () => {
    doneSteps += 1;
    emitProgress((doneSteps / totalSteps) * 90);
  };

  await Promise.all(
    mapConfigs.map((config) => warmRegisteredMap(config, root, onStep))
  );

  // The overlay imagery is deliberately NOT started here. It is 2.4 MB for a
  // scene far down the story, and app/[lng]/page.tsx holds it until the reader
  // first moves. Kicking it off here as well would undo that, and awaiting it
  // would put it back inside the loading gate by way of preloadTiles.
  doneSteps += 1;
  emitProgress(100);
};

export function startMapWarmup(options: StartWarmupOptions = {}): Promise<void> {
  if (options.language) currentLanguage = options.language;
  if (options.onProgress) progressListeners.add(options.onProgress);

  if (warmMaps.size) {
    setWarmMapLanguage(currentLanguage);
  }

  if (!warmupPromise) {
    warmupPromise = runWarmup().catch((error) => {
      if (process.env.NODE_ENV !== "production") {
        console.error("Mapbox warmup failed", error);
      }
    });
  }

  return warmupPromise;
}

export function awaitMapWarmup(options: AwaitWarmupOptions = {}): Promise<boolean> {
  const timeoutMs = options.timeoutMs ?? 0;
  const promise = startMapWarmup(options).then(
    () => true,
    () => false
  );

  if (!timeoutMs) return promise;

  return new Promise<boolean>((resolve) => {
    const timer = window.setTimeout(() => resolve(false), timeoutMs);
    promise.then((result) => {
      clearTimeout(timer);
      resolve(result);
    });
  });
}

/**
 * Attach the satellite imagery to every warm map that carries some.
 *
 * Split out from the warmup so the 537 KB it costs is spent when the reader
 * shows they are going somewhere, rather than while they read the first screen.
 * Idempotent: ensureSatelliteOverlay checks for each source and layer first.
 *
 * It waits for preloadMapImages first, and that ordering is the whole point.
 * Four things want these two rasters: this Mapbox source, the preloader, the
 * pixel inspector further down the story, and the second warm map. The only
 * thing keeping the reader from paying for each of them is the HTTP cache, and
 * a cache helps nobody until something is in it. Left to race, every one of
 * them misses: measured with the map failing fast, all four landed inside
 * 200 ms and pulled 1206 KB where 302 would do. Waiting costs nothing, because
 * the wait is exactly the download the others would have duplicated.
 */
export function attachSatelliteOverlays(): void {
  void preloadMapImages().then(() => {
    warmMaps.forEach((state) => {
      if (state.overlayAttached || !state.overlay) return;
      const attach = () => {
        try {
          ensureSatelliteOverlay(state.map, state.overlay);
          state.overlayAttached = true;
        } catch (error) {
          if (process.env.NODE_ENV !== "production") {
            console.warn(`satellite overlay not attached for ${state.id}`, error);
          }
        }
      };
      if (state.map.isStyleLoaded()) attach();
      else state.map.once("style.load", attach);
    });
  });
}

export function claimWarmedMap(
  id: string | undefined,
  container: HTMLElement
): mapboxgl.Map | null {
  if (!id) return null;

  const state = warmMaps.get(id);
  if (!state || state.failed) return null;
  if (state.claimedBy && state.claimedBy !== container) return null;

  // Whatever the reader did or did not do, a scene taking this map must have
  // its imagery: the Sentinel-2 ground, kept off the map during the priming
  // sweep so the sweep does not fetch its 3.2 MB for a beat far down the story,
  // and the two classified rasters.
  ensureBasemapLayers(state.map, { terrain: state.terrain });
  attachSatelliteOverlays();

  container.innerHTML = "";
  applyClaimedHostStyle(state.host);
  container.appendChild(state.host);
  state.claimedBy = container;

  requestAnimationFrame(() => {
    state.map.resize();
    state.map.triggerRepaint();
  });

  return state.map;
}

export function releaseWarmedMap(
  id: string | undefined,
  container?: HTMLElement | null
): void {
  if (!id) return;

  const state = warmMaps.get(id);
  if (!state) return;
  if (container && state.claimedBy && state.claimedBy !== container) return;

  state.claimedBy = null;
  applyHiddenHostStyle(state.host);

  if (warmupRoot?.isConnected) {
    warmupRoot.appendChild(state.host);
    requestAnimationFrame(() => state.map.resize());
  }
}

export function setWarmMapLanguage(language: string): void {
  currentLanguage = language;

  warmMaps.forEach((state) => {
    const update = () => {
      try {
        if (!applyMapLanguage(state.map, language)) {
          state.map.once("style.load", update);
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Mapbox language update skipped", error);
        }
      }
    };

    update();
  });
}

export function resizeWarmMaps(): void {
  warmMaps.forEach((state) => state.map.resize());
}

export function preloadTiles(options: AwaitWarmupOptions = {}): Promise<boolean> {
  return awaitMapWarmup(options);
}
