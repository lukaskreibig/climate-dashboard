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
import { ensureMapTilerLayers } from "@/lib/mapTilerLayers";
import { prefersReducedMotion } from "@/lib/reducedMotion";
import {
  applyMapLanguage,
  claimWarmedMap,
  preloadTiles,
  releaseWarmedMap,
} from "@/lib/mapboxWarmup";

gsap.registerPlugin(ScrollTrigger);
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

/* ——— scroll-linked camera helpers ——— */
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpAngle = (a: number, b: number, t: number) => {
  const d = ((b - a + 540) % 360) - 180;
  return a + d * t;
};
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

interface CamKeyframe { from: number; to: number; start: number; end: number }

/** Build a hold→move→hold keyframe timeline; the final descent is the longest
 *  (a slow "landing"), followed by a settle hold. */
function buildKeyframes(n: number): CamKeyframe[] {
  const HOLD = 0.5;
  const MOVE = 1;
  const raw: { from: number; to: number; w: number }[] = [{ from: 0, to: 0, w: HOLD }];
  for (let i = 0; i < n - 1; i++) {
    raw.push({ from: i, to: i + 1, w: i === n - 2 ? MOVE * 1.7 : MOVE });
    raw.push({ from: i + 1, to: i + 1, w: HOLD });
  }
  const total = raw.reduce((acc, s) => acc + s.w, 0);
  let acc = 0;
  return raw.map((s) => {
    const start = acc / total;
    acc += s.w;
    return { from: s.from, to: s.to, start, end: acc / total };
  });
}

function cameraAtProgress(wps: Waypoint[], keys: CamKeyframe[], p: number) {
  const prog = Math.max(0, Math.min(1, p));
  const k = keys.find((s) => prog >= s.start && prog < s.end) ?? keys[keys.length - 1];
  const a = wps[k.from];
  const b = wps[k.to];
  const t = k.from === k.to ? 0 : easeInOutCubic((prog - k.start) / (k.end - k.start));
  return {
    lng: lerp(a.lng, b.lng, t),
    lat: lerp(a.lat, b.lat, t),
    zoom: lerp(a.zoom, b.zoom, t),
    pitch: lerp(a.pitch ?? 0, b.pitch ?? 0, t),
    bearing: lerpAngle(a.bearing ?? 0, b.bearing ?? 0, t),
  };
}

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
  { waypoints, flySpeed = 0.5, className = "", terrain = true, preloadKey, scrollCamera = false, globe = false, cameraEnd = 1, onProgress },
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
        ensureMapTilerLayers(instance, { terrain });
        applyMapLanguage(instance, i18n.language);
        if (globe) {
          try {
            instance.setProjection("globe");
          } catch {
            /* projection unsupported — falls back to mercator */
          }
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

  /* ═════════════════ scroll-linked camera ═════════════════ */
  useEffect(() => {
    if (!scrollCamera || !ready || prefersReducedMotion()) return;
    const section = box.current?.closest<HTMLElement>("[data-scene]");
    if (!section) return;

    const keys = buildKeyframes(waypoints.length);
    const apply = (p: number) => {
      const m = map.current;
      if (!m) return;
      // camera finishes its ascent by `cameraEnd`, then holds while a later
      // beat (ice retreat) drives the remaining scroll.
      const cp = cameraEnd >= 1 ? p : Math.min(1, p / cameraEnd);
      const cam = cameraAtProgress(waypoints, keys, cp);
      m.jumpTo({
        center: [cam.lng, cam.lat],
        zoom: cam.zoom,
        pitch: cam.pitch,
        bearing: cam.bearing,
      });
      onProgressRef.current?.(p);
    };

    scrubActive.current = true;
    orbitDegPerSec.current = 0;
    apply(0);
    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.8,
      onUpdate: (self) => apply(self.progress),
    });

    return () => {
      st.kill();
      scrubActive.current = false;
    };
  }, [scrollCamera, ready, waypoints, cameraEnd]);

  /* ═════════════════ expose API ═════════════════ */
  useImperativeHandle(
    ref,
    () => ({
      go(idx: number) {
        if (scrubActive.current) return; // scroll-linked camera owns the camera
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
