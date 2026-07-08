# Sea-ice cap polygons

`nh-YYYY-09.geojson` are the September (annual-minimum) sea-ice extent
polygons (15 % concentration edge), traced from the NSIDC polar grid and
reprojected to EPSG:4326 for draping on the Mapbox globe.

**Source:** NSIDC Sea Ice Index, Version 4 (Fetterer, F., K. Knowles,
W. N. Meier, M. Savoie, and A. K. Windnagel), NSIDC dataset G02135,
distributed by NOAA@NSIDC — https://nsidc.org/data/g02135

Regenerate with `node scripts/fetch-seaice.mjs` (requires GDAL).
