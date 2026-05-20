/* ------------------------------------------------------------------
   SatelliteScene.tsx · MapFlyScene + SatOverlay wrapper
------------------------------------------------------------------ */
"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import MapFlyScene, { Waypoint, MapFlyApi } from "./MapFlyScene";
import SatOverlay, { SatOverlayApi } from "./SatOverlay";

type Coord = [number, number];

interface Props {
  waypoints : Waypoint[];
  rawImg    : string;
  maskImg   : string;
  coords    : [Coord, Coord, Coord, Coord];
  preloadKey?: string;
}

export type SatelliteSceneApi = MapFlyApi & SatOverlayApi;

const SatelliteScene = forwardRef<SatelliteSceneApi, Props>(
  ({ waypoints, rawImg, maskImg, coords, preloadKey }, ref) => {

    /** the single MapFlyScene instance already on-screen */
    const mapRef     = useRef<MapFlyApi>(null);
    const overlayRef = useRef<SatOverlayApi>(null);
    const pendingWaypoint = useRef<number | null>(null);
    const pendingStage = useRef<0 | 1 | 2 | null>(null);
    const flushFrame = useRef<number | null>(null);

    const flushQueued = useCallback(() => {
      let complete = true;

      if (pendingWaypoint.current !== null) {
        if (mapRef.current?.getMap()) {
          mapRef.current.go(pendingWaypoint.current);
          pendingWaypoint.current = null;
        } else {
          complete = false;
        }
      }

      if (pendingStage.current !== null) {
        if (overlayRef.current) {
          overlayRef.current.showStage(pendingStage.current);
          pendingStage.current = null;
        } else {
          complete = false;
        }
      }

      return complete;
    }, []);

    const scheduleFlush = useCallback(() => {
      if (flushFrame.current !== null) return;

      let attempts = 0;
      const tick = () => {
        attempts += 1;
        if (!flushQueued() && attempts < 600) {
          flushFrame.current = requestAnimationFrame(tick);
          return;
        }
        flushFrame.current = null;
      };

      flushFrame.current = requestAnimationFrame(tick);
    }, [flushQueued]);

    useEffect(() => {
      scheduleFlush();
      return () => {
        if (flushFrame.current !== null) {
          cancelAnimationFrame(flushFrame.current);
        }
      };
    }, [scheduleFlush]);

    /* merge both methods for ChartScene caption actions */
    useImperativeHandle(ref, () => ({
      go: (i) => {
        pendingWaypoint.current = i;
        if (!flushQueued()) scheduleFlush();
      },
      getMap: () => mapRef.current?.getMap(),
      showStage: (s) => {
        pendingStage.current = s;
        if (!flushQueued()) scheduleFlush();
      },
    }), [flushQueued, scheduleFlush]);

    return (
      <>
        <MapFlyScene ref={mapRef} waypoints={waypoints} preloadKey={preloadKey} />
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
