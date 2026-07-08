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
import { ensureMapTilerLayers } from "@/lib/mapTilerLayers";

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
  promise: Promise<void>;
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
    img.crossOrigin = "anonymous";
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });

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
    await existing.promise;
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
    promise: Promise.resolve(),
    ready: false,
    failed: false,
    claimedBy: null,
  };

  const promise = (async () => {
    try {
      await waitForStyle(map);
      ensureMapTilerLayers(map, { terrain: config.terrain ?? true });
      ensureSatelliteOverlay(map, config.satelliteOverlay);
      applyMapLanguage(map, currentLanguage);

      await waitForIdle(map);
      onStep();

      for (const view of views.slice(1)) {
        map.jumpTo({
          center: [view.lng, view.lat],
          zoom: view.zoom,
          pitch: view.pitch ?? 0,
          bearing: view.bearing ?? 0,
        });
        await waitForIdle(map);
        onStep();
      }

      state.ready = true;
      performance.mark?.(`map-warm-ready:${config.id}`);
    } catch (error) {
      state.failed = true;
      if (process.env.NODE_ENV !== "production") {
        console.error(`Mapbox warmup failed for ${config.id}`, error);
      }
    }
  })();

  state.promise = promise;
  warmMaps.set(config.id, state);
  performance.mark?.(`map-warm-start:${config.id}`);

  await promise;
};

const runWarmup = async () => {
  bindResize();
  mapboxgl.prewarm?.();
  emitProgress(2);

  const root = await waitForRoot();
  const maps = getRegisteredMapPreloadMaps();
  const mapConfigs = maps.length ? maps : [fallbackMapConfig()];
  const totalSteps =
    mapConfigs.reduce((sum, config) => sum + Math.max(1, config.views.length), 0) + 1;
  let doneSteps = 0;

  const onStep = () => {
    doneSteps += 1;
    emitProgress((doneSteps / totalSteps) * 90);
  };

  await Promise.all(
    mapConfigs.map((config) => warmRegisteredMap(config, root, onStep))
  );

  await preloadMapImages();
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

export function claimWarmedMap(
  id: string | undefined,
  container: HTMLElement
): mapboxgl.Map | null {
  if (!id) return null;

  const state = warmMaps.get(id);
  if (!state || state.failed) return null;
  if (state.claimedBy && state.claimedBy !== container) return null;

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
