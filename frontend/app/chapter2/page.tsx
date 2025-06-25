/* ------------------------------------------------------------------
   chapter-2 · page.tsx    (fully working with summary_test.csv)
------------------------------------------------------------------ */
"use client";

import { useEffect, useState } from "react";
import { csvParse }           from "d3-dsv";
import { group, mean, quantile } from "d3-array";
import { timeParse, timeFormat } from "d3-time-format";

import ChartScene  from "@/components/scenes/ChartScene";
import { scenes2 } from "@/components/scenes/scenesConfig2";

/* ─── typed rows & bundles ───────────────────────────────────── */
interface DailyRec { date: Date; year: number; doy: number; frac: number }

interface SpringRow  { year: number; anomaly: number }
interface SeasonRow  { day: string; early: number; late: number; iqr25: number; iqr75: number }
interface FracRow    { year: number; fraction: number }
interface FreezeRow  { year: number; freeze: number; breakup: number }

interface Bundle { spring: SpringRow[]; season: SeasonRow[]; frac: FracRow[]; freeze: FreezeRow[] }

/* ─── constants matching the Python notebook ------------------ */
const SUN_START   = 45;     // daylight window start (DOY)
const SUN_END     = 180;    // daylight window end
const FREEZE_THR  = 0.40;   // ≥ 40 % → land-fast build-up
const BREAK_THR   = 0.15;   // ≤ 15 % → open water
const PERSIST_D   = 10;     // break-up must persist this long
const EARLY_EPOCH = [2017, 2020];        // inclusive
const LATE_EPOCH  = [2021, 2025];        // inclusive
const BASE_YEARS  = [2017, 2018, 2019, 2020];   // for spring anomaly

/* ─── tiny helpers -------------------------------------------- */
const pTS     = timeParse("%Y%m%dT%H%M%S");      // "20250623T155320"
const fDOYStr = timeFormat("%d-%b");             // "14-Jun"
const fDOY    = timeFormat("%j");                // "165"

/* Parse one CSV row → DailyRec (returns null on malformed row) */
function rowToDaily(r: any): DailyRec | null {
  const ts  = (r.timestamp ?? "").trim();
  const d   = pTS(ts);
  if (!d || isNaN(d as unknown as number)) return null;

  const frac = (+r.solid_pct || 0) + (+r.light_pct || 0);   // 0-1
  return { date: d, year: d.getUTCFullYear(), doy: +fDOY(d), frac };
}

/* ─── BUILD ALL FOUR DATASETS from raw CSV rows  ────────────── */
function buildDatasets(rows: any[]): Bundle {
  /* --- 0 · daily mean across tiles -------------------------- */
  const daily = [...group(
    rows.map(rowToDaily).filter(Boolean) as DailyRec[],
    r => r.date.toISOString().slice(0, 10)          // "YYYY-MM-DD"
  )].map(([_, arr]) => {
    const { year, doy } = arr[0];
    return { year, doy, frac: mean(arr, d => d.frac)! };
  });

  const windowDaily = daily.filter(d => d.doy >= SUN_START && d.doy <= SUN_END);

  /* --- 1 · spring anomaly vs 2017-20 baseline --------------- */
  const springByYear = group(
    windowDaily.filter(d => d.doy >= 60 && d.doy <= 151),  // Mar-May roughly
    d => d.year
  );

  const springMean = [...springByYear].map(([yr, arr]) =>
    ({ year: yr, mean: mean(arr, d => d.frac)! })
  );

  const baseline = mean(
    springMean.filter(r => BASE_YEARS.includes(r.year)).map(r => r.mean)
  )!;

  const spring: SpringRow[] = springMean.map(r => ({
    year: r.year,
    anomaly: r.mean - baseline,
  }));

  /* --- 2 · early- / late-epoch means + IQR by DOY ----------- */
  const byDay = group(windowDaily, d => d.doy);   // 45-180

  const season: SeasonRow[] = [...byDay].map(([doy, arr]) => {
    const early = arr.filter(d => d.year >= EARLY_EPOCH[0] && d.year <= EARLY_EPOCH[1]);
    const late  = arr.filter(d => d.year >= LATE_EPOCH [0] && d.year <= LATE_EPOCH [1]);
    return {
      day   : fDOYStr(new Date(Date.UTC(2020, 0, doy))),   // 2020-01-01 + doy
      early : mean(early, d => d.frac)!,
      late  : mean(late , d => d.frac)!,
      iqr25 : quantile(arr.map(d => d.frac).sort((a,b)=>a-b), 0.25)!,
      iqr75 : quantile(arr.map(d => d.frac).sort((a,b)=>a-b), 0.75)!,
    };
  }).sort((a,b)=> (a.day > b.day ? 1 : -1));

  /* --- 3 · mean ice-fraction per year ----------------------- */
  const frac: FracRow[] = [...group(windowDaily, d => d.year)].map(([yr, arr]) => ({
    year: yr,
    fraction: mean(arr, d => d.frac)!,
  })).sort((a,b)=>a.year-b.year);

  /* --- 4 · freeze-up & break-up timeline -------------------- */
  const freeze: FreezeRow[] = [...group(windowDaily, d => d.year)].map(([yr, arr]) => {
    const byDoy = arr.sort((a,b)=>a.doy-b.doy);

    /* freeze-up = first DOY ≥ 0.4 */
    const freezeRec = byDoy.find(d => d.frac >= FREEZE_THR);
    const freezeDoy = freezeRec ? freezeRec.doy : byDoy[0]?.doy ?? NaN;

    /* break-up = first DOY with frac ≤ 0.15 for ≥10 d consecutively */
    let breakDoy = NaN;
    for (let i = 0; i < byDoy.length - PERSIST_D; ++i) {
      if (byDoy[i].frac <= BREAK_THR &&
          byDoy.slice(i, i + PERSIST_D).every(d => d.frac <= BREAK_THR)) {
        breakDoy = byDoy[i].doy;
        break;
      }
    }

    return { year: yr, freeze: freezeDoy, breakup: breakDoy };
  }).sort((a,b)=>a.year-b.year);

  return { spring, season, frac, freeze };
}

/* ─── React page component ─────────────────────────────────── */
export default function Page() {
  const [bundle, setBundle] = useState<Bundle | null>(null);

  useEffect(() => {
    (async () => {
      /* fetch the *exact* CSV you placed in /public/data/ */
      const txt = await fetch("/data/summary_test.csv").then(r => r.text());

      const rows = csvParse(txt);
      if (!rows.length) {
        console.error("❌ summary_test.csv is empty or unreadable.");
        return;
      }
      console.debug("[debug] CSV rows:", rows.length);
      setBundle(buildDatasets(rows));
    })().catch(err => console.error(err));
  }, []);

  if (!bundle) return null;

  return (
    <main className="bg-night-900 text-snow-50">
      {scenes2.map((sc, i) => (
        <div key={sc.key} data-first-scene={i === 0}>
          <ChartScene cfg={sc} globalData={bundle} />
        </div>
      ))}
    </main>
  );
}
