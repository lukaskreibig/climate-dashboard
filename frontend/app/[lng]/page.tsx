"use client";

import { useEffect, useRef, useState } from "react";
import { useScenesWithTranslation, dynamicModules } from '@/components/scenes/scenesConfig';
import IntroHero from '@/components/IntroHero';
import ArcticBackgroundSystem, { SnowApi } from '@/components/ArcticBackgroundSystem';
import MapboxPreloader from '@/components/MapboxPreloader';
import ChartScene from '@/components/scenes/ChartScene';
import StoryProgress from '@/components/StoryProgress';
import ChatBot from '@/components/ChatBot';
import OutroHero from '@/components/OutroHero';
import BetaDialog from '@/components/BetaDialog';
import LegalFooter from '@/components/LegalFooter';
import OutroCredits from '@/components/OutroCredits';
import type { FjordDataBundle } from '@/types';

interface DataJSON {
  dailySeaIce: any[];
  annualAnomaly: any[];
  iqrStats: any;
  annual: any[];
}


interface CombinedData extends DataJSON {
  decadalAnomaly?: { decade: string; day: number; an: number; sd?: number|null; n: number }[];
  spring: { year: number; anomaly: number | null }[];
  season: {
    day: string;
    eMean: number | null; e25: number | null; e75: number | null;
    lMean: number | null; l25: number | null; l75: number | null;
  }[];
  frac:   { year: number; mean: number | null }[];
  freeze: { year: number; freeze: number | null; breakup: number | null }[];
  daily:  FjordDataBundle['daily'];
  seasonLossPct?: number | null;   // NEW
}

export default function Page() {
  const scenes = useScenesWithTranslation();
  const [data, setData] = useState<CombinedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showDialog, setShowDialog] = useState(true);
  const snowRef = useRef<SnowApi>(null);

  const goTo = (pct: number) => setProgress((p) => Math.max(p, pct));

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await Promise.all(dynamicModules.map((m:any)=> typeof m.preload === 'function' ? m.preload() : Promise.resolve()));
        goTo(15);

        const baseJson: DataJSON = await fetch('/api/data').then(r=>r.json());
        goTo(30);

        const fjordData: FjordDataBundle & { seasonLossPct?: number | null } =
          await fetch('/api/uummannaq').then(r=>r.json());
        goTo(50);

        // KEIN client-seitiges Mapping mehr – Backend liefert fertige Struktur
        setData({
          ...baseJson,
          spring: fjordData.spring,
          season: fjordData.season,          // already merged & labeled
          frac:   fjordData.frac,
          freeze: fjordData.freeze,
          daily:  fjordData.daily,
          seasonLossPct: (fjordData as any).seasonLossPct ?? null,
        });
        goTo(100);
      } catch (err) {
        console.error(err);
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
