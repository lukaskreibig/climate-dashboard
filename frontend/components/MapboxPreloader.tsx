/* ------------------------------------------------------------------
   MapboxPreloader.tsx   – einmal pro Tab die Mapbox-Runtime vorwärmen
------------------------------------------------------------------ */
"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { useTranslation } from 'react-i18next';
import "mapbox-gl/dist/mapbox-gl.css";
import {
  getRegisteredMapPreloadImages,
  getRegisteredMapPreloadViews,
  MapPreloadView,
} from "@/lib/mapPreloadRegistry";
import { ensureMapTilerLayers } from "@/lib/mapTilerLayers";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

/* Singleton innerhalb eines Browser-Tabs */
let warmed = false;
let warmMap: mapboxgl.Map | null = null;
let warmPromise: Promise<void> | null = null;

const defaultView: MapPreloadView = {
  lng: 0,
  lat: 90,
  zoom: 1.3,
  pitch: 0,
  bearing: 0,
};

const waitForIdle = (map: mapboxgl.Map) =>
  new Promise<void>((resolve) => {
    if (!map) return resolve();
    map.once("idle", () => resolve());
  });

const waitForStyle = (map: mapboxgl.Map) =>
  new Promise<void>((resolve) => {
    if (!map) return resolve();
    if (map.isStyleLoaded()) {
      resolve();
      return;
    }
    map.once("style.load", () => resolve());
  });

const preloadImage = (src: string) =>
  new Promise<void>((resolve) => {
    if (typeof Image === "undefined") return resolve();
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });

let imagesWarmed = false;
let imageWarmPromise: Promise<void> | null = null;

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

/** externe Helper-Fn für page.tsx  */
export async function preloadTiles(): Promise<void> {
  if (warmed) return;
  if (warmPromise) return warmPromise;

  return new Promise((resolve) => {
    const check = () => {
      if (warmed) {
        resolve();
        return;
      }
      if (warmPromise) {
        warmPromise.finally(() => resolve());
        return;
      }
      requestAnimationFrame(check);
    };
    check();
  });
}

export default function MapboxPreloader() {
  const { i18n } = useTranslation();
  const initialLanguage = useRef(i18n.language);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (warmPromise || !box.current) return;

    /* 1 — Worker + WebGL Kontext booten */
    mapboxgl.prewarm?.();

    const registeredViews = getRegisteredMapPreloadViews();
    const warmViews = registeredViews.length ? registeredViews : [defaultView];

    const first = warmViews[0] ?? defaultView;

    /* 2 — Unsichtbare Karte anlegen */
    warmMap = new mapboxgl.Map({
      container: box.current,
      style: `mapbox://styles/mapbox/satellite-streets-v12?language=${initialLanguage.current}`,
      center: [first.lng, first.lat],
      zoom: first.zoom,
      pitch: first.pitch ?? 0,
      bearing: first.bearing ?? 0,
      interactive: false,
      attributionControl: false,
      maxPitch: 85,
    });

    let cancelled = false;

    const runWarmup = async () => {
      try {
        await waitForStyle(warmMap!);
        if (cancelled) return;

        ensureMapTilerLayers(warmMap!);

        // warm initial viewpoint
        await waitForIdle(warmMap!);
        if (cancelled) return;

        for (const view of warmViews.slice(1)) {
          warmMap!.jumpTo({
            center: [view.lng, view.lat],
            zoom: view.zoom,
            pitch: view.pitch ?? 0,
            bearing: view.bearing ?? 0,
          });
          await waitForIdle(warmMap!);
          if (cancelled) return;
        }

        await preloadMapImages();
        if (cancelled) return;
      } finally {
        if (!cancelled) {
          warmed = true;
        }
      }
    };

    warmPromise = runWarmup();
    warmPromise.catch((err) => {
      if (process.env.NODE_ENV !== "production") {
        console.error("Mapbox warmup failed", err);
      }
    });

    return () => {
      cancelled = true;
      warmMap?.remove();
      warmMap = null;
      warmPromise = null;
    };
  }, []);

  /* Update language when i18n changes */
  useEffect(() => {
    if (!warmMap || !warmed) return;
    
    // Same language update logic as MapFlyScene
    const languageMap: { [key: string]: string } = {
      'de': 'de',
      'en': 'en',
      'fr': 'fr',
      'es': 'es',
      'it': 'it',
      'ja': 'ja',
      'ko': 'ko',
      'zh': 'zh-Hans',
      'ru': 'ru'
    };

    const mapLanguage = languageMap[i18n.language] || 'en';
    
    warmMap.getStyle().layers?.forEach((layer) => {
      if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
        const textField = layer.layout['text-field'];
        
        if (typeof textField === 'string' && textField.includes('name')) {
          warmMap!.setLayoutProperty(
            layer.id,
            'text-field',
            ['coalesce',
              ['get', `name:${mapLanguage}`],
              ['get', 'name_international'],
              ['get', 'name']
            ]
          );
        }
      }
    });
  }, [i18n.language]);

  /* 1 × 1 px, komplett unsichtbar */
  return (
    <div
      ref={box}
      style={{
        position : "fixed",
        inset    : 0,
        width    : 1,
        height   : 1,
        overflow : "hidden",
        pointerEvents: "none",
      }}
    />
  );
}
