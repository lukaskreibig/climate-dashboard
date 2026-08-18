import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { SATELLITE_MAXZOOM, TERRAIN } from "../basemapLayers";

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

/**
 * One pixel count per zoom level, and this is the invariant that was broken.
 *
 * mapbox-gl stitches every DEM tile to its eight same-zoom neighbours so slopes
 * do not break at the seam, and the stitch starts
 *
 *     backfillBorder(borderTile, dx, dy) {
 *         if (this.dim !== borderTile.dim) throw new Error('dem dimension mismatch');
 *
 * `dim` is read off the received image, not off the declared tileSize. The
 * builder used to oversample only the tiles over the island, which put 1024 and
 * 512 pixel tiles side by side on zoom 10 and 11: 28 throwing pairs at zoom 10
 * and 64 at zoom 11. Every one of those borders went unfilled, and the error
 * reached production.
 *
 * The dimension is read out of the PNG header rather than trusted, because the
 * thing that broke was the difference between what the manifest said and what
 * the files were.
 */
describe("the tiles on disk", () => {
  const dir = join(process.cwd(), "public", "terrain");

  /** PNG IHDR: width at byte 16, height at 20, always, always first. */
  const pngSize = (file: string) => {
    const head = readFileSync(file).subarray(0, 24);
    return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
  };

  const tilesByZoom = () => {
    const out = new Map<number, string[]>();
    for (const z of readdirSync(dir)) {
      if (!/^\d+$/.test(z)) continue;
      const files: string[] = [];
      const walk = (path: string) => {
        for (const entry of readdirSync(path)) {
          const full = join(path, entry);
          if (statSync(full).isDirectory()) walk(full);
          else if (entry.endsWith(".png")) files.push(full);
        }
      };
      walk(join(dir, z));
      out.set(Number(z), files);
    }
    return out;
  };

  it("has exactly one pixel count per zoom level", () => {
    for (const [zoom, files] of tilesByZoom()) {
      const shapes = new Set(files.map((f) => {
        const { width, height } = pngSize(f);
        return `${width}x${height}`;
      }));
      expect([...shapes], `zoom ${zoom} ships more than one tile size`).toHaveLength(1);
    }
  });

  it("has square tiles whose size is a whole multiple of 512", () => {
    for (const [zoom, files] of tilesByZoom()) {
      const { width, height } = pngSize(files[0]);
      expect(width, `zoom ${zoom}`).toBe(height);
      expect(width % 512, `zoom ${zoom}`).toBe(0);
    }
  });

  it("ships no level the source will never ask for", () => {
    // Zoom 11 was built for months and never once fetched: 99 tiles, 6.8 MB.
    // mapbox reads its DEM about two and a half levels under the camera, and
    // the camera lands at 12.65.
    const zooms = [...tilesByZoom().keys()].sort((a, b) => a - b);
    expect(Math.min(...zooms)).toBe(TERRAIN.minzoom);
    expect(Math.max(...zooms)).toBe(TERRAIN.maxzoom);
  });
});

describe("Mapbox's own satellite raster", () => {
  it("is capped at the last zoom that has coverage over this fjord", () => {
    // Counted against the ground quad on 18 August 2026: zoom 12 is complete
    // (374 of 374 tiles), zoom 13 is 42.6 percent missing (590 of 1386), and
    // one of the gaps is the Uummannaq massif itself. Raising this would put
    // 404s back in the map scene.
    expect(SATELLITE_MAXZOOM).toBe(12);
  });
});
