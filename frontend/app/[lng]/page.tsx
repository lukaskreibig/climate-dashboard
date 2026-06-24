"use client";

import { useEffect, useRef, useState } from "react";
import {
  useScenesWithTranslation,
  dynamicModules,
  type PreloadableComponent,
} from "@/components/scenes/scenesConfig";
import IntroHero from "@/components/IntroHero";
import ArcticBackgroundSystem, {
  type SnowApi,
} from "@/components/ArcticBackgroundSystem";
import MapboxPreloader, {
  preloadMapImages,
  preloadTiles,
} from "@/components/MapboxPreloader";
import ChartScene from "@/components/scenes/ChartScene";
import StoryProgress from "@/components/StoryProgress";
import SmoothScroll from "@/components/SmoothScroll";
import ChatBot from "@/components/ChatBot";
import OutroHero from "@/components/OutroHero";
import LegalFooter from "@/components/LegalFooter";
import OutroCredits from "@/components/OutroCredits";
import LoadingOverlay from "@/components/LoadingOverlay";
import { ApiError, fetchBaseData, fetchFjordData } from "@/lib/apiClient";
import type { DashboardData, DashboardDataOrNull } from "@/types/dashboard";
import { useTranslation } from "react-i18next";

const preloadModules = async (modules: PreloadableComponent[]) => {
  await Promise.all(
    modules.map((module) =>
      typeof module.preload === "function" ? module.preload() : Promise.resolve()
    )
  );
};

export default function Page() {
  const { i18n } = useTranslation();
  const scenes = useScenesWithTranslation();
  const [data, setData] = useState<DashboardDataOrNull>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(4);
  const snowRef = useRef<SnowApi>(null);

  useEffect(() => {
    let cancelled = false;

    const updateProgress = (value: number) => {
      if (cancelled) return;
      setLoadingProgress((current) => Math.max(current, value));
    };

    (async () => {
      try {
        setLoading(true);
        updateProgress(6);

        const modulePromise = preloadModules(dynamicModules).then(() => {
          updateProgress(18);
        });
        const mapImagesPromise = preloadMapImages().then(() => {
          updateProgress(28);
        });
        const tilesPromise = preloadTiles({
          language: i18n.language,
          timeoutMs: 10000,
          onProgress: (progress) => updateProgress(30 + progress * 0.55),
        }).then(() => {
          updateProgress(88);
        });
        const basePromise = fetchBaseData().then((payload) => {
          updateProgress(52);
          return payload;
        });
        const fjordPromise = fetchFjordData().then((payload) => {
          updateProgress(64);
          return payload;
        });

        const [baseJson, fjordData] = await Promise.all([basePromise, fjordPromise]);
        await Promise.all([modulePromise, mapImagesPromise, tilesPromise]);

        if (cancelled) return;

        const combined: DashboardData = {
          dailySeaIce: baseJson.dailySeaIce,
          annualAnomaly: baseJson.annualAnomaly,
          iqrStats: baseJson.iqrStats,
          annual: baseJson.annual,
          decadalAnomaly: baseJson.decadalAnomaly ?? [],
          latestSeaIceSeason: baseJson.latestSeaIceSeason ?? baseJson.partial2025,
          baseMeta: baseJson.meta ?? null,
          spring: fjordData.spring,
          season: fjordData.season,
          frac: fjordData.frac,
          freeze: fjordData.freeze,
          daily: fjordData.daily,
          seasonLossPct: fjordData.seasonLossPct ?? null,
          fjordMeta: fjordData.meta ?? null,
        };

        if (cancelled) return;
        updateProgress(100);
        setData(combined);
        setLoading(false);
      } catch (error) {
        if (error instanceof ApiError) {
          console.error("API error:", error.payload ?? error.message);
        } else {
          console.error(error);
        }
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <SmoothScroll />
      <MapboxPreloader />
      <ArcticBackgroundSystem ref={snowRef} />
      <main className="relative z-10 overflow-x-hidden text-snow-50">
        <IntroHero />
        {scenes.map((sc) => (
          <div key={sc.key} id={sc.key}>
            <ChartScene
              cfg={sc}
              globalData={data}
              snowRef={snowRef}
            />
          </div>
        ))}
        <OutroHero />
        <ChatBot />
        <OutroCredits />
      </main>
      <StoryProgress />
      <LegalFooter />
      {loading && <LoadingOverlay progress={loadingProgress} />}
    </>
  );
}
