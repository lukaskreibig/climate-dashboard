/* ------------------------------------------------------------------
   SatelliteScene.tsx · MapFlyScene + SatOverlay wrapper
------------------------------------------------------------------ */
"use client";

import { forwardRef, useRef, useImperativeHandle } from "react";
import MapFlyScene, { Waypoint, MapFlyApi } from "./MapFlyScene";
import SatOverlay, { SatOverlayApi } from "./SatOverlay";

type Coord = [number, number];

interface Props {
  waypoints : Waypoint[];
  rawImg    : string;
  maskImg   : string;
  coords    : [Coord, Coord, Coord, Coord];
}

export type SatelliteSceneApi = MapFlyApi & SatOverlayApi;

const SatelliteScene = forwardRef<SatelliteSceneApi, Props>(
  ({ waypoints, rawImg, maskImg, coords }, ref) => {

    /** the single MapFlyScene instance already on-screen */
    const mapRef     = useRef<MapFlyApi & { getMap: () => mapboxgl.Map | undefined }>(null);
    const overlayRef = useRef<SatOverlayApi>(null);

    /* merge both methods for ChartScene caption actions */
    useImperativeHandle(ref, () => ({
      go:         (i) => mapRef.current?.go(i),
      showStage:  (s) => overlayRef.current?.showStage(s),
    }));

    return (
      <>
        <MapFlyScene ref={mapRef} waypoints={waypoints} />
        <SatOverlay
          ref={overlayRef}
          mapRef={mapRef}
          rawImg={rawImg}
          maskImg={maskImg}
          coords={coords}
        />
      </>
    );
});

SatelliteScene.displayName = "SatelliteScene";
export default SatelliteScene;
