/* ------------------------------------------------------------------
   MapboxPreloader.tsx - owns the offscreen warmup root for map scenes
------------------------------------------------------------------ */
"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  clearMapWarmupRoot,
  preloadMapImages,
  preloadTerrainTiles,
  preloadTiles,
  setMapWarmupRoot,
  setWarmMapLanguage,
  startMapWarmup,
} from "@/lib/mapboxWarmup";

export { preloadMapImages, preloadTerrainTiles, preloadTiles, startMapWarmup };

export default function MapboxPreloader() {
  const { i18n } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;

    const root = rootRef.current;
    setMapWarmupRoot(root);
    startMapWarmup({ language: i18n.language });

    return () => {
      clearMapWarmupRoot(root);
    };
    // Mount only. The language is read once to start the warm-up; the effect
    // directly below is the one that reacts to a language change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setWarmMapLanguage(i18n.language);
    startMapWarmup({ language: i18n.language });
  }, [i18n.language]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      data-mapbox-warmup-root
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        opacity: 0,
        pointerEvents: "none",
        visibility: "hidden",
        zIndex: 0,
      }}
    />
  );
}
