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
  preloadTiles,
  setMapWarmupRoot,
  setWarmMapLanguage,
  startMapWarmup,
} from "@/lib/mapboxWarmup";

export { preloadMapImages, preloadTiles, startMapWarmup };

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
