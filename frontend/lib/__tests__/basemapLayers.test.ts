import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { TERRAIN } from "../basemapLayers";

/**
 * The terrain source is described twice: once in TypeScript, where mapbox-gl
 * reads it, and once in public/terrain/meta.json, which the science repo's
 * build_terrain_tiles.py writes and which the prefetch reads. Two descriptions
 * of one thing is how a config drifts, and this session already lost an hour to
 * exactly that shape elsewhere: a mypy.ini silently outranking pyproject.toml.
 *
 * So they get compared. If someone rebuilds the tiles over a different box or a
 * different zoom range and forgets this file, the map would ask for tiles that
 * do not exist and the prefetch would warm the wrong ones, both silently.
 */
const manifest = JSON.parse(
  readFileSync(join(process.cwd(), "public/terrain/meta.json"), "utf8"),
) as {
  bbox: [number, number, number, number];
  minzoom: number;
  maxzoom: number;
  tileSize: number;
  encoding: string;
  levels: Record<string, { x0: number; x1: number; y0: number; y1: number }>;
};

describe("terrain source", () => {
  it("declares the same box the tiles were built over", () => {
    expect([...TERRAIN.bounds]).toEqual(manifest.bbox);
  });

  it("declares the same zoom range and tile size", () => {
    expect(TERRAIN.minzoom).toBe(manifest.minzoom);
    expect(TERRAIN.maxzoom).toBe(manifest.maxzoom);
    expect(TERRAIN.tileSize).toBe(manifest.tileSize);
    expect(manifest.encoding).toBe("mapbox");
  });

  it("has a level in the manifest for every zoom it will request", () => {
    for (let z = manifest.minzoom; z <= manifest.maxzoom; z += 1) {
      expect(manifest.levels[String(z)]).toBeDefined();
    }
  });

  it("is a 512 pixel source, which is what keeps the camera's own zoom", () => {
    // mapbox-gl picks its DEM zoom as the camera zoom plus log2(tileSize / 512).
    // At 256 that is one level coarser than the camera, and the mountain the
    // story flies to would be read at half the resolution it was built at.
    expect(TERRAIN.tileSize).toBe(512);
  });
});
