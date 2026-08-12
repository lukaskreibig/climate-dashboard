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

const TERRAIN = {
  tiles: ["/terrain/{z}/{x}/{y}.png"],
  // 512 rather than 256 on purpose. mapbox-gl picks its DEM zoom as the camera
  // zoom plus log2(tileSize / 512), so at 256 a camera at 11.4 reads one level
  // coarser than the tiles were built at.
  tileSize: 512,
  minzoom: 8,
  maxzoom: 11,
  attribution:
    "Elevation: ArcticDEM v4.1, Polar Geospatial Center, University of Minnesota",
} as const;

export function ensureBasemapLayers(
  map: mapboxgl.Map,
  { terrain = true }: EnsureOptions = {},
): void {
  /* remove Mapbox's water layers so the scene underneath shows through */
  map
    .getStyle()
    .layers?.filter((layer) => layer.id.startsWith("water"))
    .forEach((layer) => map.removeLayer(layer.id));

  if (!map.getSource(GROUND_SOURCE)) {
    map.addSource(GROUND_SOURCE, {
      type: "image",
      url: GROUND.url,
      coordinates: GROUND.coordinates,
    });
  }

  if (!map.getLayer(GROUND_SOURCE)) {
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

  if (terrain && !map.getSource(DEM_SOURCE)) {
    map.addSource(DEM_SOURCE, {
      type: "raster-dem",
      tiles: [...TERRAIN.tiles],
      tileSize: TERRAIN.tileSize,
      minzoom: TERRAIN.minzoom,
      maxzoom: TERRAIN.maxzoom,
      encoding: "mapbox",
      attribution: TERRAIN.attribution,
    });
    map.setTerrain({ source: DEM_SOURCE, exaggeration: 1.3 });
  }

  // The attribution control reads sources, and an image source carries none.
  map.getContainer().setAttribute("data-ground-attribution", GROUND.attribution);
}
