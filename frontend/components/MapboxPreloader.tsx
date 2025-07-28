/* ------------------------------------------------------------------
   MapboxPreloader.tsx   – einmal pro Tab die Mapbox-Runtime vorwärmen
------------------------------------------------------------------ */
"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

/* Singleton innerhalb eines Browser-Tabs */
let warmed   = false;
let warmMap: mapboxgl.Map | null = null;

/** externe Helper-Fn für page.tsx  */
export async function preloadTiles(): Promise<void> {
  return new Promise(res => {
    if (warmed) return res();           // schon erledigt
    const check = () => warmed ? res() : requestAnimationFrame(check);
    check();
  });
}

export default function MapboxPreloader() {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (warmed || !box.current) return;

    /* 1 — Worker + WebGL Kontext booten */
    mapboxgl.prewarm?.();

    /* 2 — Unsichtbare Karte anlegen */
    warmMap = new mapboxgl.Map({
      container : box.current,
      style     : "mapbox://styles/mapbox/satellite-streets-v12",
      center    : [0, 90],
      zoom      : 1.3,
      interactive: false,
      attributionControl: false,
    });

    /* 3 — Erstes ‘idle’ ⇒ alles Wesentliche ist gecacht  */
    warmMap.once("idle", () => { warmed = true; });
  }, []);

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
