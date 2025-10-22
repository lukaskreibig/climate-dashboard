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
import MapboxPreloader from "@/components/MapboxPreloader";
import ChartScene from "@/components/scenes/ChartScene";
import StoryProgress from "@/components/StoryProgress";
import ChatBot from "@/components/ChatBot";
import OutroHero from "@/components/OutroHero";
import BetaDialog from "@/components/BetaDialog";
import LegalFooter from "@/components/LegalFooter";
import OutroCredits from "@/components/OutroCredits";
import { ApiError, fetchBaseData, fetchFjordData } from "@/lib/apiClient";
import type { DashboardData, DashboardDataOrNull } from "@/types/dashboard";

const preloadModules = async (modules: PreloadableComponent[]) => {
  await Promise.all(
    modules.map((module) =>
      typeof module.preload === "function" ? module.preload() : Promise.resolve()
    )
  );
};

export default function Page() {
  const scenes = useScenesWithTranslation();
  const [data, setData] = useState<DashboardDataOrNull>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showDialog, setShowDialog] = useState(true);
  const snowRef = useRef<SnowApi>(null);

  const goTo = (pct: number) => setProgress((p) => Math.max(p, pct));

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await preloadModules(dynamicModules);
        goTo(15);

        const [baseJson, fjordData] = await Promise.all([
          fetchBaseData(),
          fetchFjordData(),
        ]);
        goTo(30);

        const combined: DashboardData = {
          dailySeaIce: baseJson.dailySeaIce,
          annualAnomaly: baseJson.annualAnomaly,
          iqrStats: baseJson.iqrStats,
          annual: baseJson.annual,
          decadalAnomaly: baseJson.decadalAnomaly ?? [],
          spring: fjordData.spring,
          season: fjordData.season,
          frac: fjordData.frac,
          freeze: fjordData.freeze,
          daily: fjordData.daily,
          seasonLossPct: fjordData.seasonLossPct ?? null,
        };
        goTo(50);

        setData(combined);
        goTo(100);
      } catch (error) {
        if (error instanceof ApiError) {
          console.error("API error:", error.payload ?? error.message);
        } else {
          console.error(error);
        }
      } finally {
        setProgress(100);
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <MapboxPreloader />
      <ArcticBackgroundSystem ref={snowRef} />
      {showDialog && (
        <BetaDialog
          loading={loading}
          progress={progress}
          onClose={() => setShowDialog(false)}
        />
      )}
      <main className="relative z-10 text-snow-50">
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
    </>
  );
}
