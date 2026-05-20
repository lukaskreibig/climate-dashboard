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
import { useTranslation } from "react-i18next";
import "mapbox-gl/dist/mapbox-gl.css";
import { ensureMapTilerLayers } from "@/lib/mapTilerLayers";
import {
  applyMapLanguage,
  claimWarmedMap,
  preloadTiles,
  releaseWarmedMap,
} from "@/lib/mapboxWarmup";

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
  getMap: () => mapboxgl.Map | undefined;
}

interface Props {
  waypoints: Waypoint[];
  flySpeed?: number;     // default 0.5 (fallback when wp.flySpeed is undefined)
  className?: string;
  terrain?: boolean;     // default true
  preloadKey?: string;
}

/* ——— component ——— */
const MapFlyScene = forwardRef<MapFlyApi, Props>(function MapFlyScene(
  { waypoints, flySpeed = 0.5, className = "", terrain = true, preloadKey },
  ref
) {
  const { i18n } = useTranslation();
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const usedWarmedMap = useRef(false);
  const [ready, setReady] = useState(false);

  /* ═════════════════ build map once ═════════════════ */
  useEffect(() => {
    let cancelled = false;
    let styleLoadHandler: (() => void) | null = null;

    const buildMap = async () => {
      if (!box.current || !waypoints.length) return;

      await preloadTiles({
        language: i18n.language,
        timeoutMs: preloadKey ? 10000 : 2500,
      });
      if (cancelled || !box.current || !waypoints.length) return;

      const container = box.current;
      container.innerHTML = "";

      const first = waypoints[0];
      let instance = claimWarmedMap(preloadKey, container);

      if (instance) {
        usedWarmedMap.current = true;
        instance.jumpTo({
          center: [first.lng, first.lat],
          zoom: first.zoom,
          pitch: first.pitch ?? 0,
          bearing: first.bearing ?? 0,
        });
      } else {
        usedWarmedMap.current = false;
        instance = new mapboxgl.Map({
          container,
          style: `mapbox://styles/mapbox/satellite-streets-v12?language=${i18n.language}`,
          center: [first.lng, first.lat],
          zoom: first.zoom,
          pitch: first.pitch ?? 0,
          bearing: first.bearing ?? 0,
          interactive: false,
          attributionControl: false,
          maxPitch: 85,
        });
      }

      map.current = instance;

      const markReady = () => {
        if (!cancelled) setReady(true);
      };

      styleLoadHandler = () => {
        ensureMapTilerLayers(instance, { terrain });
        applyMapLanguage(instance, i18n.language);
      };

      instance.on("style.load", styleLoadHandler);
      if (instance.isStyleLoaded()) {
        styleLoadHandler();
      }

      if (instance.loaded()) {
        markReady();
      } else {
        instance.once("idle", markReady);
      }
    };

    buildMap();

    return () => {
      cancelled = true;
      const instance = map.current;
      if (instance && styleLoadHandler) {
        instance.off("style.load", styleLoadHandler);
      }
      if (usedWarmedMap.current) {
        releaseWarmedMap(preloadKey, box.current);
      } else {
        instance?.remove();
      }
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ═════════════════ update language when i18n changes ═════════════════ */
  useEffect(() => {
    if (!map.current || !ready) return;

    let cancelled = false;
    const instance = map.current;
    const updateLanguage = () => {
      if (cancelled) return;

      try {
        if (!applyMapLanguage(instance, i18n.language)) {
          instance.once("style.load", updateLanguage);
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Mapbox language update skipped", error);
        }
      }
    };

    updateLanguage();

    return () => {
      cancelled = true;
      instance.off("style.load", updateLanguage);
    };
  }, [i18n.language, ready]);

  /* ═════════════════ orbit engine ═════════════════ */
  const orbitDegPerSec = useRef(0);
  const lastT = useRef(performance.now());
  useEffect(() => {
    let frame = 0;
    const tick = (t: number) => {
      const dt = (t - lastT.current) / 1000;
      lastT.current = t;
      if (orbitDegPerSec.current !== 0 && map.current) {
        map.current.setBearing(
          (map.current.getBearing() + orbitDegPerSec.current * dt) % 360
        );
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
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
          pitch: wp.pitch ?? (map.current?.getPitch() ?? 0),
          bearing: wp.bearing ?? (map.current?.getBearing() ?? 0),
          speed: wp.flySpeed ?? flySpeed,
        });

        orbitDegPerSec.current = wp.orbit ?? 0; // enable / disable spin
      },

      /*  ► SatelliteScene expects this helper */
      getMap: () => map.current ?? undefined,
    }),
    [waypoints, flySpeed]
  );

  /* ═════════════════ render ═════════════════ */
  return (
    <div
      className={`map-fly-scene relative w-full h-full ${ready ? "is-ready" : ""} ${className}`}
      style={{
        backgroundColor: ready ? "transparent" : "#0f172a",
        transition: "background-color 0.6s ease-in-out",
      }}
    >
      <div ref={box} className="relative h-full w-full" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, rgba(15,23,42,0.9) 0%, rgba(10,12,24,0.96) 55%, rgba(5,7,15,1) 100%)",
          opacity: ready ? 0 : 1,
          transition: "opacity 0.45s ease-in-out",
        }}
      />

      <style jsx global>{`
        ${ready
          ? `.map-fly-scene.is-ready .mapboxgl-canvas { opacity: 1; transition: opacity .35s ease-out; }`
          : `.map-fly-scene .mapboxgl-canvas { opacity: 0; }`}
      `}</style>
    </div>
  );
});

MapFlyScene.displayName = "MapFlyScene";
export default MapFlyScene;
