// /* app/page.tsx  ────────────────────────────────────────────────────────────
//    ▸ Chapter 2: "Wie das Eis verschwindet" 
//    ▸ Erweitert für neue Story-Struktur mit 3 Akten
//    ▸ Integriert PhotoStory und HumanImpactStory Komponenten
//    ------------------------------------------------------------------------ */
// "use client";

// import { useEffect, useState } from "react";
// import { csvParse } from "d3-dsv";
// import ChartScene from "@/components/scenes/ChartScene";
// import ChatBot from "@/components/ChatBot";
// import StoryProgress from "@/components/StoryProgress";
// import scenes2 from "@/components/scenes/scenesConfig2";

// /* ─── Story waypoints for progress tracking ─── */
// const storyWaypoints = [
//   // ACT I: People & Community Voices
//   { key: "opening-quote", title: "Childhood Memory", phase: "menschen" as const, description: '"When I was a child..."' },
//   { key: "map-fly-intro", title: "Uummannaq Community", phase: "menschen" as const, description: "Island town in transition" },
//   { key: "community-voices", title: "Residents Speak", phase: "menschen" as const, description: "Real voices from Uummannaq" },
//   { key: "hunting-traditions", title: "Cultural Change", phase: "menschen" as const, description: "Hunting traditions breaking" },
  
//   // ACT II: Technology
//   { key: "human-vs-satellite-vision", title: "Two Ways of Seeing", phase: "technologie" as const, description: "Human eyes vs. satellites" },
//   { key: "data-pipeline", title: "From Pixels to Truth", phase: "technologie" as const, description: "Feelings become facts" },
  
//   // ACT II: Data confirms stories
//   { key: "all-years-visual-proof", title: "Visual Proof", phase: "daten" as const, description: "45% less ice since 2017" },
//   { key: "spring-shock-childhood", title: "Childhood in Data", phase: "daten" as const, description: "April & May vs June & July" },
//   { key: "early-late-comparison", title: "New Reality", phase: "daten" as const, description: "2017-20 vs 2021-25 collapse" },
//   { key: "portrait-gallery", title: "Faces of Change", phase: "daten" as const, description: "Generations experiencing change" },
  
//   // ACT III: Trends & Future
//   { key: "countdown-ice-free", title: "Countdown", phase: "trends" as const, description: "3% loss per year" },
//   { key: "seasons-shifting-quote", title: "Winters Too Short", phase: "trends" as const, description: "4,000-year rhythm breaking" },
  
//   // ACT III: Impact & Future
//   { key: "then-now-comparison", title: "Then & Now", phase: "impact" as const, description: "7 years of documented change" },
//   { key: "chapter-end", title: "Global Pattern?", phase: "impact" as const, description: "Is Uummannaq unique?" },
//   // AKT III: Trends & Zukunft
//   { key: "countdown-ice-free", title: "Countdown", phase: "trends" as const, description: "3% Verlust pro Jahr" },
//   { key: "seasons-shifting-quote", title: "Winters Too Short", phase: "trends" as const, description: "4000 Jahre Rhythmus bricht" },
  
//   // AKT III: Impact & Zukunft
//   { key: "then-now-comparison", title: "Then & Now", phase: "impact" as const, description: "7 Jahre Wandel dokumentiert" },
//   { key: "chapter-end-credits", title: "Credits & Outlook", phase: "impact" as const, description: "Globales Muster?" },
// ];

// /* ─── Constants for data processing ─── */
// const SUN_START = 45;     // 14-Feb
// const SUN_END = 180;      // 29-Jun
// const SPRING_A = 60;      // 1-Mar
// const SPRING_B = 151;     // 31-May
// const THRESHOLD = 0.15;   // 15% ice threshold
// const EARLY_YRS = [2017, 2018, 2019, 2020];
// const LATE_YRS = [2021, 2022, 2023, 2024, 2025];
// const FJORD_KM2 = 3450;   // Fjord area in km²

// /* ─── Helper functions ─── */
// const mean = (arr: number[]) =>
//   arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : NaN;

// const pct = (arr: number[], q: number) => {
//   if (!arr.length) return NaN;
//   const s = [...arr].sort((a, b) => a - b);
//   const p = (s.length - 1) * q;
//   const lo = Math.floor(p), hi = Math.ceil(p);
//   return lo === hi ? s[lo] : s[lo] * (hi - p) + s[hi] * (p - lo);
// };

// /* ─── Data interfaces ─── */
// interface Row {
//   date: Date;
//   year: number;
//   doy: number;
//   frac: number;
// }

// interface SeasonRow {
//   day: string;
//   eMean: number; e25: number; e75: number;
//   lMean: number; l25: number; l75: number;
// }

// export interface DataBundle {
//   spring: { year: number; anomaly: number }[];
//   season: SeasonRow[];
//   frac: { year: number; mean: number }[];
//   freeze: { year: number; freeze: number | null; breakup: number | null }[];
//   daily: Row[];
// }

