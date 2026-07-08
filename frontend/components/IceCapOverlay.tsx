/* ------------------------------------------------------------------
   IceCapOverlay.tsx · drapes real NSIDC September sea-ice-extent polygons
   onto the pull-back globe and cross-fades them decade by decade so the
   Arctic cap visibly retreats. Attaches to an EXISTING Mapbox map (from
   MapFlyScene) — renders nothing in the React tree.

   Vector fills (not raster images) are used because a flat image quad can't
   drape across the pole on a globe without seams. Each decade is one GeoJSON
   fill; opacities cross-fade with scroll, and the 1980 outline lingers as a
   faint halo so the lost ice stays visible.

   Data: NSIDC Sea Ice Index (G02135) 15 % extent, traced + reprojected by
   scripts/fetch-seaice.mjs → public/images/seaice/nh-YYYY-09.geojson.
------------------------------------------------------------------ */
"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import mapboxgl from "mapbox-gl";

/* ——— decade snapshots (oldest → newest) ——— */
export const ICE_DECADES = [1980, 1990, 2000, 2010, 2020, 2024] as const;
export type IceDecade = (typeof ICE_DECADES)[number];

const iceUrl = (y: IceDecade) => `/images/seaice/nh-${y}-09.geojson`;
const srcId = (y: IceDecade) => `ice-cap-${y}`;

const ICE_COLOR = "#e8f3ff"; // icy white-blue

/* progress choreography (0–1 scene scroll). The camera ascent finishes ~0.45
   (MapFlyScene cameraEnd); the cap fades in as the globe frames, retreats over
   the back half, then holds so the 2024 loss reads before the scene fades out. */
const GATE_START = 0.42;    // cap begins to fade in as the globe frames
const GATE_END = 0.54;      // fully present
const RETREAT_START = 0.56; // decade cross-fade owns the back half of the scroll
const RETREAT_END = 0.9;    // reach the latest decade, then hold before exit
const GHOST = 0.24;         // 1980 lingers faintly so the loss stays visible

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** cross-fade position across decades (0…n-1) for scene progress `p` */
const retreatPos = (p: number) =>
  clamp01((p - RETREAT_START) / (RETREAT_END - RETREAT_START)) * (ICE_DECADES.length - 1);

/** share of each decade segment spent cross-fading (the rest is a hold, so
 *  every year visibly "snaps in" instead of blurring into the next) */
const FADE_SHARE = 0.3;

/** plateau-then-fade weight for decade `i` at retreat position `f` (0…n-1) */
function decadeWeight(i: number, f: number): number {
  const seg = Math.min(ICE_DECADES.length - 1, Math.floor(f));
  const frac = f - seg;
  const fadeStart = 1 - FADE_SHARE;
  if (i === seg) return frac <= fadeStart ? 1 : 1 - (frac - fadeStart) / FADE_SHARE;
  if (i === seg + 1) return frac <= fadeStart ? 0 : (frac - fadeStart) / FADE_SHARE;
  return 0;
}

/** which decade the label should read, and whether the cap is on-screen yet */
export function decadeForProgress(p: number): { index: number; year: IceDecade; visible: boolean } {
  const f = retreatPos(p);
  const seg = Math.min(ICE_DECADES.length - 1, Math.floor(f));
  const frac = f - seg;
  // flip the label mid-cross-fade so text and cap stay in sync
  const index = Math.min(ICE_DECADES.length - 1, frac > 1 - FADE_SHARE / 2 ? seg + 1 : seg);
  return { index, year: ICE_DECADES[index], visible: p > GATE_START };
}

export interface IceCapApi {
  /** drive the cap from scene scroll progress (0–1) */
  setProgress: (p: number) => void;
  /** static end-state for reduced motion: latest cap + faint 1980 ghost */
  showLatest: () => void;
}

interface Props {
  mapRef: React.RefObject<{ getMap: () => mapboxgl.Map | undefined } | null>;
}

