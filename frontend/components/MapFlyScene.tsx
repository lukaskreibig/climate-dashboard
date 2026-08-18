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
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "mapbox-gl/dist/mapbox-gl.css";
import { ensureBasemapLayers } from "@/lib/basemapLayers";
import {
  FLIGHT_RAMP_IN,
  FLIGHT_RAMP_OUT,
  FLIGHT_SETTLE,
  buildFlightTimeline,
  buildKeyframes,
  cameraAtProgress,
  easeEnds,
} from "@/lib/flightPath";
import type { Waypoint } from "@/lib/flightPath";
export type { Waypoint } from "@/lib/flightPath";

import { prefersReducedMotion } from "@/lib/reducedMotion";
import {
  applyMapLanguage,
  claimWarmedMap,
  preloadTiles,
  releaseWarmedMap,
} from "@/lib/mapboxWarmup";

gsap.registerPlugin(ScrollTrigger);
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

/* the camera path lives in lib/flightPath.ts: arithmetic, and testable there */

/* ——— types ——— */

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
  /**
   * Fly the whole scene as one continuous move: no standstill between waypoints,
   * one acceleration at the start and one deceleration at the end. Off by
   * default, because the globe scene is choreographed against the holds.
   */
  continuousFlight?: boolean;
  /** drive the camera continuously from scroll instead of discrete flyTo hops */
  scrollCamera?: boolean;
  /** render on a 3-D globe (setProjection) — for the whole-Arctic pull-back */
  globe?: boolean;
  /** scroll fraction at which the camera reaches its final waypoint and then
   *  holds (0–1, default 1). Lets a later beat (e.g. ice retreat) own the rest. */
  cameraEnd?: number;
  /** raw scroll progress (0–1) of the scroll-linked camera, for sibling beats */
  onProgress?: (p: number) => void;
}

/* ——— component ——— */
const MapFlyScene = forwardRef<MapFlyApi, Props>(function MapFlyScene(
  { waypoints, flySpeed = 0.5, className = "", terrain = true, preloadKey, scrollCamera = false, globe = false, cameraEnd = 1, onProgress, continuousFlight = false },
  ref
) {
  const { i18n } = useTranslation();
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const usedWarmedMap = useRef(false);
  const scrubActive = useRef(false);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
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
        ensureBasemapLayers(instance, { terrain });
        applyMapLanguage(instance, i18n.language);
        if (globe) {
          try {
            instance.setProjection("globe");
          } catch {
            /* projection unsupported — falls back to mercator */
          }
        }
        try {
          // real atmosphere: thin blue rim on the globe, horizon haze on the
          // terrain approach, faint stars in space. space-color matches the
          // scenes' #020617 background so the canvas blends into the page.
          instance.setFog({
            color: "rgb(186, 210, 235)",
            "high-color": "rgb(36, 92, 223)",
            "horizon-blend": globe ? 0.03 : 0.06,
            "space-color": "rgb(2, 6, 23)",
            "star-intensity": globe ? 0.45 : 0.15,
          });
        } catch {
          /* fog unsupported — map still renders */
        }
      };

      instance.on("style.load", styleLoadHandler);
      if (instance.isStyleLoaded()) {
        styleLoadHandler();
      }

      if (instance.loaded()) {
        markReady();
      } else {
        instance.once("idle", markReady);
        // "idle" waits for every tile — on slow connections that can keep the
        // whole scene (scroll camera, overlays) inert for seconds. The style
        // is usable long before that, so force readiness after a grace period.
        window.setTimeout(markReady, 3500);
      }
    };

    buildMap();

    // Held now, while it is still the node this effect was set up for. Read in
    // the cleanup it is whatever the ref points at by then, which on a fast
    // route change is somebody else's div.
    const boxAtSetup = box.current;

    return () => {
      cancelled = true;
      const instance = map.current;
      if (instance && styleLoadHandler) {
        instance.off("style.load", styleLoadHandler);
      }
      if (usedWarmedMap.current) {
        releaseWarmedMap(preloadKey, boxAtSetup);
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

  /* ═════════════════ scroll-linked camera ═════════════════ */
  useEffect(() => {
    if (!scrollCamera || !ready || prefersReducedMotion()) return;
    const section = box.current?.closest<HTMLElement>("[data-scene]");
    if (!section) return;

    // A settle at the end either way: the last frame has to stand still for a
    // beat before the story cuts to the photograph taken from that spot.
    const keys = continuousFlight
      ? buildFlightTimeline(waypoints)
      : buildKeyframes(waypoints.length);
    // while the globe holds and the decades pass, let the Earth keep turning:
    // a slow, scroll-driven bearing drift (scrub-safe and fully reversible)
    const HOLD_SPIN_DEG = 35;
    const apply = (p: number) => {
      const m = map.current;
      if (!m) return;
      // camera finishes its ascent by `cameraEnd`, then holds while a later
      // beat (ice retreat) drives the remaining scroll.
      const cp = cameraEnd >= 1 ? p : Math.min(1, p / cameraEnd);
      // The settle comes off the raw scroll first, then the flight is eased over
      // what is left. Easing first would have the ease compress the settle too.
      const flight = Math.min(1, cp / (1 - FLIGHT_SETTLE));
      const cam = cameraAtProgress(
        waypoints,
        keys,
        continuousFlight ? easeEnds(flight, FLIGHT_RAMP_IN, FLIGHT_RAMP_OUT) : cp,
        continuousFlight,
      );
      const spin =
        globe && cameraEnd < 1 && p > cameraEnd
          ? ((p - cameraEnd) / (1 - cameraEnd)) * HOLD_SPIN_DEG
          : 0;
      m.jumpTo({
        center: [cam.lng, cam.lat],
        zoom: cam.zoom,
        pitch: cam.pitch,
        bearing: cam.bearing + spin,
        padding: { top: cam.padTop * m.getCanvas().clientHeight, bottom: 0, left: 0, right: 0 },
      });
      onProgressRef.current?.(p);
    };

    scrubActive.current = true;
    orbitDegPerSec.current = 0;
    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.8,
      onUpdate: (self) => apply(self.progress),
    });
    // catch up to wherever the reader already is — the map often finishes
    // loading mid-scene, and without this the camera sticks at waypoint 0
    // until the next scroll event
    apply(st.progress);

    return () => {
      st.kill();
      scrubActive.current = false;
    };
  }, [scrollCamera, ready, waypoints, cameraEnd, globe, continuousFlight]);

  /* ═════════════════ expose API ═════════════════ */
  useImperativeHandle(
    ref,
    () => ({
      go(idx: number) {
        if (scrubActive.current) return; // scroll-linked camera owns the camera
        const wp = waypoints[idx] ?? waypoints[0];
        if (!wp) return;

        const canvasHeight = map.current?.getCanvas().clientHeight ?? 0;
        map.current?.flyTo({
          center: [wp.lng, wp.lat],
          zoom: wp.zoom,
          pitch: wp.pitch ?? (map.current?.getPitch() ?? 0),
          bearing: wp.bearing ?? (map.current?.getBearing() ?? 0),
          padding: {
            top: (wp.padTop ?? 0) * canvasHeight,
            bottom: 0,
            left: 0,
            right: 0,
          },
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
