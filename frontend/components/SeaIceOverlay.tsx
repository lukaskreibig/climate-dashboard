/* NASA sea-ice overlay via WMS – DAILY Sea-Ice Index (NH, 25 km) */
"use client";

import { forwardRef, useEffect, useImperativeHandle } from "react";
import mapboxgl from "mapbox-gl";

/* ---------- public (imperative) API ------------------------- */
export interface SeaIceApi {
  show: (year: 2017 | 2021 | 2024 | "none") => void;
}

interface Props {
  mapRef: React.RefObject<{ getMap: () => mapboxgl.Map | undefined }>;
  quad: [
    [number, number], [number, number],
    [number, number], [number, number]
  ];
}

/* ---------- helper: WMS GetMap URL -------------------------- */
/*  ‣ layer really exists → confirmed in GetCapabilities docs :contentReference[oaicite:0]{index=0}
    ‣ WMS 1.1.1 keeps Lon/Lat order, so BBOX = lonMin,latMin,lonMax,latMax
    ‣ ≤2 000 px per side keeps GIBS happy (larger → 400 / 500 errors) */
const wmsUrl = (date: string): string =>
  "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
+ "?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1"
+ "&LAYERS=Sea_Ice_Index_Concentration_NH"      // ← real layer id
+ "&STYLES=default"
+ "&FORMAT=image/png&TRANSPARENT=true"
+ "&SRS=EPSG:4326"
+ "&BBOX=-180,60,180,90"
+ "&WIDTH=2000&HEIGHT=1000"
+ `&TIME=${date}`;

/* three snapshots we need in the story */
const yearUrls: Record<2017 | 2021 | 2024, string> = {
  2017: wmsUrl("2017-03-01"),
  2021: wmsUrl("2021-03-01"),
  2024: wmsUrl("2024-03-01"),
};

/* ---------- component --------------------------------------- */
const SeaIceOverlay = forwardRef<SeaIceApi, Props>(function SeaIceOverlay(
  { mapRef, quad }, ref
) {

  /* add sources + layers once -------------------------------- */
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const addLayers = () => {
      (Object.entries(yearUrls) as [keyof typeof yearUrls, string][])
        .forEach(([year, url]) => {
          const srcId = `ice-${year}`;

          if (!map.getSource(srcId)) {
            map.addSource(srcId, { type: "image", url, coordinates: quad });
          }
          if (!map.getLayer(srcId)) {
            map.addLayer({ id: srcId, type: "raster", source: srcId,
                           paint: { "raster-opacity": 0 } });
          }
        });
    };

    map.isStyleLoaded() ? addLayers() : map.once("style.load", addLayers);
  }, [mapRef, quad]);

  /* imperative fade-toggle ----------------------------------- */
  useImperativeHandle(ref, () => ({
    show: (year) => {
      (Object.keys(yearUrls) as (keyof typeof yearUrls)[]).forEach((y) => {
        const opacity = year === y ? 1 : 0;
        mapRef.current?.getMap()?.setPaintProperty(`ice-${y}`,
                                                   "raster-opacity", opacity);
      });
    }
  }), [mapRef]);

  return null;          // ↩ nothing visual in the React tree
});

export default SeaIceOverlay;
