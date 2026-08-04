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
import { attachSatelliteOverlays } from "@/lib/mapboxWarmup";
import ChartScene from "@/components/scenes/ChartScene";
import SceneErrorBoundary from "@/components/SceneErrorBoundary";
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

/**
 * Run `job` the first time the reader shows any intent to move down the page.
 *
 * For work that a reader deeper in the story will need but a reader on the
 * first screen never will. Every listener is passive and one shot, and the set
 * is deliberately wide: Lenis drives the scroll here, so a wheel or a touch can
 * arrive before the window scroll event does, and a keyboard reader may never
 * produce either.
 */
const startOnFirstIntent = (job: () => void): (() => void) => {
  if (typeof window === "undefined") {
    job();
    return () => {};
  }

  const events = ["scroll", "wheel", "touchstart", "pointerdown", "keydown"] as const;
  let fired = false;

  const stop = () => {
    events.forEach((name) => window.removeEventListener(name, fire));
  };

  function fire() {
    if (fired) return;
    fired = true;
    stop();
    job();
  }

  events.forEach((name) =>
    window.addEventListener(name, fire, { passive: true, once: true })
  );
  return stop;
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
    let stopWaitingForIntent: () => void = () => {};

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
        // The raw scene and the classified mask of the computer vision beat,
        // 2.4 MB together, for a beat a long way down the page. Awaiting them
        // cost fifteen seconds on a 4 Mbit/s connection, so they were moved out
        // of the gate; measured afterwards, a phone still spent that 2.4 MB
        // before the reader had moved at all. They now start on the first
        // scroll, which is many seconds before the beat that needs them and
        // never at all for a reader who only looks at the first screen.
        stopWaitingForIntent = startOnFirstIntent(() => {
          attachSatelliteOverlays();
          void preloadMapImages().then(() => {
            updateProgress(28);
          });
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
        await Promise.all([modulePromise, tilesPromise]);

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
      stopWaitingForIntent();
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
            {/* one failing scene must never take the whole story down */}
            <SceneErrorBoundary fallback={<section className="h-screen" aria-hidden />}>
              <ChartScene
                cfg={sc}
                globalData={data}
                snowRef={snowRef}
              />
            </SceneErrorBoundary>
          </div>
        ))}
        <OutroHero />
        <ChatBot />
        <OutroCredits baseMeta={data?.baseMeta} fjordMeta={data?.fjordMeta} />
      </main>
      <StoryProgress />
      <LegalFooter />
      {loading && <LoadingOverlay progress={loadingProgress} />}
    </>
  );
}
