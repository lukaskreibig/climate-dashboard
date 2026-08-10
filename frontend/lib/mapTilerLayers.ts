import mapboxgl from "mapbox-gl";

interface EnsureOptions {
  terrain?: boolean;
}

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;

const MT_SOURCES = ["mt-sat", "mt-dem"] as const;

/**
 * Set once MapTiler has refused us, so no later map even tries.
 *
 * It refuses for a reason that lasts. In August 2026 the account went past the
 * free plan's monthly request limit and MapTiler suspended the keys for the
 * rest of the period, sixteen days. Without this the story kept asking anyway:
 * 571 requests per page view, all 403, and 966 console errors for a reader who
 * opens the developer tools. One request is enough to learn the answer.
 */
let mapTilerRefused = false;

/** How many tile failures before we accept that the service is not answering. */
const FAILURES_BEFORE_GIVING_UP = 3;

const teardown = (map: mapboxgl.Map) => {
  try {
    if (map.getTerrain?.()) map.setTerrain(null);
  } catch {
    /* a map torn down mid flight has no terrain to clear */
  }
  MT_SOURCES.forEach((id) => {
    try {
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
    } catch {
      /* already gone */
    }
  });
};

/**
 * Watch for the service refusing, and stop asking when it does.
 *
 * mapbox-gl reports a failed tile on the map's error event with the source that
 * asked for it, so a few failures against our two sources are enough to tell a
 * suspended key from one slow tile. The Mapbox base map underneath is
 * untouched, which is why the story still reads: it loses the relief and the
 * MapTiler imagery, not the map.
 */
const watchForRefusal = (map: mapboxgl.Map) => {
  let failures = 0;

  // mapbox-gl puts the source id and the HTTP status on its error events, and
  // its published type declares neither: the type is Error, the object is not.
  type TileError = { sourceId?: string; error?: Error & { status?: number } };

  const onError = (event: unknown) => {
    const { sourceId, error } = event as TileError;
    if (!sourceId || !MT_SOURCES.includes(sourceId as (typeof MT_SOURCES)[number])) {
      return;
    }
    failures += 1;
    if (failures < FAILURES_BEFORE_GIVING_UP) return;

    mapTilerRefused = true;
    map.off("error", onError as never);
    teardown(map);
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `MapTiler refused ${failures} tiles (status ${error?.status ?? "unknown"}). ` +
          "Dropping its layers for this session; the Mapbox base map carries on.",
      );
    }
  };

  map.on("error", onError as never);
};

export function ensureMapTilerLayers(
  map: mapboxgl.Map,
  { terrain = true }: EnsureOptions = {}
): void {
  if (!MAPTILER_KEY) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Missing NEXT_PUBLIC_MAPTILER_KEY, skipping MapTiler layers.");
    }
    return;
  }

  if (mapTilerRefused) return;

  /* remove Mapbox water layers to reveal MapTiler underneath */
  map
    .getStyle()
    .layers?.filter((layer) => layer.id.startsWith("water"))
    .forEach((layer) => map.removeLayer(layer.id));

  const hires = typeof window !== "undefined" && window.devicePixelRatio > 1;
  const scaleQS = hires ? "&scale=2" : "";

  if (!map.getSource("mt-sat")) {
    map.addSource("mt-sat", {
      type: "raster",
      tiles: [
        `https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}${scaleQS}`,
      ],
      tileSize: 256,
      maxzoom: 14,
      attribution: "© MapTiler © OpenStreetMap",
    });
  }

  const firstSymbol = map
    .getStyle()
    .layers?.find((layer) => layer.type === "symbol")?.id;

  if (!map.getLayer("mt-sat")) {
    map.addLayer({ id: "mt-sat", type: "raster", source: "mt-sat" }, firstSymbol);
  }

  if (terrain && !map.getSource("mt-dem")) {
    map.addSource("mt-dem", {
      type: "raster-dem",
      url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${MAPTILER_KEY}`,
      tileSize: 256,
    });
    map.setTerrain({ source: "mt-dem", exaggeration: 1.3 });
  }

  watchForRefusal(map);
}
