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
  // 10, because 10 is the deepest level that is ever asked for. Measured twice
  // over: with the camera at the landing's zoom 12.65 mapbox-gl requests DEM at
  // zoom 10, at every pitch, roughly two and a half levels under the camera; and
  // logging every /terrain request across the whole flight, at retina and phone
  // pixel ratios, nothing below 10 is fetched. Zoom 11 used to ship anyway: 99
  // tiles, 6.8 MB, never once requested.
  //
  // The detail therefore rides INSIDE these tiles rather than below them. mapbox
  // builds its elevation grid from the pixel count of the image it receives, not
  // from the tileSize declared below, so a zoom 10 tile with 1024 pixels halves
  // the posting under the camera from 25 m to 12.6.
  //
  // Every tile at a level now has that same pixel count, and that is a hard
  // requirement rather than tidiness. mapbox stitches each DEM tile to its eight
  // same-zoom neighbours, and the stitch begins
  //
  //     if (this.dim !== borderTile.dim) throw new Error('dem dimension mismatch');
  //
  // When only the tiles over the island were oversampled, every one of them met
  // a coarser neighbour and threw: 28 such pairs at zoom 10. The border was left
  // unfilled and the error reached production. See the terrain test, which fails
  // if two pixel counts ever appear on one level again.
  maxzoom: 10,
  // The tiles cover one fjord. Without bounds, mapbox-gl asks for every
  // neighbour the camera can see and gets a 404 for most of them: measured at
  // 202 of 237 requests on one camera path. See public/terrain/meta.json, which
  // the builder writes and which these numbers must match.
  bounds: [-52.9, 70.4, -51.5, 71.0] as [number, number, number, number],
  attribution:
    "Elevation: ArcticDEM v4.1, Polar Geospatial Center, University of Minnesota",
} as const;

/**
 * Mapbox's own satellite raster, capped at the last zoom it actually has here.
 *
 * Nothing in this repo asks for it. It arrives inside the stock
 * satellite-streets style as `mapbox-satellite`, a 256 px raster whose TileJSON
 * claims maxzoom 22 worldwide. Over this fjord the imagery stops at 12. Counted
 * against the ground quad below on 18 August 2026:
 *
 *     zoom 11    99 tiles     0 missing
 *     zoom 12   374 tiles     0 missing
 *     zoom 13  1386 tiles   590 missing   (42.6 percent)
 *
 * and one of the missing ones, 13/2909/1785, is the Uummannaq massif itself. A
 * 256 px source is asked for round(cameraZoom + 1), so the descent starts
 * requesting zoom 13 at camera zoom 11.5 and reaches 14 at the landing, and gets
 * 404s for the island.
 *
 * Same remedy as TERRAIN.maxzoom above: given a source maxzoom, mapbox-gl
 * overzooms the last level that exists instead of fetching one that does not.
 * It costs nothing on screen, because the Sentinel-2 ground is opaque from zoom
 * 8 across exactly the area where the coverage is missing. What is left of the
 * Mapbox raster is the far field beyond the quad, drawn from coarser levels
 * anyway.
 *
 * The source id below is Mapbox's, not ours. If a future style revision renames
 * it, this quietly stops working and the 404s come back; there is no way to
 * assert against it offline, so the check is the run that measured the numbers
 * above, repeated when the style version is next raised.
 */
const SATELLITE_SOURCE = "mapbox-satellite";
export const SATELLITE_MAXZOOM = 12;

/**
 * The source's own maxzoom is lowered in place rather than the source being
 * replaced, and the first attempt is worth recording because it looked like the
 * obvious approach and it was worse than the bug.
 *
 * Removing the layer and adding the source back with a maxzoom threw
 * `TypeError: Cannot read properties of undefined (reading 'get')` inside
 * mapbox, and because the call sat at the top of ensureBasemapLayers, the throw
 * took the whole setup with it: no water surgery, no ground image and, worst,
 * no setTerrain. The map went flat and nothing said so. It was caught by
 * counting DEM tile requests against production, where zoom 10 is fetched and
 * locally it no longer was.
 *
 * Hence two things here. The maxzoom is assigned on the loaded source object,
 * which is what SourceCache reads on its next update, and the whole thing is
 * wrapped so that no future mapbox internal can ever take the terrain down
 * again. A satellite raster that fails to be capped is 404s in the console. A
 * missing setTerrain is the mountain the story is about.
 */
function capMapboxSatellite(map: mapboxgl.Map): void {
  try {
    // Not typed, because maxzoom is not on the public Source interface. It is
    // read straight off the source by SourceCache.update, every frame.
    const source = map.getSource(SATELLITE_SOURCE) as unknown as
      | { maxzoom?: number }
      | undefined;
    if (source && typeof source.maxzoom === "number" && source.maxzoom > SATELLITE_MAXZOOM) {
      source.maxzoom = SATELLITE_MAXZOOM;
    }
  } catch {
    // A raster that stays uncapped is 404s in the console, nothing more.
  }
}

/** One listener per map, however many times the setup runs over it. */
const satelliteWatched = new WeakSet<mapboxgl.Map>();

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

  // Last, deliberately. Everything above is load bearing for the scene; this is
  // a console tidy. It also has to happen after the style's own source has its
  // TileJSON, which is why it is retried on sourcedata rather than done once.
  capMapboxSatellite(map);
  if (!satelliteWatched.has(map)) {
    satelliteWatched.add(map);
    // Re-applied on every sourcedata for this source, not once, because the
    // first attempt is undone: at style.load the raster still carries mapbox's
    // default maxzoom of 22, and when its TileJSON arrives the source is
    // extended with the tileset's own 22 straight over the top of the cap. The
    // metadata event that reports the arrival is the one that has to reset it.
    map.on("sourcedata", (event: mapboxgl.MapSourceDataEvent) => {
      if (event.sourceId === SATELLITE_SOURCE) capMapboxSatellite(map);
    });
  }


  // The attribution control reads sources, and an image source carries none.
  map.getContainer().setAttribute("data-ground-attribution", GROUND.attribution);
}
