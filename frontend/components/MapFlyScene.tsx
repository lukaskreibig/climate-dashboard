/* ------------------------------------------------------------------
   MapFlyScene.tsx · Mapbox fly-over with MapTiler Satellite-v2 & DEM
------------------------------------------------------------------ */
"use client";

import {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

/* ——— types ——— */
export interface Waypoint {
  lng: number;
  lat: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}
export interface MapFlyApi {
  go: (idx: number) => void;
}
interface Props {
  waypoints: Waypoint[];
  flySpeed?: number;     // default 0.5
  className?: string;
  terrain?: boolean;     // default true
  noop?: boolean;
}

/* ——— component ——— */
const MapFlyScene = forwardRef<MapFlyApi, Props>(function MapFlyScene(
  { waypoints, flySpeed = 0.5, className = "", terrain = true },
  ref
) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map>();

  /* 1 ▸ build map once ----------------------------------------------- */
  useEffect(() => {
    if (!box.current) return;

    map.current = new mapboxgl.Map({
      container: box.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [waypoints[0].lng, waypoints[0].lat],
      zoom: waypoints[0].zoom,
      pitch: waypoints[0].pitch ?? 0,
      bearing: waypoints[0].bearing ?? 0,
      interactive: false,
      attributionControl: false,
      maxPitch: 85,
    });

    map.current.on("style.load", () => {
      /* a) remove Mapbox water-fill layers so raster stays visible */
      map.current!
        .getStyle()
        .layers?.filter((l) => l.id.startsWith("water"))
        .forEach((l) => map.current!.removeLayer(l.id));

      /* b) add MapTiler Satellite-v2 raster --------------------- */
      if (!map.current!.getSource("mt-sat")) {
        const hires   = window.devicePixelRatio > 1;
        const scaleQS = hires ? "&scale=2" : "";     // <<< retina fix
        map.current!.addSource("mt-sat", {
          type: "raster",
          tiles: [
            `https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=` +
            `${process.env.NEXT_PUBLIC_MAPTILER_KEY}${scaleQS}`,
          ],
          tileSize: 256,        // keep 256 even on Hi-DPI; scale=2 doubles pixels
          maxzoom: 14,
          attribution: "© MapTiler © OpenStreetMap",
        });
      }

      const firstSymbol = map.current!
        .getStyle()
        .layers?.find((l) => l.type === "symbol")?.id;

      if (!map.current!.getLayer("mt-sat")) {
        map.current!.addLayer(
          { id: "mt-sat", type: "raster", source: "mt-sat" },
          firstSymbol
        );
      }

      /* c) optional 3-D terrain -------------------------------- */
      if (terrain && !map.current!.getSource("mt-dem")) {
        map.current!.addSource("mt-dem", {
          type: "raster-dem",
          url:
            `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=` +
            process.env.NEXT_PUBLIC_MAPTILER_KEY,
          tileSize: 256,
        });
        map.current!.setTerrain({ source: "mt-dem", exaggeration: 1.3 });
      }
    });

    return () => map.current?.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 2 ▸ expose fly-to API to captions -------------------------- */
  useImperativeHandle(
    ref,
    () => ({
      go: (idx: number) => {
                const wp = waypoints[idx] ?? waypoints[0];
        if (!wp || wp.noop) return;           // ← NEW: „nothing happens“

        map.current?.flyTo({
          center: [wp.lng, wp.lat],
          zoom:   wp.zoom,
          pitch:  wp.pitch   ?? map.current!.getPitch(),
          bearing:wp.bearing ?? map.current!.getBearing(),
          speed:  flySpeed,
        });
      },
    }),
    [waypoints, flySpeed]
  );

  return (
    <div
      ref={box}
      className={`w-full h-full ${className}`}
      style={{ background: "#1e293b" }}
    />
  );
});

export default MapFlyScene;
