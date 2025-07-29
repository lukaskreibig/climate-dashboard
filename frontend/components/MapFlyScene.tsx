/* ------------------------------------------------------------------
   MapFlyScene.tsx · Mapbox fly-over  (white-flash free)  v2
------------------------------------------------------------------ */
"use client";

import {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTranslation } from 'react-i18next';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

/* ——— types ——— */
export interface Waypoint {
  lng: number;
  lat: number;
  zoom: number;
  pitch?: number;
  bearing?: number;

  /** optional clockwise spin while we stay on this wp (° per sec) */
  orbit?: number;

  /** optional Mapbox flyTo speed for this single hop */
  flySpeed?: number;
}

/* public (unchanged) */
export interface MapFlyApi {
  go: (idx: number) => void;
}

interface Props {
  waypoints: Waypoint[];
  flySpeed?: number;     // default 0.5 (fallback when wp.flySpeed is undefined)
  className?: string;
  terrain?: boolean;     // default true
}

/* ——— component ——— */
const MapFlyScene = forwardRef<MapFlyApi, Props>(function MapFlyScene(
  { waypoints, flySpeed = 0.5, className = "", terrain = true },
  ref
) {
  const { i18n } = useTranslation();
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map>();
  const [ready, setReady] = useState(false);

  /* ═════════════════ build map once ═════════════════ */
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

    map.current.once("idle", () => setReady(true));

    map.current.on("style.load", () => {
      /* remove Mapbox water to reveal MapTiler underneath */
      map
        .current!.getStyle()
        .layers?.filter((l) => l.id.startsWith("water"))
        .forEach((l) => map.current!.removeLayer(l.id));

      /* MapTiler Satellite raster */
      if (!map.current!.getSource("mt-sat")) {
        const hires = window.devicePixelRatio > 1;
        const scaleQS = hires ? "&scale=2" : "";
        map.current!.addSource("mt-sat", {
          type: "raster",
          tiles: [
            `https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}${scaleQS}`,
          ],
          tileSize: 256,
          maxzoom: 14,
          attribution: "© MapTiler © OpenStreetMap",
        });
      }
      const firstSymbol = map
        .current!.getStyle()
        .layers?.find((l) => l.type === "symbol")?.id;
      if (!map.current!.getLayer("mt-sat")) {
        map.current!.addLayer(
          { id: "mt-sat", type: "raster", source: "mt-sat" },
          firstSymbol
        );
      }

      /* optional 3-D terrain */
      if (terrain && !map.current!.getSource("mt-dem")) {
        map.current!.addSource("mt-dem", {
          type: "raster-dem",
          url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`,
          tileSize: 256,
        });
        map.current!.setTerrain({ source: "mt-dem", exaggeration: 1.3 });
      }
    });

    return () => map.current?.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ═════════════════ update language when i18n changes ═════════════════ */
  useEffect(() => {
    if (!map.current || !ready) return;
    
    // Mapbox language mapping
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
    
    // Update text fields to use the selected language
    map.current.getStyle().layers?.forEach((layer) => {
      if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
        const textField = layer.layout['text-field'];
        
        // Only update if it's a name field
        if (typeof textField === 'string' && textField.includes('name')) {
          map.current!.setLayoutProperty(
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
  }, [i18n.language, ready]);

  /* ═════════════════ orbit engine ═════════════════ */
  const orbitDegPerSec = useRef(0);
  const lastT = useRef(performance.now());
  useEffect(() => {
    const tick = (t: number) => {
      const dt = (t - lastT.current) / 1000;
      lastT.current = t;
      if (orbitDegPerSec.current !== 0 && map.current) {
        map.current.setBearing(
          (map.current.getBearing() + orbitDegPerSec.current * dt) % 360,
          { animate: false }
        );
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  /* ═════════════════ expose API ═════════════════ */
  useImperativeHandle(
    ref,
    () => ({
      go(idx: number) {
        const wp = waypoints[idx] ?? waypoints[0];
        if (!wp) return;

        map.current?.flyTo({
          center: [wp.lng, wp.lat],
          zoom: wp.zoom,
          pitch: wp.pitch ?? map.current!.getPitch(),
          bearing: wp.bearing ?? map.current!.getBearing(),
          speed: wp.flySpeed ?? flySpeed,
        });

        orbitDegPerSec.current = wp.orbit ?? 0; // enable / disable spin
      },

      /*  ► SatelliteScene expects this helper */
      getMap: () => map.current,
    }),
    [waypoints, flySpeed]
  );

  /* ═════════════════ render ═════════════════ */
  return (
    <div
      ref={box}
      className={`relative w-full h-full ${className}`}
      style={{ background: "#0f172a" }}
    >
      {!ready && (
        <div className="absolute inset-0 bg-neutral-950 pointer-events-none" />
      )}

      <style jsx global>{`
        ${ready
          ? `.mapboxgl-canvas { opacity: 1; transition: opacity .35s ease-out; }`
          : `.mapboxgl-canvas { opacity: 0; }`}
      `}</style>
    </div>
  );
});

MapFlyScene.displayName = "MapFlyScene";
export default MapFlyScene;