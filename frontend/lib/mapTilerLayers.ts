import mapboxgl from "mapbox-gl";

interface EnsureOptions {
  terrain?: boolean;
}

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;

export function ensureMapTilerLayers(
  map: mapboxgl.Map,
  { terrain = true }: EnsureOptions = {}
): void {
  if (!MAPTILER_KEY) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Missing NEXT_PUBLIC_MAPTILER_KEY – skipping MapTiler layers.");
    }
    return;
  }

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
}
