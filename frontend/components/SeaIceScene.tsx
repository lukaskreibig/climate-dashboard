"use client";
import { forwardRef, useRef, useImperativeHandle } from "react";
import mapboxgl from "mapbox-gl";
import MapFlyScene, { MapFlyApi, Waypoint } from "./MapFlyScene";
import SeaIceOverlay, { SeaIceApi } from "./SeaIceOverlay";

/* Arctic “lid” – 60–90 °N, full longitude sweep                */
const ICE_QUAD: [[number, number], [number, number], [number, number], [number, number]] = [
  [-180, 90], [180, 90],     // top edge  (lat = 90 °N)
  [180, 60], [-180, 60],     // bottom    (lat = 60 °N)
];

type Api = MapFlyApi & SeaIceApi;
interface Props { waypoints: Waypoint[]; }

export default forwardRef<Api, Props>(function SeaIceScene({ waypoints }, ref) {
  const mapRef = useRef<MapFlyApi & { getMap: () => mapboxgl.Map | undefined }>(null);
  const iceRef = useRef<SeaIceApi>(null);

  /* bubble up both imperative sub-APIs ----------------------- */
  useImperativeHandle(ref, () => ({
    go:   (i) => mapRef.current?.go(i),
    show: (y) => iceRef.current?.show(y),
  }));

  return (
    <>
      <MapFlyScene ref={mapRef} waypoints={waypoints} />
      <SeaIceOverlay ref={iceRef} mapRef={mapRef} quad={ICE_QUAD} />
    </>
  );
});
