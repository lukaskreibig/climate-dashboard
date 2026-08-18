import mapboxgl from "mapbox-gl";

/**
 * The ground and the relief under the Uummannaq map scenes. Both are ours.
 *
 * Both used to come from MapTiler, whose free plan ran out of requests in August
 * 2026 and suspended the keys for sixteen days. Dropping it was blocked on one
 * fact: without it the island is not visible at all. Mapbox's own
 * `satellite-streets-v12` renders this fjord as an unbroken dark blue field, and
 * at the story's closest waypoint, zoom 11.4 centred on the town, there is no
 * island in it.
 *
 * Esri and EOX both work and both were tried. They are also somebody else's
 * picture of a place this project has ten years of its own imagery of, so the
 * ground is now a Sentinel-2 scene out of the same archive the analysis runs on:
 * 24 July 2026, 0.5 percent cloud, full coverage, already in Web Mercator so the
 * four corners below place it without any stretch of their own. Built by
 * `scripts/build_basemap_image.py` in the science repo.
 *
 * The relief ships in `public/terrain`, built by `build_terrain_tiles.py` from
 * ArcticDEM v4.1 at 2 m. Three models were measured against this one mountain
 * and only ArcticDEM has it: Mapbox returns 198 m, Copernicus DEM GLO-30 returns
 * 792, ArcticDEM returns 1206 against a published 1175. A 30 m grid cannot hold a
 * peak this steep, and the first version of this file used one.
 *
 * Nothing here needs a key, a quota or an account.
 */

interface EnsureOptions {
  terrain?: boolean;
  /**
   * The 3.2 MB Sentinel-2 ground. Off during the warmup sweep, because mapbox
   * fetches an image source the moment it is added and the story does not open
   * on a map. attachSatelliteOverlays and claimWarmedMap turn it on.
   */
  ground?: boolean;
}

const GROUND_SOURCE = "s2-ground";
const DEM_SOURCE = "dem";

/** The scene's own corners, north-west first, clockwise. */
const GROUND: {
  url: string;
  coordinates: [
    [number, number],
    [number, number],
    [number, number],
    [number, number],
  ];
  attribution: string;
} = {
  url: "/images/basemap-summer.jpg",
  coordinates: [
    [-52.9, 71.0],
    [-51.5, 71.0],
    [-51.5, 70.4],
    [-52.9, 70.4],
  ],
  attribution:
    "Ground: Sentinel-2 L2A, 24 July 2026, contains modified Copernicus " +
    "Sentinel data, processed for this story",
};

export const TERRAIN = {
  tiles: ["/terrain/{z}/{x}/{y}.png"],
  // 512 rather than 256 on purpose. mapbox-gl picks its DEM zoom as the camera
  // zoom plus log2(tileSize / 512), so at 256 a camera at 11.4 reads one level
  // coarser than the tiles were built at.
  tileSize: 512,
  // 6, not 8, and the two levels are worth more than their four tiles.
  //
  // A raster-dem source has NO terrain below its minzoom, so that zoom is a
  // visible edge the camera crosses: the mountain appeared on the way down and
  // vanished again on the way up, at the same caption both times. It looked like
  // the relief loading late and it was not loading at all, it did not exist yet.
  // Zoom 6 is where the ground image starts fading in, so the two now arrive
  // together. Must match public/terrain/meta.json, which the test enforces.
  minzoom: 6,
  // 11, and the detail over the island rides inside these tiles rather than
  // below them. Measured: with the camera at the landing's zoom 12.65, mapbox-gl
  // requests DEM tiles at zoom 10, at every pitch, roughly two and a half levels
  // under the camera. Levels 12 and 13 were built and never once fetched. What
  // does reach the screen is the tile's own pixel count, which mapbox reads from
  // the image rather than from tileSize below, so the ten tiles over the island
  // carry 1024 pixels and halve the posting there from 25 m to 12.6. See
  // build_terrain_tiles.py in the science repo for the measurement and the risk.
  maxzoom: 11,
  // The tiles cover one fjord. Without bounds, mapbox-gl asks for every
  // neighbour the camera can see and gets a 404 for most of them: measured at
  // 202 of 237 requests on one camera path. See public/terrain/meta.json, which
  // the builder writes and which these numbers must match.
  bounds: [-52.9, 70.4, -51.5, 71.0] as [number, number, number, number],
  attribution:
    "Elevation: ArcticDEM v4.1, Polar Geospatial Center, University of Minnesota",
} as const;

export function ensureBasemapLayers(
  map: mapboxgl.Map,
  { terrain = true, ground = true }: EnsureOptions = {},
): void {
  /* remove Mapbox's water layers so the scene underneath shows through */
  map
    .getStyle()
    .layers?.filter((layer) => layer.id.startsWith("water"))
    .forEach((layer) => map.removeLayer(layer.id));

  if (ground && !map.getSource(GROUND_SOURCE)) {
    map.addSource(GROUND_SOURCE, {
      type: "image",
      url: GROUND.url,
      coordinates: GROUND.coordinates,
    });
  }

  if (ground && !map.getLayer(GROUND_SOURCE)) {
    const firstSymbol = map
      .getStyle()
      .layers?.find((layer) => layer.type === "symbol")?.id;
    map.addLayer(
      {
        id: GROUND_SOURCE,
        type: "raster",
        source: GROUND_SOURCE,
        paint: {
          // One scene covers one fjord, so from far out it would read as a
          // bright rectangle stuck on a dark globe. It arrives with the camera
          // instead, between zoom 6 and 8, by which point it fills the frame.
          "raster-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            6,
            0,
            8,
            1,
          ],
          "raster-fade-duration": 0,
        },
      },
      firstSymbol,
    );
  }

  if (terrain) {
    if (!map.getSource(DEM_SOURCE)) {
      map.addSource(DEM_SOURCE, {
        type: "raster-dem",
        tiles: [...TERRAIN.tiles],
        tileSize: TERRAIN.tileSize,
        minzoom: TERRAIN.minzoom,
        maxzoom: TERRAIN.maxzoom,
        bounds: [...TERRAIN.bounds],
        encoding: "mapbox",
        attribution: TERRAIN.attribution,
      });
    }

    // Outside the `if` that adds the source, and that is the whole point.
    //
    // This function runs twice on a warmed map: once on style.load, and again
    // when a scene claims it. On the first run the map is still the globe at
    // zoom 1.3, and the very next lines of MapFlyScene's style.load handler call
    // setProjection("globe"), which drops the terrain again. With setTerrain
    // inside the source guard, the second run saw the source already there and
    // skipped it, so the relief never came back and the fjord stayed flat all
    // the way down. The ground image kept working throughout, because a raster
    // layer does not care about the projection, which is exactly why the map
    // looked half fixed.
    map.setTerrain({ source: DEM_SOURCE, exaggeration: 1.3 });
  } else if (map.getTerrain()) {
    map.setTerrain(null);
  }


  // The attribution control reads sources, and an image source carries none.
  map.getContainer().setAttribute("data-ground-attribution", GROUND.attribution);
}
