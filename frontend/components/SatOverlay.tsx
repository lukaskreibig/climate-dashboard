/* ------------------------------------------------------------------
   SatOverlay.tsx · attaches two rasters to an EXISTING Mapbox map
   (safe version – no more getOwnSource errors)
------------------------------------------------------------------ */
"use client";

import { forwardRef, useImperativeHandle, useEffect } from "react";
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

/* ------------------------------------------------------------------ */
const SatOverlay = forwardRef<SatOverlayApi, Props>(function SatOverlay(
  { mapRef, rawImg, maskImg, coords, pad = 0 },
  ref
) {
  /* optional padding lets you enlarge/shrink the quad on the fly */
  const padded = coords.map(([lng, lat]) => [
    lng + (lng < 0 ? -pad : pad),
    lat + (lat < 0 ? -pad : pad),
  ]) as typeof coords;

  /* ----------------------------------------------------------------
     1 ▸ add sources & layers exactly ONCE (when style ready)
  ---------------------------------------------------------------- */
  useEffect(() => {
    let frame = 0;
    let cleanup: (() => void) | undefined;

    const mount = (map: mapboxgl.Map) => {
      const addLayers = () => {
        /* guard against hot-reload: layer might be there already */
        if (map.getSource("sr-raw")) {
          reset();
          return;
        }

        map.addSource("sr-raw", {
          type: "image",
          url: rawImg,
          coordinates: padded,
        });
        map.addSource("sr-mask", {
          type: "image",
          url: maskImg,
          coordinates: padded,
        });

        map.addLayer({
          id: "sr-raw",
          type: "raster",
          source: "sr-raw",
          paint: { "raster-opacity": 0 },
        });
        map.addLayer({
          id: "sr-mask",
          type: "raster",
          source: "sr-mask",
          paint: { "raster-opacity": 0 },
        });
        reset();
      };

      map.isStyleLoaded() ? addLayers() : map.once("style.load", addLayers);

      // climb up from the Mapbox container to the nearest <section data-scene=…>
      let trig: ScrollTrigger | undefined;
      const host = map.getContainer().parentElement?.closest("section");
      if (host) {
        trig = ScrollTrigger.create({
          trigger: host,
          start: "top bottom",
          onEnter: reset,
          onEnterBack: reset,
        });
      }

      return () => {
        trig?.kill();
        if (!map.style || !map.style.loaded()) return; // map already disposed
        if (map.getLayer("sr-mask")) {
          map.removeLayer("sr-mask");
          map.removeSource("sr-mask");
        }
        if (map.getLayer("sr-raw")) {
          map.removeLayer("sr-raw");
          map.removeSource("sr-raw");
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
  }, [mapRef, rawImg, maskImg, padded]);

  /* ----------------------------------------------------------------
     3 ▸ expose a tiny GSAP-driven state machine (0,1,2)
  ---------------------------------------------------------------- */
  const opacityProxy = (layer: string) => ({
    get value() {
      const m = mapRef.current?.getMap();
      return (m?.getPaintProperty(layer, "raster-opacity") as number) ?? 0;
    },
    set value(v: number) {
      const m = mapRef.current?.getMap();
      if (m && m.getLayer(layer))
        m.setPaintProperty(layer, "raster-opacity", v);
    },
  });
  
   /** force-hide both rasters ⇒ 'stage 0' */
  const reset = () => {
    const m = mapRef.current?.getMap();
    if (!m) return;
    if (m.getLayer("sr-raw"))  m.setPaintProperty("sr-raw",  "raster-opacity", 0);
    if (m.getLayer("sr-mask")) m.setPaintProperty("sr-mask", "raster-opacity", 0);
  };

  useImperativeHandle(ref, () => ({
    /** stage 0 = only basemap, 1 = +raw, 2 = +mask */
    showStage(stage) {
      gsap.timeline({ defaults:{ duration:0.6, ease:"power2.out" } })
        .to(opacityProxy("sr-raw"),  { value: stage > 0 ? 1 : 0 }, 0)
        .to(opacityProxy("sr-mask"), { value: stage === 2 ? 1 : 0 }, 0);
    },
  }), [mapRef]);

  return null;   // render nothing – this is just a side-effect helper
});

SatOverlay.displayName = "SatOverlay";
export default SatOverlay;
