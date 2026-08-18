/**
 * The scroll-linked camera path: where the camera is at a given point in a scene.
 *
 * Pulled out of MapFlyScene because it is arithmetic, not a component. Inside
 * MapFlyScene it could only be exercised by mounting React, gsap and mapbox-gl,
 * and a property this choreography depends on, that the flight to Uummannaq
 * never stops moving, could not be gated by a test. Here it is 200 lines of
 * pure functions with no imports, and components/__tests__/flightPath.test.ts
 * samples them densely.
 */

export interface Waypoint {
  lng: number;
  lat: number;
  zoom: number;
  /**
   * How much of the scene's scroll the hop INTO this waypoint gets, relative to
   * the other hops. Only read when the scene flies continuously. Waypoint 0 has
   * none, since nothing leads into it.
   */
  leg?: number;
  /**
   * Headroom above the camera target, as a fraction of the canvas height.
   *
   * mapbox-gl will not pitch past 85 degrees, so its view axis always points at
   * least 5 degrees DOWN and the horizon is pinned to 36 percent of the frame:
   * roughly two thirds of any water level shot is sea. The photograph the story
   * cuts to was taken from a boat with the camera tilted about 7 degrees UP, and
   * there the horizon sits at 75 percent. No position, zoom or pitch closes that
   * 12 degree gap.
   *
   * Camera padding does. Padding the top shifts the target down the viewport,
   * which walks the horizon down with it, and at 0.64 the sea drops from 61 to
   * 28 percent of the frame against the photograph's 25. A fraction rather than
   * pixels, so a phone and a desktop get the same composition.
   */
  padTop?: number;
  pitch?: number;
  bearing?: number;

  /** optional clockwise spin while we stay on this wp (° per sec) */
  orbit?: number;

