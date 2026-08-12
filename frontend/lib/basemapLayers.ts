import mapboxgl from "mapbox-gl";

/**
 * The satellite imagery and the relief under the Uummannaq map scenes.
 *
 * Both used to come from MapTiler. In August 2026 the account passed the free
 * plan's monthly request limit and the keys were suspended for sixteen days, and
 * with them went the only thing that made the island visible: Mapbox's own
 * `satellite-streets-v12` renders this fjord as an unbroken dark blue field. At
 * the closest waypoint, zoom 11.4 centred on the town, there is no island in it
 * at all.
 *
 * So neither layer depends on a key or a quota any more.
 *
 * IMAGERY comes from Esri's World Imagery, which needs no key and shows the
 * island, the mountain and the icebergs around it. EOX's Sentinel-2 cloudless
 * mosaic stands behind it as an automatic fallback: it is CC BY 4.0, it is
 * Sentinel-2, which is what this whole story is about, and it shows the island
 * just as clearly, though its water is nearly black and it carries no icebergs.
 *
 * RELIEF is baked and shipped from `public/terrain`, built by
 * `scripts/build_terrain_tiles.py` in the science repo from Copernicus DEM
 * GLO-30. Mapbox's own terrain-dem-v1 is not usable here and the reason is not
 * the one you would guess: it is accurate at the Matterhorn (4252 m against
 * 4478), at Mount Rainier (4391 against 4392) and at Kebnekaise at 67.9 degrees
 * north (2108 against 2096), and it returns 198 m for a Uummannaq peak that
 * Copernicus puts at 792. It is a Greenland gap, not a latitude cutoff.
 */

interface EnsureOptions {
  terrain?: boolean;
}

const SAT_SOURCE = "sat";
const DEM_SOURCE = "dem";

/** Esri first, EOX behind it. Order is the fallback order. */
const IMAGERY = [
  {
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    ],
    maxzoom: 17,
    attribution:
      "Imagery © Esri, Maxar, Earthstar Geographics and the GIS User Community",
  },
  {
    tiles: [
      "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg",
    ],
    maxzoom: 14,
    attribution:
      "Sentinel-2 cloudless 2024 by EOX IT Services GmbH, CC BY 4.0, " +
      "containing modified Copernicus Sentinel data",
  },
] as const;

const TERRAIN = {
  tiles: ["/terrain/{z}/{x}/{y}.png"],
  minzoom: 8,
  maxzoom: 11,
  attribution:
    "Elevation: Copernicus DEM GLO-30, © DLR e.V. and Airbus Defence and Space GmbH, " +
    "provided under COPERNICUS by the European Union and ESA",
} as const;

/**
 * Which imagery source the session settled on.
 *
 * Module scope on purpose: once one provider has refused, no later map on the
 * page should discover that again. The MapTiler episode is the argument. It kept
 * asking a suspended key 571 times per page view, all 403, and one request is
 * enough to learn the answer.
 */
let imageryIndex = 0;

/** How many tile failures before we accept that a provider is not answering. */
const FAILURES_BEFORE_GIVING_UP = 3;

const addImagery = (map: mapboxgl.Map, index: number) => {
  const source = IMAGERY[index];
  if (!source) return;

  if (!map.getSource(SAT_SOURCE)) {
    map.addSource(SAT_SOURCE, {
      type: "raster",
      tiles: [...source.tiles],
      tileSize: 256,
      maxzoom: source.maxzoom,
      attribution: source.attribution,
    });
  }

  if (!map.getLayer(SAT_SOURCE)) {
    const firstSymbol = map
      .getStyle()
      .layers?.find((layer) => layer.type === "symbol")?.id;
    map.addLayer(
      { id: SAT_SOURCE, type: "raster", source: SAT_SOURCE },
      firstSymbol,
    );
  }
};

const removeImagery = (map: mapboxgl.Map) => {
  try {
    if (map.getLayer(SAT_SOURCE)) map.removeLayer(SAT_SOURCE);
    if (map.getSource(SAT_SOURCE)) map.removeSource(SAT_SOURCE);
  } catch {
    /* a map torn down mid flight has nothing left to remove */
  }
};

/**
 * Watch for the imagery provider refusing, and move to the next one when it
 * does. Falling through the whole list leaves the Mapbox base map, which is
 * dark here but still a map.
 */
const watchForRefusal = (map: mapboxgl.Map) => {
  let failures = 0;

  // mapbox-gl puts the source id and the HTTP status on its error events, and
  // its published type declares neither: the type is Error, the object is not.
  type TileError = { sourceId?: string; error?: Error & { status?: number } };

  const onError = (event: unknown) => {
    const { sourceId, error } = event as TileError;
    if (sourceId !== SAT_SOURCE) return;
    failures += 1;
    if (failures < FAILURES_BEFORE_GIVING_UP) return;

    map.off("error", onError as never);
    removeImagery(map);
    imageryIndex += 1;

    if (process.env.NODE_ENV !== "production") {
      const next = IMAGERY[imageryIndex];
      console.warn(
        `Imagery provider ${imageryIndex - 1} refused ${failures} tiles ` +
          `(status ${error?.status ?? "unknown"}). ` +
          (next
            ? "Falling back to the next source."
            : "No sources left; the Mapbox base map carries on."),
      );
    }

    if (IMAGERY[imageryIndex]) {
      addImagery(map, imageryIndex);
      watchForRefusal(map);
    }
  };

  map.on("error", onError as never);
};

export function ensureBasemapLayers(
  map: mapboxgl.Map,
  { terrain = true }: EnsureOptions = {},
): void {
  /* remove Mapbox's water layers so the imagery underneath shows through */
  map
    .getStyle()
    .layers?.filter((layer) => layer.id.startsWith("water"))
    .forEach((layer) => map.removeLayer(layer.id));

  addImagery(map, imageryIndex);

  if (terrain && !map.getSource(DEM_SOURCE)) {
    map.addSource(DEM_SOURCE, {
      type: "raster-dem",
      tiles: [...TERRAIN.tiles],
      tileSize: 256,
      minzoom: TERRAIN.minzoom,
      maxzoom: TERRAIN.maxzoom,
      encoding: "mapbox",
      attribution: TERRAIN.attribution,
    });
    map.setTerrain({ source: DEM_SOURCE, exaggeration: 1.3 });
  }

  watchForRefusal(map);
}
