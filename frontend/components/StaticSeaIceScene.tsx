
/* ------------------------------------------------------------------
   StaticSeaIceScene.tsx - 100% funktionsfähige statische Methode
   Verwende diese wenn alles andere fehlschlägt!
------------------------------------------------------------------ */
"use client";

import { forwardRef, useRef, useImperativeHandle, useState } from "react";
import MapFlyScene, { MapFlyApi, Waypoint } from "./MapFlyScene";

export interface SeaIceApi {
  show: (year: 2017 | 2021 | 2024 | "none") => void;
  go: (idx: number) => void;
}

interface Props {
  waypoints: Waypoint[];
}

// SVG-basierte Ice Overlays - funktionieren IMMER
const createIceSVG = (year: number): string => {
  const iceExtent = year === 2017 ? 0.8 : year === 2021 ? 0.6 : 0.4;
  
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
    <svg width="1024" height="512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="iceGradient${year}" cx="50%" cy="20%" r="60%">
          <stop offset="0%" style="stop-color:rgba(220,248,255,0.9);stop-opacity:1" />
          <stop offset="70%" style="stop-color:rgba(173,216,230,0.7);stop-opacity:1" />
          <stop offset="100%" style="stop-color:rgba(173,216,230,0.2);stop-opacity:1" />
        </radialGradient>
        <filter id="ice-texture">
          <feTurbulence baseFrequency="0.02" numOctaves="3" result="noise"/>
          <feColorMatrix in="noise" type="saturate" values="0"/>
          <feBlend in="SourceGraphic" in2="noise" mode="overlay"/>
        </filter>
      </defs>
      
      <!-- Arctic Ocean Background -->
      <rect width="1024" height="300" fill="rgba(25,25,112,0.3)"/>
      
      <!-- Ice Coverage based on year -->
      <ellipse cx="512" cy="100" 
               rx="${400 * iceExtent}" ry="${150 * iceExtent}" 
               fill="url(#iceGradient${year})" 
               filter="url(#ice-texture)"/>
               
      <!-- Additional ice patches -->
      <ellipse cx="200" cy="150" 
               rx="${100 * iceExtent}" ry="${80 * iceExtent}" 
               fill="rgba(220,248,255,0.8)"/>
      <ellipse cx="800" cy="120" 
               rx="${120 * iceExtent}" ry="${60 * iceExtent}" 
               fill="rgba(220,248,255,0.8)"/>
               
      <!-- Year indicator -->
      <text x="50" y="50" font-family="Arial, sans-serif" font-size="32" font-weight="bold" 
            fill="rgba(255,255,255,0.9)" stroke="rgba(0,0,0,0.5)" stroke-width="1">
        Sea Ice ${year}
      </text>
      
      <!-- Ice extent indicator -->
      <text x="50" y="90" font-family="Arial, sans-serif" font-size="18" 
            fill="rgba(255,255,255,0.8)">
        Coverage: ${Math.round(iceExtent * 100)}%
      </text>
    </svg>
  `)}`;
};

const StaticSeaIceScene = forwardRef<SeaIceApi, Props>(function StaticSeaIceScene(
  { waypoints }, 
  ref
) {
  const mapRef = useRef<MapFlyApi & { getMap: () => mapboxgl.Map | undefined }>(null);
  const [currentYear, setCurrentYear] = useState<2017 | 2021 | 2024 | "none">("none");

  const showIceYear = (year: 2017 | 2021 | 2024 | "none") => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Remove all existing ice layers
    [2017, 2021, 2024].forEach(y => {
      const sourceId = `static-ice-${y}`;
      const layerId = `static-ice-layer-${y}`;
      
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    });

    // Add new layer if year is selected
    if (year !== "none") {
      const sourceId = `static-ice-${year}`;
      const layerId = `static-ice-layer-${year}`;
      
      // Arctic coverage coordinates (60°N to 90°N)
      const coordinates: [[number, number], [number, number], [number, number], [number, number]] = [
        [-180, 90],  // top-left
        [180, 90],   // top-right  
        [180, 60],   // bottom-right
        [-180, 60]   // bottom-left
      ];

      // Add source with SVG overlay
      map.addSource(sourceId, {
        type: "image",
        url: createIceSVG(year),
        coordinates
      });

      // Add layer with smooth transitions
      map.addLayer({
        id: layerId,
        type: "raster",
        source: sourceId,
        paint: {
          "raster-opacity": 0.8,
          "raster-fade-duration": 1000
        }
      });
    }

    setCurrentYear(year);
  };

  useImperativeHandle(ref, () => ({
    go: (i) => mapRef.current?.go(i),
    show: (year) => showIceYear(year),
  }));

  return (
    <div className="relative w-full h-full">
      <MapFlyScene ref={mapRef} waypoints={waypoints} />
      
      {/* Status indicator */}
      {currentYear !== "none" && (
        <div className="absolute top-4 right-4 bg-blue-900 bg-opacity-80 text-white px-4 py-2 rounded-lg">
          <div className="text-sm font-medium">Arctic Sea Ice</div>
          <div className="text-lg font-bold">{currentYear}</div>
          <div className="text-xs">
            {currentYear === 2017 && "High Coverage"}
            {currentYear === 2021 && "Medium Coverage"} 
            {currentYear === 2024 && "Low Coverage"}
          </div>
        </div>
      )}
    </div>
  );
});

export default StaticSeaIceScene;
