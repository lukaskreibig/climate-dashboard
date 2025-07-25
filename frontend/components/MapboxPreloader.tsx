/* ------------------------------------------------------------------
   components/MapboxPreloader.tsx
   – builds an *invisible* map once, as soon as the page mounts.
     All fonts, shaders, style JSON, and the very first satellite
     tiles are fetched and live in the browser cache afterwards.
------------------------------------------------------------------ */
"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

/* keep one singleton map instance per tab – even if the
   Preloader is mounted/un-mounted several times */
let warmed = false;
let warmMap: mapboxgl.Map | null = null;

export default function MapboxPreloader() {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (warmed || !box.current) return;

    /** 1 ▸ spin up workers + core libs (Mapbox helper) */
    if (mapboxgl.prewarm) mapboxgl.prewarm();

    /** 2 ▸ create a *real* map (fully off-screen) */
    warmMap = new mapboxgl.Map({
      container : box.current,
      /** same style you’ll use later */
      style     : "mapbox://styles/mapbox/satellite-streets-v12",
      center    : [ 0, 90 ],   // any point is fine – we only cache resources
      zoom      : 1.3,
      interactive: false,
      attributionControl: false,
    });

    /** 3 ▸ once the first frame is rendered we’re done */
    warmMap.once("idle", () => {
      warmed = true;
      // don’t remove the map – keeping it around means the workers
      // and WebGL context stay warm for later scenes
    });

    return () => {
      /** never destroy this map – it has done its job */
    };
  }, []);

  /** absolutely invisible, but present in the DOM */
  return (
    <div
      ref={box}
      style={{
        position : "fixed",
        width    : 1,
        height   : 1,
        overflow : "hidden",
        top      : 0,
        left     : 0,
        pointerEvents: "none",
      }}
    />
  );
}
