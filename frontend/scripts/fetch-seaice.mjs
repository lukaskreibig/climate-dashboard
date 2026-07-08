#!/usr/bin/env node
/**
 * fetch-seaice.mjs — one-time asset generator (NOT a build/runtime dependency).
 *
 * Downloads the canonical NSIDC Sea Ice Index monthly September concentration
 * GeoTIFFs (G02135, v4.0), thresholds them at the 15 % ice edge, and traces the
 * ice extent into GeoJSON polygons (reprojected from the NSIDC polar grid,
 * EPSG:3411, to EPSG:4326). Vector polygons drape cleanly on the Mapbox globe —
 * including across the pole — where a flat raster image quad cannot. The GeoJSON
 * is committed under public/images/seaice/ so no one else needs GDAL to build.
 *
 * September = the annual minimum, so the decade-to-decade retreat is maximal.
 *
 * Requirements (macOS): `brew install gdal`
 *   (provides gdal_calc.py, gdal_polygonize.py, ogr2ogr).
 * Run: `node scripts/fetch-seaice.mjs`
 *
 * Data: NSIDC Sea Ice Index, Version 4 (Fetterer et al.), distributed by
 * NOAA@NSIDC — https://nsidc.org/data/g02135
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND = join(__dirname, "..");
const OUT_DIR = join(FRONTEND, "public", "images", "seaice");
const TMP_DIR = join(FRONTEND, ".seaice-tmp");

/** Decade snapshots (+ latest year) shown as the cap retreats. */
const YEARS = [1980, 1990, 2000, 2010, 2020, 2024];

const REMOTE =
  "https://noaadata.apps.nsidc.org/NOAA/G02135/north/monthly/geotiff/09_Sep";

/** Ice mask: concentration ≥15 % (value ≥150, ×10 scaling) up to 100 % (1000),
 *  plus the un-sampled pole hole (2510) which is always ice. Land (2540),
 *  coast (2530) and missing (2550) are excluded. */
const ICE_CALC = "(((A>=150)*(A<=1000))+(A==2510))>0";

// GDAL from Homebrew may not be on the inherited PATH.
const PATH = `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH ?? ""}`;
const run = (bin, args) =>
  execFileSync(bin, args, { env: { ...process.env, PATH }, stdio: ["ignore", "ignore", "inherit"] });

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(TMP_DIR, { recursive: true });

  for (const year of YEARS) {
    const tag = `${year}09`;
    const src = `${REMOTE}/N_${tag}_concentration_v4.0.tif`;
    const rawTif = join(TMP_DIR, `raw-${tag}.tif`);
    const maskTif = join(TMP_DIR, `mask-${tag}.tif`);
    const nativeJson = join(TMP_DIR, `native-${tag}.geojson`);
    const outJson = join(OUT_DIR, `nh-${year}-09.geojson`);

    process.stdout.write(`▸ ${year}  download … `);
    run("curl", ["-sfL", "-o", rawTif, src]);

    process.stdout.write("threshold … ");
    rmSync(maskTif, { force: true });
    run("gdal_calc.py", [
      "-A", rawTif,
      `--outfile=${maskTif}`,
      `--calc=${ICE_CALC}`,
      "--NoDataValue=0",
      "--type=Byte",
      "--quiet",
    ]);

    process.stdout.write("trace … ");
    rmSync(nativeJson, { force: true });
    run("gdal_polygonize.py", [maskTif, "-b", "1", "-q", "-f", "GeoJSON", nativeJson, "ice", "DN"]);

    process.stdout.write("reproject … ");
    rmSync(outJson, { force: true });
    // segmentize (in polar metres) so straight edges curve correctly once
    // reprojected; simplify to keep the file small.
    run("ogr2ogr", [
      "-t_srs", "EPSG:4326",
      "-segmentize", "15000",
      "-simplify", "0.05",
      outJson, nativeJson,
    ]);

    if (!existsSync(outJson)) throw new Error(`failed to write ${outJson}`);
    process.stdout.write(`✓ nh-${year}-09.geojson\n`);
  }

  writeFileSync(
    join(OUT_DIR, "ATTRIBUTION.md"),
    [
      "# Sea-ice cap polygons",
      "",
      "`nh-YYYY-09.geojson` are the September (annual-minimum) sea-ice extent",
      "polygons (15 % concentration edge), traced from the NSIDC polar grid and",
      "reprojected to EPSG:4326 for draping on the Mapbox globe.",
      "",
      "**Source:** NSIDC Sea Ice Index, Version 4 (Fetterer, F., K. Knowles,",
      "W. N. Meier, M. Savoie, and A. K. Windnagel), NSIDC dataset G02135,",
      "distributed by NOAA@NSIDC — https://nsidc.org/data/g02135",
      "",
      "Regenerate with `node scripts/fetch-seaice.mjs` (requires GDAL).",
      "",
    ].join("\n"),
  );

  rmSync(TMP_DIR, { recursive: true, force: true });
  console.log(`\nDone → ${OUT_DIR.replace(FRONTEND + "/", "")}/ (${YEARS.length} GeoJSON files)`);
}

main();