// /* ─── CSV parsing ─── */
// const parseCsv = (txt: string): Row[] =>
//   csvParse(txt, (d: any) => ({
//     date: new Date(d.date),
//     year: +d.year,
//     doy: +d.doy,
//     frac: +d.frac_smooth || NaN,
//   })) as unknown as Row[];

// /* ─── Main page component ─── */
// export default function Chapter2Page() {
//   const [data, setData] = useState<DataBundle | null>(null);
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     (async () => {
//       try {
//         setIsLoading(true);
        
//         /* Load and parse CSV data */
//         const csvTxt = await fetch("data/summary_test_cleaned.csv").then(r => r.text());
//         const rows = parseCsv(csvTxt);

//         /* Helper: DOY to readable date */
//         const labelForDOY = (doy: number) => {
//           const d = new Date(Date.UTC(2020, 0, doy));
//           return `${String(d.getUTCDate()).padStart(2, "0")}-${d.toLocaleString(
//             "en-US", { month: "short", timeZone: "UTC" }
//           )}`;
//         };

//         /* 1. Build season comparison data */
//         const buildSeason = (): SeasonRow[] => {
//           const out: SeasonRow[] = [];
//           for (let doy = SUN_START; doy <= SUN_END; doy++) {
//             const eVals = rows.filter(r => EARLY_YRS.includes(r.year) && r.doy === doy)
//                               .map(r => r.frac);
//             const lVals = rows.filter(r => LATE_YRS.includes(r.year) && r.doy === doy)
//                               .map(r => r.frac);
//             out.push({
//               day: labelForDOY(doy),
//               eMean: mean(eVals), e25: pct(eVals, 0.25), e75: pct(eVals, 0.75),
//               lMean: mean(lVals), l25: pct(lVals, 0.25), l75: pct(lVals, 0.75),
//             });
//           }
//           return out;
//         };

//         /* 2. Spring (Mar-May) anomaly calculation */
//         const springMean = (yr: number) => mean(
//           rows.filter(r => r.year === yr && r.doy >= SPRING_A && r.doy <= SPRING_B)
//               .map(r => r.frac)
//         );

//         const baseline = mean(EARLY_YRS.map(springMean));
//         const spring = [...new Set(rows.map(r => r.year))].sort().map(yr => ({
//           year: yr,
//           anomaly: +((springMean(yr) - baseline) * FJORD_KM2).toFixed(1),
//         }));

//         /* 3. Annual mean ice fraction */
//         const frac = [...new Set(rows.map(r => r.year))].sort().map(yr => {
//           const vals = rows.filter(r => r.year === yr &&
//                                         r.doy >= SUN_START &&
//                                         r.doy <= SUN_END)
//                            .map(r => r.frac);
//           return { year: yr, mean: +mean(vals).toFixed(4) };
//         });

//         /* 4. Freeze/breakup timeline */
//         const freeze = [...new Set(rows.map(r => r.year))].sort().map(yr => {
//           const yrRows = rows.filter(r => r.year === yr);
//           const frozen = yrRows.filter(r => r.frac >= THRESHOLD).map(r => r.doy);
//           return {
//             year: yr,
//             freeze: frozen.length ? Math.min(...frozen) : null,
//             breakup: frozen.length ? Math.max(...frozen) : null,
//           };
//         });

//         /* 5. Bundle all data */
//         setData({
//           spring,
//           season: buildSeason(),
//           frac,
//           freeze,
//           daily: rows
//         });
        
//       } catch (error) {
//         console.error("Error loading data:", error);
//       } finally {
//         setIsLoading(false);
//       }
//     })();
//   }, []);

//   /* Loading state */
//   if (isLoading) {
//     return (
//       <div className="min-h-screen bg-night-900 text-snow-50 flex items-center justify-center">
//         <div className="text-center space-y-4">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
//           <p className="text-lg">Lade Satellitendaten...</p>
//           <p className="text-sm text-gray-400">Verarbeite 10 Jahre Uummannaq Fjord</p>
//         </div>
//       </div>
//     );
//   }

//   /* Error state */
//   if (!data) {
//     return (
//       <div className="min-h-screen bg-night-900 text-snow-50 flex items-center justify-center">
//         <div className="text-center space-y-4">
//           <h2 className="text-2xl font-bold text-red-400">Fehler beim Laden der Daten</h2>
//           <p className="text-gray-400">Die Satellitendaten konnten nicht geladen werden.</p>
//           <button 
//             onClick={() => window.location.reload()}
//             className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
//           >
//             Erneut versuchen
//           </button>
//         </div>
//       </div>
//     );
//   }

//   /* Main render */
//   return (
//     <>
//       <main className="bg-night-900 text-snow-50">
//         {scenes2.map((sc, index) => (
//           <div 
//             key={sc.key} 
//             id={index === 0 ? "firstChartAnchor" : undefined}
//             data-scene-key={sc.key}
//           >
//             <ChartScene cfg={sc} globalData={data} />
//           </div>
//         ))}
        
//         {/* Chat assistant */}
//         <ChatBot />
//       </main>
      
//       {/* Story progress indicator */}
//       <StoryProgress 
//         waypoints={storyWaypoints}
//         currentChapter={2}
//       />
//     </>
//   );
// }