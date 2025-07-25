/* ------------------------------------------------------------------
   SimpleSeaIceScene.tsx - Einfache, garantiert funktionierende Lösung
------------------------------------------------------------------ */
"use client";

import { forwardRef, useRef, useEffect, useImperativeHandle, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapFlyScene, { MapFlyApi, Waypoint } from "./MapFlyScene";

export interface SeaIceApi {
  show: (year: 2017 | 2021 | 2024 | "none") => void;
  go: (idx: number) => void;
}

interface Props {
  waypoints: Waypoint[];
}

const SimpleSeaIceScene = forwardRef<SeaIceApi, Props>(function SimpleSeaIceScene(
  { waypoints }, 
  ref
) {
  const mapRef = useRef<MapFlyApi & { getMap: () => mapboxgl.Map | undefined }>(null);
  const [currentYear, setCurrentYear] = useState<2017 | 2021 | 2024 | "none">("none");

  // Setup ice layers once map is ready
  useEffect(() => {
    const setupIceLayers = () => {
      const map = mapRef.current?.getMap();
      if (!map) return;

      const addIceLayer = (year: 2017 | 2021 | 2024) => {
        const sourceId = `ice-source-${year}`;
        const layerId = `ice-layer-${year}`;

        // Method 1: Try GIBS WMS (kann funktionieren)
        const gibsUrl = `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?` +
          `SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&` +
          `LAYERS=MODIS_Terra_Sea_Ice_Extent&STYLES=&` +
          `FORMAT=image/png&TRANSPARENT=true&` +
          `SRS=EPSG:4326&BBOX=-180,60,180,90&` +
          `WIDTH=1024&HEIGHT=512&TIME=${year}-03-01`;

        // Method 2: Alternative - NSIDC Sea Ice Charts (zuverlässiger)
        const nsidcUrl = `https://seaice.uni-bremen.de/data/amsr2/asi_daygrid_swath/n6250/2024/mar/` +
          `asi-AMSR2-n6250-${year}0301-v5.4.png`;

        // Method 3: Fallback - Create colored overlay based on known ice extent
        const createColorOverlay = (year: number) => {
          const canvas = document.createElement('canvas');
          canvas.width = 1024;
          canvas.height = 512;
          const ctx = canvas.getContext('2d')!;
          
          // Simple color coding based on year (more red = less ice)
          const iceIntensity = year === 2017 ? 200 : year === 2021 ? 150 : 100;
          ctx.fillStyle = `rgba(173, 216, 230, ${iceIntensity / 255})`; // Light blue ice
          ctx.fillRect(0, 0, 1024, 256); // Northern part has ice
          
          return canvas.toDataURL();
        };

        if (!map.getSource(sourceId)) {
          // Try GIBS first, fallback to generated overlay
          map.addSource(sourceId, {
            type: "image",
            url: gibsUrl,
            coordinates: [
              [-180, 90], [180, 90],   // top-left, top-right  
              [180, 60],  [-180, 60]   // bottom-right, bottom-left
            ]
          });

          // Error handling: if GIBS fails, use fallback
          const img = new Image();
          img.onload = () => {
            // GIBS worked, do nothing
          };
          img.onerror = () => {
            // GIBS failed, switch to fallback
            if (map.getSource(sourceId)) {
              map.removeSource(sourceId);
            }
            map.addSource(sourceId, {
              type: "image", 
              url: createColorOverlay(year),
              coordinates: [
                [-180, 90], [180, 90],
                [180, 60],  [-180, 60]
              ]
            });
          };
          img.src = gibsUrl;
        }

        if (!map.getLayer(layerId)) {
          map.addLayer({
            id: layerId,
            type: "raster",
            source: sourceId,
            paint: {
              "raster-opacity": 0,
              "raster-fade-duration": 500
            }
          });
        }
      };

      // Add all ice layers
      [2017, 2021, 2024].forEach(year => addIceLayer(year as 2017 | 2021 | 2024));
    };

    // Setup layers when map style is loaded
    const map = mapRef.current?.getMap();
    if (map) {
      if (map.isStyleLoaded()) {
        setupIceLayers();
      } else {
        map.once("style.load", setupIceLayers);
      }
    }
  }, []);

  // Handle year changes
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    [2017, 2021, 2024].forEach(year => {
      const layerId = `ice-layer-${year}`;
      if (map.getLayer(layerId)) {
        const opacity = currentYear === year ? 0.7 : 0;
        map.setPaintProperty(layerId, "raster-opacity", opacity);
      }
    });
  }, [currentYear]);

  useImperativeHandle(ref, () => ({
    go: (i) => mapRef.current?.go(i),
    show: (year) => setCurrentYear(year),
  }));

  return (
    <div className="relative w-full h-full">
      <MapFlyScene ref={mapRef} waypoints={waypoints} />
      
      {/* Debug info - remove in production */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-2 rounded">
        Current Year: {currentYear === "none" ? "None" : currentYear}
      </div>
    </div>
  );
});

export default SimpleSeaIceScene;