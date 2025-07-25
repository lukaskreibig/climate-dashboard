/* ------------------------------------------------------------------
   app/page.tsx · master story page (Chapter 2 merged into Chapter 1)
------------------------------------------------------------------ */
"use client";

import { useEffect, useRef, useState } from "react";
import { csvParse } from "d3-dsv";

import IntroHero from "@/components/IntroHero";
import ArcticBackgroundSystem, {
  SnowApi,
} from "@/components/ArcticBackgroundSystem";
import MapboxPreloader from "@/components/MapboxPreloader";

import ChartScene from "@/components/scenes/ChartScene";
import { scenes } from "@/components/scenes/scenesConfig";

import StoryProgress from "@/components/StoryProgress";
import ChatBot from "@/components/ChatBot";
import OutroHero from "@/components/OutroHero";
import BetaDialog from "@/components/BetaDialog";
import LegalFooter from "@/components/LegalFooter";

/* ──────────────────── TYPES ──────────────────── */
/* Chapter-1 JSON (unchanged) */
interface DataJSON {
  dailySeaIce: any[];
  annualAnomaly: any[];
  iqrStats: any;
  annual: any[];
}

/* Chapter-2 bundle (from the old page) */
interface CsvRow {
  date: Date;
  year: number;
  doy: number;
  frac: number;
}

interface SeasonRow {
  day: string;
  eMean: number;
  e25: number;
  e75: number;
  lMean: number;
  l25: number;
  l75: number;
}

interface Chapter2Bundle {
  spring: { year: number; anomaly: number }[];
  season: SeasonRow[];
  frac: { year: number; mean: number }[];
  freeze: {
    year: number;
    freeze: number | null;
    breakup: number | null;
  }[];
  daily: CsvRow[];
}

/* merged type sent to every <ChartScene> */
type CombinedData = DataJSON & Chapter2Bundle;

/* ──────────────────── CONSTANTS ──────────────────── */
const SUN_START = 45; // 14-Feb
const SUN_END = 180; // 29-Jun
const SPRING_A = 60; // 1-Mar
const SPRING_B = 151; // 31-May
const THRESHOLD = 0.15;
const EARLY_YRS = [2017, 2018, 2019, 2020];
const LATE_YRS = [2021, 2022, 2023, 2024, 2025];
const FJORD_KM2 = 3450;

/* simple helpers */
const mean = (arr: number[]) =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : NaN;

const pct = (arr: number[], q: number) => {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  const p = (s.length - 1) * q,
    lo = Math.floor(p),
    hi = Math.ceil(p);
  return lo === hi ? s[lo] : s[lo] * (hi - p) + s[hi] * (p - lo);
};

const labelForDOY = (doy: number) => {
  const d = new Date(Date.UTC(2020, 0, doy));
  return `${String(d.getUTCDate()).padStart(2, "0")}-${d.toLocaleString(
    "en-US",
    { month: "short", timeZone: "UTC" }
  )}`;
};

/* CSV → rows */
const parseCsv = (txt: string): CsvRow[] =>
  csvParse(txt, (d: any) => ({
    date: new Date(d.date),
    year: +d.year,
    doy: +d.doy,
    frac: +d.frac_smooth || NaN,
  })) as unknown as CsvRow[];

/* ──────────────────── MAIN PAGE ──────────────────── */
export default function Page() {
  const [data, setData] = useState<CombinedData | null>(null);
  const [loading, setLoading] = useState(true);
    const [showDisclaimer,setShowDisclaimer] = useState(true);


  /* ★ keep a ref to the snowfall system so scenes can toggle it */
  const snowRef = useRef<SnowApi>(null);

  /* one combined loader */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        /* —— 1. JSON for legacy chapter-1 charts —— */
        const baseJson: DataJSON = await fetch("/api/data").then((r) =>
          r.json()
        );

        /* —— 2. CSV & derived series for new charts —— */
        const csvTxt = await fetch("/data/summary_test_cleaned.csv").then((r) =>
          r.text()
        );
        const rows = parseCsv(csvTxt);

        /* 2a. season band */
        const season: SeasonRow[] = [];
        for (let doy = SUN_START; doy <= SUN_END; doy++) {
          const eVals = rows
            .filter((r) => EARLY_YRS.includes(r.year) && r.doy === doy)
            .map((r) => r.frac);
          const lVals = rows
            .filter((r) => LATE_YRS.includes(r.year) && r.doy === doy)
            .map((r) => r.frac);
          season.push({
            day: labelForDOY(doy),
            eMean: mean(eVals),
            e25: pct(eVals, 0.25),
            e75: pct(eVals, 0.75),
            lMean: mean(lVals),
            l25: pct(lVals, 0.25),
            l75: pct(lVals, 0.75),
          });
        }

        /* 2b. spring anomaly */
        const springMean = (yr: number) =>
          mean(
            rows
              .filter(
                (r) => r.year === yr && r.doy >= SPRING_A && r.doy <= SPRING_B
              )
              .map((r) => r.frac)
          );
        const baseline = mean(EARLY_YRS.map(springMean));
        const spring = [...new Set(rows.map((r) => r.year))]
          .sort()
          .map((yr) => ({
            year: yr,
            anomaly: +((springMean(yr) - baseline) * FJORD_KM2).toFixed(1),
          }));

        /* 2c. mean ice fraction Feb-Jun */
        const frac = [...new Set(rows.map((r) => r.year))]
          .sort()
          .map((yr) => {
            const vals = rows
              .filter(
                (r) => r.year === yr && r.doy >= SUN_START && r.doy <= SUN_END
              )
              .map((r) => r.frac);
            return { year: yr, mean: +mean(vals).toFixed(4) };
          });

        /* 2d. freeze / breakup per year */
        const freeze = [...new Set(rows.map((r) => r.year))]
          .sort()
          .map((yr) => {
            const yrRows = rows.filter((r) => r.year === yr);
            const frozen = yrRows
              .filter((r) => r.frac >= THRESHOLD)
              .map((r) => r.doy);
            return {
              year: yr,
              freeze: frozen.length ? Math.min(...frozen) : null,
              breakup: frozen.length ? Math.max(...frozen) : null,
            };
          });

        /* — 3. bundle everything — */
        setData({
          ...baseJson,
          spring,
          season,
          frac,
          freeze,
          daily: rows,
        });
      } catch (err) {
        console.error("Data-load error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* —— simple loader —— */
  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-night-900 text-snow-50">
        <div className="space-y-4 text-center">
          <div className="h-12 w-12 border-b-2 border-blue-400 rounded-full animate-spin mx-auto" />
          <p className="text-lg">Loading Arctic data …</p>
        </div>
      </div>
    );
  }

  /* —— render full story —— */
  return (
    <>
      {/* 0 ▸ invisible once-per-session preload for Mapbox tiles */}
      <MapboxPreloader />

      {/* 1 ▸ drifting snow / aurora particles */}
      <ArcticBackgroundSystem ref={snowRef} />


      {/* 2 ▸ BETA DISCLAIMER  */}
      {showDisclaimer && (
        <BetaDialog onClose={() => setShowDisclaimer(false)} />
      )}


      {/* 2 ▸ story */}
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

      </main>

      <StoryProgress />
              <LegalFooter />

    </>
  );
}
