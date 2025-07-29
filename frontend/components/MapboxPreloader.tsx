/* ------------------------------------------------------------------
   MapboxPreloader.tsx   – einmal pro Tab die Mapbox-Runtime vorwärmen
------------------------------------------------------------------ */
"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTranslation } from 'react-i18next';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

/* Singleton innerhalb eines Browser-Tabs */
let warmed   = false;
let warmMap: mapboxgl.Map | null = null;

/** externe Helper-Fn für page.tsx  */
export async function preloadTiles(): Promise<void> {
  return new Promise(res => {
    if (warmed) return res();           // schon erledigt
    const check = () => warmed ? res() : requestAnimationFrame(check);
    check();
  });
}

export default function MapboxPreloader() {
  const { i18n } = useTranslation();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (warmed || !box.current) return;

    /* 1 — Worker + WebGL Kontext booten */
    mapboxgl.prewarm?.();

    /* 2 — Unsichtbare Karte anlegen */
    warmMap = new mapboxgl.Map({
      container : box.current,
      style     : "mapbox://styles/mapbox/satellite-streets-v12",
      center    : [0, 90],
      zoom      : 1.3,
      interactive: false,
      attributionControl: false,
    });

    /* 3 — Erstes 'idle' ⇒ alles Wesentliche ist gecacht  */
    warmMap.once("idle", () => { warmed = true; });
  }, []);

  /* Update language when i18n changes */
  useEffect(() => {
    if (!warmMap || !warmed) return;
    
    // Same language update logic as MapFlyScene
    const languageMap: { [key: string]: string } = {
      'de': 'de',
      'en': 'en',
      'fr': 'fr',
      'es': 'es',
      'it': 'it',
      'ja': 'ja',
      'ko': 'ko',
      'zh': 'zh-Hans',
      'ru': 'ru'
    };

    const mapLanguage = languageMap[i18n.language] || 'en';
    
    warmMap.getStyle().layers?.forEach((layer) => {
      if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
        const textField = layer.layout['text-field'];
        
        if (typeof textField === 'string' && textField.includes('name')) {
          warmMap!.setLayoutProperty(
            layer.id,
            'text-field',
            ['coalesce',
              ['get', `name:${mapLanguage}`],
              ['get', 'name_international'],
              ['get', 'name']
            ]
          );
        }
      }
    });
  }, [i18n.language]);

  /* 1 × 1 px, komplett unsichtbar */
  return (
    <div
      ref={box}
      style={{
        position : "fixed",
        inset    : 0,
        width    : 1,
        height   : 1,
        overflow : "hidden",
        pointerEvents: "none",
      }}
    />
  );
}