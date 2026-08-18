import { describe, expect, it } from "vitest";

import {
  FLIGHT_RAMP_IN,
  FLIGHT_RAMP_OUT,
  FLIGHT_SETTLE,
  buildFlightTimeline,
  cameraAtProgress,
  easeEnds,
  screenWork,
} from "@/lib/flightPath";
import type { Waypoint } from "@/lib/flightPath";

/**
 * The flight to Uummannaq is one continuous move, and that is a property worth
 * a test rather than a comment.
 *
 * It used to stop dead between every pair of waypoints: a HOLD keyframe of
 * weight 0.5 against a MOVE of 1, five times over, which put a third of the
 * scene's scroll into a camera that was not moving, and on top of that every leg
 * ran through easeInOutCubic and so braked to zero at each end. Nothing in the
 * types prevented that from coming back, so here it is measured: sample the
 * camera densely, and require it to still be travelling everywhere except the
 * settle at the very end.
 */
const WAYPOINTS: Waypoint[] = [
  { lng: 0, lat: 90, zoom: 1.3, pitch: 0 },
  { lng: -42, lat: 72, zoom: 3.3, pitch: 0, leg: 0.6 },
  { lng: -52.14, lat: 71, zoom: 7.0, pitch: 30, bearing: 95, leg: 0.6 },
  { lng: -52.136, lat: 70.709, zoom: 10, pitch: 60, bearing: 55, leg: 0.85 },
  { lng: -52.1856, lat: 70.6964, zoom: 12.65, pitch: 76, bearing: 46, leg: 1.35 },
  { lng: -52.1811, lat: 70.6931, zoom: 14.09, pitch: 85, bearing: 38, leg: 1.1 },
];

const keys = buildFlightTimeline(WAYPOINTS);
/** Exactly what MapFlyScene does: settle off the raw scroll, then ease the rest. */
const at = (p: number) =>
  cameraAtProgress(
    WAYPOINTS,
    keys,
    easeEnds(Math.min(1, p / (1 - FLIGHT_SETTLE)), FLIGHT_RAMP_IN, FLIGHT_RAMP_OUT),
    true,
  );

/**
 * How much the camera changed between two samples, measured with the SAME ruler
 * the timeline is built with. Using a different one, which the first version of
 * this test did, reports jumps that are an artefact of the ruler: raw degrees of
 * latitude mean something very different at zoom 3 and at zoom 12.
 */
const travel = (a: ReturnType<typeof at>, b: ReturnType<typeof at>) => screenWork(a, b);

describe("the flight to Uummannaq", () => {
  const N = 400;
  const steps = Array.from({ length: N }, (_, i) => {
    const p0 = i / N;
    const p1 = (i + 1) / N;
    return { p: p0, d: travel(at(p0), at(p1)) };
  });

  it("never stands still before the settle", () => {
    // Everything up to the settle has to be moving. The ramps at the two ends
    // are allowed to be slow, so the bar is "moving at all", not "moving fast".
    const flying = steps.filter((s) => s.p < 1 - FLIGHT_SETTLE - 0.02);
    const stalled = flying.filter((s) => s.d <= 1e-6);
    expect(stalled).toEqual([]);
  });

  it("never changes pace abruptly", () => {
    // Evenness is NOT the property to assert: the story deliberately rushes the
    // two wide hops so the reader is descending sooner, so the flight is
    // uneven on purpose. What must not happen is a JUMP, a step that is
    // suddenly several times the one before it, which is what a viewer reads as
    // a stutter. Speed is piecewise smooth here and changes only where one leg
    // hands over to the next, by the ratio of their weights.
    const flying = steps.filter(
      (s) => s.p > 0.02 && s.p < 1 - FLIGHT_SETTLE - 0.02 && s.d > 0,
    );
    const jumps = flying
      .slice(1)
      .map((s, i) => Math.max(s.d / flying[i].d, flying[i].d / s.d));
    // Measured at 1.60, which is the handover from the island beat to the
    // landing, where the story deliberately halves the pace. The old timeline
    // went from full speed to nothing and back at every waypoint.
    expect(Math.max(...jumps)).toBeLessThan(1.8);
  });

  it("comes to rest for the cut, and only there", () => {
    const settled = steps.filter((s) => s.p > 1 - FLIGHT_SETTLE + 0.01);
    expect(settled.length).toBeGreaterThan(0);
    expect(Math.max(...settled.map((s) => s.d))).toBeLessThan(1e-9);
  });

  it("arrives exactly on the last waypoint, which the photo cut is aimed at", () => {
    const last = WAYPOINTS[WAYPOINTS.length - 1];
    const end = at(1);
    expect(end.lng).toBeCloseTo(last.lng, 6);
    expect(end.lat).toBeCloseTo(last.lat, 6);
    expect(end.zoom).toBeCloseTo(last.zoom, 6);
    expect(end.pitch).toBeCloseTo(last.pitch ?? 0, 6);
    expect(end.bearing).toBeCloseTo(last.bearing ?? 0, 6);
  });

  it("never runs the camera backwards down the zoom", () => {
    // A smoothing scheme that overshoots would dip the zoom between waypoints,
    // and a dive that briefly reverses reads as a stumble.
    for (let i = 0; i < N; i += 1) {
      expect(at((i + 1) / N).zoom).toBeGreaterThanOrEqual(at(i / N).zoom - 1e-9);
    }
  });
});

describe("easeEnds", () => {
  it("runs from nought to one and never backwards", () => {
    expect(easeEnds(0, 0.1, 0.28)).toBeCloseTo(0, 9);
    expect(easeEnds(1, 0.1, 0.28)).toBeCloseTo(1, 9);
    for (let i = 0; i < 500; i += 1) {
      expect(easeEnds((i + 1) / 500, 0.1, 0.28)).toBeGreaterThanOrEqual(
        easeEnds(i / 500, 0.1, 0.28) - 1e-12,
      );
    }
  });
});
