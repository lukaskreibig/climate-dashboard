/* ------------------------------------------------------------------
   SatOverlay.tsx · attaches two rasters to an EXISTING Mapbox map
   (safe version – no more getOwnSource errors)
------------------------------------------------------------------ */
"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import mapboxgl from "mapbox-gl";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

/* ——— helpers ——— */
type Coord = [number, number];          // [lng, lat]
interface MapGetter { getMap: () => mapboxgl.Map | undefined }

/* ——— props ——— */
interface Props {
  mapRef  : React.RefObject<MapGetter | null>;       // comes from MapFlyScene
  rawImg  : string;
  maskImg : string;
  coords  : [Coord, Coord, Coord, Coord];            // ↖ ↗ ↘ ↙ —in that order
  pad?    : number;                                 // tiny debug padding (°)
}

/* ——— overlay API ——— */
export interface SatOverlayApi { showStage: (s: 0 | 1 | 2) => void }

const RAW_SOURCE = "sr-raw";
const MASK_SOURCE = "sr-mask";
const RAW_LAYER = "sr-raw";
const MASK_LAYER = "sr-mask";

/* ------------------------------------------------------------------ */
const SatOverlay = forwardRef<SatOverlayApi, Props>(function SatOverlay(
  { mapRef, rawImg, maskImg, coords, pad = 0 },
  ref
) {
  /* optional padding lets you enlarge/shrink the quad on the fly */
  const padded = useMemo(
    () =>
      coords.map(([lng, lat]) => [
        lng + (lng < 0 ? -pad : pad),
        lat + (lat < 0 ? -pad : pad),
      ]) as typeof coords,
    [
      coords[0][0],
      coords[0][1],
      coords[1][0],
      coords[1][1],
      coords[2][0],
      coords[2][1],
      coords[3][0],
      coords[3][1],
      pad,
    ]
  );

  const requestedStage = useRef<0 | 1 | 2>(0);
  const activeTween = useRef<gsap.core.Timeline | null>(null);

  const opacityProxy = useCallback(
    (layer: string) => ({
      get value() {
        const m = mapRef.current?.getMap();
        return (m?.getPaintProperty(layer, "raster-opacity") as number) ?? 0;
      },
      set value(v: number) {
        const m = mapRef.current?.getMap();
        if (m?.getLayer(layer)) {
          m.setPaintProperty(layer, "raster-opacity", v);
        }
      },
    }),
    [mapRef]
  );

  const applyStage = useCallback(
    (stage: 0 | 1 | 2, animate = true) => {
      requestedStage.current = stage;

      const map = mapRef.current?.getMap();
      if (!map?.getLayer(RAW_LAYER) || !map.getLayer(MASK_LAYER)) return;
      const host = map.getContainer().parentElement?.closest("section");
      if (host instanceof HTMLElement) {
        host.dataset.satOverlayReady = "true";
        host.dataset.satOverlayStage = String(stage);
      }

      const rawOpacity = stage > 0 ? 1 : 0;
      const maskOpacity = stage === 2 ? 1 : 0;

      activeTween.current?.kill();
      if (!animate) {
        map.setPaintProperty(RAW_LAYER, "raster-opacity", rawOpacity);
        map.setPaintProperty(MASK_LAYER, "raster-opacity", maskOpacity);
        return;
      }

      activeTween.current = gsap
        .timeline({ defaults: { duration: 0.6, ease: "power2.out" } })
        .to(opacityProxy(RAW_LAYER), { value: rawOpacity }, 0)
        .to(opacityProxy(MASK_LAYER), { value: maskOpacity }, 0);
    },
    [mapRef, opacityProxy]
  );

  /* ----------------------------------------------------------------
     1 ▸ add sources & layers exactly ONCE (when style ready)
  ---------------------------------------------------------------- */
  useEffect(() => {
    let frame = 0;
    let cleanup: (() => void) | undefined;

    const mount = (map: mapboxgl.Map) => {
      let disposed = false;
      let retryFrame = 0;

      const scheduleAddLayers = () => {
        if (disposed || retryFrame) return;
        retryFrame = requestAnimationFrame(() => {
          retryFrame = 0;
          addLayers();
        });
      };

      const addLayers = () => {
        if (disposed) return;

        try {
          const rawSource = map.getSource(RAW_SOURCE) as
            | mapboxgl.ImageSource
            | undefined;
          const maskSource = map.getSource(MASK_SOURCE) as
            | mapboxgl.ImageSource
            | undefined;

          if (!rawSource) {
            map.addSource(RAW_SOURCE, {
              type: "image",
              url: rawImg,
              coordinates: padded,
            });
          }

          if (!maskSource) {
            map.addSource(MASK_SOURCE, {
              type: "image",
              url: maskImg,
              coordinates: padded,
            });
          }

          if (!map.getLayer(RAW_LAYER)) {
            map.addLayer({
              id: RAW_LAYER,
              type: "raster",
              source: RAW_SOURCE,
              paint: { "raster-opacity": 0 },
            });
          }
          if (!map.getLayer(MASK_LAYER)) {
            map.addLayer({
              id: MASK_LAYER,
              type: "raster",
              source: MASK_SOURCE,
              paint: { "raster-opacity": 0 },
            });
          }
        } catch {
          scheduleAddLayers();
          return;
        }

        applyStage(requestedStage.current, false);
      };

      map.on("style.load", addLayers);
      addLayers();

      // climb up from the Mapbox container to the nearest <section data-scene=…>
      let trig: ScrollTrigger | undefined;
      const host = map.getContainer().parentElement?.closest("section");
      if (host) {
        trig = ScrollTrigger.create({
          trigger: host,
          start: "top bottom",
          onEnter: () => applyStage(0, false),
          onEnterBack: () => applyStage(0, false),
        });
      }

      return () => {
        disposed = true;
        if (retryFrame) cancelAnimationFrame(retryFrame);
        trig?.kill();
        map.off("style.load", addLayers);
        if (!map.style || !map.style.loaded()) return; // map already disposed
        activeTween.current?.kill();
        if (map.getLayer(MASK_LAYER)) {
          map.removeLayer(MASK_LAYER);
        }
        if (map.getLayer(RAW_LAYER)) {
          map.removeLayer(RAW_LAYER);
        }
        if (map.getSource(MASK_SOURCE)) {
          map.removeSource(MASK_SOURCE);
        }
        if (map.getSource(RAW_SOURCE)) {
          map.removeSource(RAW_SOURCE);
        }
      };
    };

    const waitForMap = () => {
      const map = mapRef.current?.getMap();
      if (!map) {
        frame = requestAnimationFrame(waitForMap);
        return;
      }
      cleanup = mount(map);
    };

    waitForMap();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      cleanup?.();
    };
  }, [applyStage, mapRef, maskImg, padded, rawImg]);

  /* ----------------------------------------------------------------
     3 ▸ expose a tiny GSAP-driven state machine (0,1,2)
  ---------------------------------------------------------------- */
  useImperativeHandle(ref, () => ({
    /** stage 0 = only basemap, 1 = +raw, 2 = +mask */
    showStage(stage) {
      applyStage(stage);
    },
  }), [applyStage]);

  return null;   // render nothing – this is just a side-effect helper
});

SatOverlay.displayName = "SatOverlay";
export default SatOverlay;