const IceCapOverlay = forwardRef<IceCapApi, Props>(function IceCapOverlay(
  { mapRef },
  ref
) {
  /* the map/style often finishes AFTER the user's last scroll event; remember
     the last requested state and re-apply it once the layers exist, so the cap
     shows on the first pass without needing another scroll. */
  const lastRequest = useRef<number | "latest" | null>(null);

  const setOpacities = (opacities: number[]) => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    ICE_DECADES.forEach((y, i) => {
      if (map.getLayer(srcId(y))) {
        map.setPaintProperty(srcId(y), "fill-opacity", opacities[i]);
      }
    });
  };

  const opacitiesForProgress = (p: number): number[] => {
    const gate = clamp01((p - GATE_START) / (GATE_END - GATE_START));
    const f = retreatPos(p);
    return ICE_DECADES.map((_, i) => {
      let w = decadeWeight(i, f);
      if (i === 0) w = Math.max(w, GHOST); // 1980 halo persists
      return gate * w;
    });
  };

  /* warm the browser cache so the cap polygons are instantly available
     when the layers get added mid-scroll */
  useEffect(() => {
    ICE_DECADES.forEach((y) => {
      fetch(iceUrl(y)).catch(() => {});
    });
  }, []);

  /* add sources + layers once the map/style is ready --------------- */
  useEffect(() => {
    let frame = 0;
    let boundMap: mapboxgl.Map | null = null;

    const addLayers = () => {
      const map = mapRef.current?.getMap();
      if (!map) return;
      try {
        ICE_DECADES.forEach((y) => {
          // oldest added first → newest (smaller) caps draw on top of the halo
          if (!map.getSource(srcId(y))) {
            map.addSource(srcId(y), { type: "geojson", data: iceUrl(y) });
          }
          if (!map.getLayer(srcId(y))) {
            map.addLayer({
              id: srcId(y),
              type: "fill",
              source: srcId(y),
              paint: { "fill-color": ICE_COLOR, "fill-opacity": 0, "fill-antialias": true },
            });
          }
        });
        // catch up with whatever the scroll already requested
        const req = lastRequest.current;
        if (req === "latest") {
          setOpacities(
            ICE_DECADES.map((_, i) =>
              i === ICE_DECADES.length - 1 ? 0.95 : i === 0 ? GHOST : 0
            )
          );
        } else if (typeof req === "number") {
          setOpacities(opacitiesForProgress(req));
        }
      } catch {
        frame = requestAnimationFrame(addLayers);
      }
    };

    const waitForMap = () => {
      const map = mapRef.current?.getMap();
      if (!map) {
        frame = requestAnimationFrame(waitForMap);
        return;
      }
      boundMap = map;
      map.isStyleLoaded() ? addLayers() : map.once("style.load", addLayers);
      map.on("style.load", addLayers); // re-add if the style reloads (language switch)
    };

    waitForMap();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      const map = boundMap;
      if (!map) return;
      map.off("style.load", addLayers);
      if (!map.style || !map.style.loaded()) return; // map already disposed
      ICE_DECADES.forEach((y) => {
        if (map.getLayer(srcId(y))) map.removeLayer(srcId(y));
        if (map.getSource(srcId(y))) map.removeSource(srcId(y));
      });
    };
  }, [mapRef]);

  useImperativeHandle(ref, () => ({
    setProgress(p: number) {
      lastRequest.current = p;
      setOpacities(opacitiesForProgress(p));
    },
    showLatest() {
      // latest decade full + faint 1980 ghost, everything else hidden
      lastRequest.current = "latest";
      setOpacities(
        ICE_DECADES.map((_, i) =>
          i === ICE_DECADES.length - 1 ? 0.95 : i === 0 ? GHOST : 0
        )
      );
    },
  }), [mapRef]);

  return null;
});

IceCapOverlay.displayName = "IceCapOverlay";
export default IceCapOverlay;