  /** optional Mapbox flyTo speed for this single hop */
  flySpeed?: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpAngle = (a: number, b: number, t: number) => {
  const d = ((b - a + 540) % 360) - 180;
  return a + d * t;
};
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

interface CamKeyframe { from: number; to: number; start: number; end: number }

/** Continuous-flight shape: a short pull away, a long steady cruise, a landing
 *  that slows into the final frame, and a beat of stillness before the cut. */
export const FLIGHT_RAMP_IN = 0.1;
export const FLIGHT_RAMP_OUT = 0.28;
export const FLIGHT_SETTLE = 0.06;

/** Build a hold→move→hold keyframe timeline; the final descent is the longest
 *  (a slow "landing"), followed by a settle hold. */
/**
 * The same timeline with the standstills taken out.
 *
 * buildKeyframes below puts a HOLD between every pair of waypoints so a caption
 * can be read against a still frame. On the flight to Uummannaq that came to
 * 2.5 of 7.2 weight units: a third of the scroll was a camera that had stopped.
 * On top of that every leg ran through easeInOutCubic, which arrives at zero
 * velocity, so the camera actually braked to a halt twice at each waypoint, and
 * the descent read as four separate hops rather than one flight.
 *
 * Here the legs butt up against each other and carry an explicit weight, the
 * easing is applied once across the whole scene instead of once per leg, and the
 * only stillness left is a short settle at the end, which the story needs: the
 * frame has to hold for a moment before it cuts to the photograph.
 */
/** Metres per screen pixel at zoom 0 on the equator, for 512 pixel tiles. */
const METRES_PER_PIXEL_Z0 = 78271.5;
/** A nominal viewport width, so pan can be counted in screenfuls. */
const NOMINAL_VIEWPORT = 1400;

/**
 * How much work a hop is, measured the way a viewer measures it: how far the
 * picture moves, not how far the camera does.
 *
 * Those are wildly different things on a flight that starts at the pole and ends
 * on one island. The first hop crosses 2000 km and the last one 500 m, but at
 * zoom 1.3 that 2000 km is a third of a screen and at zoom 14 those 500 m are a
 * quarter of one. Weighting the scroll by ground distance would have spent the
 * whole scene over the Arctic; weighting it by hand, which is what I did first,
 * left a factor of fifty between the fastest and slowest moment.
 *
 * Pan is converted to screenfuls at the resolution the leg is actually flown at.
 * Since the zoom changes across the leg and metres per pixel goes as 2^-zoom,
 * the mean zoom is the wrong average; the right one is the mean of 2^zoom, which
 * for a linear zoom ramp has a closed form. Then a doubling of zoom counts as one
 * unit, 90 degrees of turn as one, 45 degrees of tilt as one.
 */
export function screenWork(a: Waypoint, b: Waypoint): number {
  const lat = Math.min(85, Math.abs((a.lat + b.lat) / 2));
  const cos = Math.cos((lat * Math.PI) / 180);
  const dz = b.zoom - a.zoom;
  const scale =
    Math.abs(dz) < 1e-6
      ? 2 ** a.zoom
      : (2 ** b.zoom - 2 ** a.zoom) / (dz * Math.LN2);
  const mpp = (METRES_PER_PIXEL_Z0 * cos) / scale;
  const dy = (b.lat - a.lat) * 111320;
  const dx = (b.lng - a.lng) * 111320 * cos;
  const pan = Math.hypot(dx, dy) / mpp / NOMINAL_VIEWPORT;
  const turn = Math.abs((((b.bearing ?? 0) - (a.bearing ?? 0) + 540) % 360) - 180) / 90;
  const tilt = Math.abs((b.pitch ?? 0) - (a.pitch ?? 0)) / 45;
  return pan + Math.abs(dz) + turn + tilt;
}

export function buildFlightTimeline(wps: Waypoint[]): CamKeyframe[] {
  // Each hop gets scroll in proportion to how much picture it moves, so the
  // flight holds a pace on its own. `leg` is left as a multiplier on top, for
  // when a beat wants deliberately more or less room than its work would buy.
  const legs = wps
    .slice(1)
    // The floor is a timeline concern, not a measurement one: a hop that moves
    // nothing still needs a sliver of scroll so the division below is safe.
    .map((w, i) => Math.max(0.01, (w.leg ?? 1) * Math.max(0.05, screenWork(wps[i], w))));
  // Over the flight's own 0 to 1. The settle at the end is carved out of the
  // RAW scroll by the caller, before easing: it was carved out here at first,
  // and since the ease compresses the end, a 6 percent settle turned into 16
  // percent of standstill on screen. Easing a timeline that already reserved
  // space is one of those bugs that only shows up as "it feels like it stops
  // too early", which is precisely what it was.
  const span = legs.reduce((a, b) => a + b, 0);
  let acc = 0;
  return legs.map((w, i) => {
    const start = acc / span;
    acc += w;
    // The last leg ends at exactly 1. A progress of exactly 1 matches no
    // half-open interval, and falls through to the last keyframe below, which
    // is what puts the camera precisely on the final waypoint.
    return { from: i, to: i + 1, start, end: acc / span };
  });
}

/**
 * Ease in at the start and out at the end, and hold a steady pace in between.
 *
 * The speed ramps 0 to 1 over the first `rampIn` of the scene, stays at 1, then
 * ramps back to 0 over the last `rampOut`. This is the integral of that ramp,
 * normalised so it still runs 0 to 1, which makes it monotone and smooth at the
 * joins. Applied ONCE over the whole flight rather than per leg, which is the
 * difference between a camera that accelerates away from the pole and settles on
 * the island, and one that starts and stops at every waypoint on the way.
 */
export function easeEnds(p: number, rampIn: number, rampOut: number): number {
  const t = Math.max(0, Math.min(1, p));
  const total = 1 - rampIn / 2 - rampOut / 2;
  if (t <= rampIn) return t * t / (2 * rampIn) / total;
  if (t < 1 - rampOut) return (rampIn / 2 + (t - rampIn)) / total;
  const rest = 1 - t;
  return (total - rest * rest / (2 * rampOut)) / total;
}

export function buildKeyframes(n: number): CamKeyframe[] {
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

export function cameraAtProgress(
  wps: Waypoint[],
  keys: CamKeyframe[],
  p: number,
  continuous = false,
) {
  const prog = Math.max(0, Math.min(1, p));
  const k = keys.find((s) => prog >= s.start && prog < s.end) ?? keys[keys.length - 1];
  const a = wps[k.from];
  const b = wps[k.to];
  // Linear inside the leg when the whole flight is eased as one, cubic per leg
  // otherwise. Easing twice would put the brakes back on at every waypoint.
  const raw = k.from === k.to ? 0 : (prog - k.start) / (k.end - k.start);
  const t = k.from === k.to ? 0 : continuous ? raw : easeInOutCubic(raw);
  return {
    lng: lerp(a.lng, b.lng, t),
    lat: lerp(a.lat, b.lat, t),
    zoom: lerp(a.zoom, b.zoom, t),
    pitch: lerp(a.pitch ?? 0, b.pitch ?? 0, t),
    bearing: lerpAngle(a.bearing ?? 0, b.bearing ?? 0, t),
    padTop: lerp(a.padTop ?? 0, b.padTop ?? 0, t),
  };
}
