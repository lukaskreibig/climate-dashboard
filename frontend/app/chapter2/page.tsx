/* app/page.tsx  ────────────────────────────────────────────────────────────
   ▸ fetches the CLEANED CSV (`/summary_test_cleaned.csv`)
   ▸ derives all secondary metrics client-side
   ▸ hands a typed DataBundle to each <ChartScene/>
   ------------------------------------------------------------------------ */
"use client";

import { useEffect, useState }       from "react";
import { csvParse }                  from "d3-dsv";
import IntroHero                     from "@/components/IntroHero";
import ChartScene                    from "@/components/scenes/ChartScene";
import ChatBot                       from "@/components/ChatBot";
import StoryProgress                 from "@/components/StoryProgress";
import scenes2                       from "@/components/scenes/scenesConfig2";

/* ─── constants used throughout ─── */
const SUN_START   = 45;     // 14-Feb
const SUN_END     = 180;    // 29-Jun
const SPRING_A    = 60;     //  1-Mar
const SPRING_B    = 151;    // 31-May
const THRESHOLD   = 0.15;   // 15 % ice = freeze/break marker
const EARLY_YRS   = [2017, 2018, 2019, 2020];
const LATE_YRS    = [2021, 2022, 2023, 2024, 2025];
const FJORD_KM2   = 3450;   // ⚠️ update if you know the exact fjord area

/* ─── helpers ─── */
const mean = (arr: number[]) =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : NaN;

const pct = (arr: number[], q: number) => {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  const p = (s.length - 1) * q;
  const lo = Math.floor(p), hi = Math.ceil(p);
  return lo === hi ? s[lo] : s[lo] * (hi - p) + s[hi] * (p - lo);
};

/* ─── cleaned CSV → minimal row objects ─── */
interface Row {
  date: Date;
  year: number;
  doy : number;
  frac: number;     // already smoothed by the notebook

}

const parseCsv = (txt: string): Row[] =>
  csvParse(txt, (d: any) => ({
    date: new Date(d.date),
    year: +d.year,
    doy : +d.doy,
    frac: +d.frac_smooth || NaN,
  })) as unknown as Row[];

/* ─── bundle shape expected by all scenes ─── */
export interface SeasonRow {
  day: string;
  eMean: number; e25: number; e75: number;
  lMean: number; l25: number; l75: number;
}

export interface DataBundle {
  spring : { year: number; anomaly: number }[];
  season : SeasonRow[];
  frac   : { year: number; mean: number }[];
  freeze : { year: number; freeze: number | null; breakup: number | null }[];
 daily  : Row[];           
}

/* ─── page component ─── */
export default function Page() {
  const [data, setData] = useState<DataBundle | null>(null);

  useEffect(() => {
    (async () => {
      /* 0 ▸ load CSV ----------------------------------------------------- */
      const csvTxt = await fetch("data/summary_test_cleaned.csv").then(r => r.text());
      const rows   = parseCsv(csvTxt);

      /* helper: DOY → "DD-Mon" ------------------------------------------ */
      const labelForDOY = (doy: number) => {
        const d = new Date(Date.UTC(2020, 0, doy));
        return `${String(d.getUTCDate()).padStart(2, "0")}-${d.toLocaleString(
          "en-US", { month: "short", timeZone: "UTC" }
        )}`;
      };

      /* 1 ▸ early-vs-late season table ---------------------------------- */
      const buildSeason = (): SeasonRow[] => {
        const out: SeasonRow[] = [];
        for (let doy = SUN_START; doy <= SUN_END; doy++) {
          const eVals = rows.filter(r => EARLY_YRS.includes(r.year) && r.doy === doy)
                            .map(r => r.frac);
          const lVals = rows.filter(r => LATE_YRS .includes(r.year) && r.doy === doy)
                            .map(r => r.frac);
          out.push({
            day : labelForDOY(doy),
            eMean: mean(eVals), e25: pct(eVals, .25), e75: pct(eVals, .75),
            lMean: mean(lVals), l25: pct(lVals, .25), l75: pct(lVals, .75),
          });
        }
        return out;
      };

      /* 2 ▸ spring (Mar-May) anomaly ------------------------------------ */
      const springMean = (yr: number) => mean(
        rows.filter(r => r.year === yr && r.doy >= SPRING_A && r.doy <= SPRING_B)
            .map(r => r.frac)
      );

      const baseline = mean(EARLY_YRS.map(springMean));
      const spring   = [...new Set(rows.map(r => r.year))].sort().map(yr => ({
        year   : yr,
        anomaly: +((springMean(yr) - baseline) * FJORD_KM2).toFixed(1), // km²
      }));

      /* 3 ▸ year-mean fraction (Feb-Jun window) -------------------------- */
      const frac = [...new Set(rows.map(r => r.year))].sort().map(yr => {
        const vals = rows.filter(r => r.year === yr &&
                                      r.doy >= SUN_START &&
                                      r.doy <= SUN_END)
                         .map(r => r.frac);
        return { year: yr, mean: +mean(vals).toFixed(4) };
      });

      /* 4 ▸ freeze / breakup DOYs --------------------------------------- */
      const freeze = [...new Set(rows.map(r => r.year))].sort().map(yr => {
        const yrRows = rows.filter(r => r.year === yr);
        const frozen = yrRows.filter(r => r.frac >= THRESHOLD).map(r => r.doy);
        return {
          year   : yr,
          freeze : frozen.length ? Math.min(...frozen) : null,
          breakup: frozen.length ? Math.max(...frozen) : null,
        };
      });

      /* 5 ▸ bundle & stash ---------------------------------------------- */
      setData({
        spring,
        season: buildSeason(),
        frac,
        freeze,
        daily: rows
      });
    })();
  }, []);

  if (!data) return null;      // still loading

  /* ─── render ─── */
  return (
    <>
      <main className="bg-night-900 text-snow-50">
        {scenes2.map(sc => (
          <div id="firstChartAnchor" key={sc.key}>
            <ChartScene cfg={sc} globalData={data} />
          </div>
        ))}
        <ChatBot />
      </main>
      <StoryProgress />
    </>
  );
}
