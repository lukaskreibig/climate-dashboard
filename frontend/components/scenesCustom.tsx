/* components/scenesCustom.tsx
   Declarative config for *all* scroll-pinned scenes
   (D3 + Recharts counterparts, captions, motions, props).
*/
import { SceneSpec } from "@/components/builders/SceneBuilder";
import dynamic       from "next/dynamic";

/* -------- lazy charts (⛔  no SSR for SVG) -------- */
const SeasonalD3 = dynamic(()=>import("@/components/d3/SeasonalLinesChart")          ,{ssr:false});
const SeasonalRe = dynamic(()=>import("@/components/Rechart/SeasonalLinesChartRecharts"),{ssr:false});

const RollingD3  = dynamic(()=>import("@/components/d3/RollingChart")                ,{ssr:false});

const AnnualD3   = dynamic(()=>import("@/components/d3/AnnualAnomalyBarChart")       ,{ssr:false});
const AnnualRe   = dynamic(()=>import("@/components/Rechart/AnnualAnomalyBarChartRecharts"),{ssr:false});

const IQRD3      = dynamic(()=>import("@/components/d3/IQRChart")                    ,{ssr:false});
const IQRRe      = dynamic(()=>import("@/components/Rechart/IQRChartRecharts")       ,{ssr:false});

const DailyD3    = dynamic(()=>import("@/components/d3/DailyAnomalyChart")           ,{ssr:false});
const DailyRe    = dynamic(()=>import("@/components/Rechart/DailyAnomalyChartRecharts"),{ssr:false});

const MultiD3    = dynamic(()=>import("@/components/d3/MultiLineChart")              ,{ssr:false});
const MultiRe    = dynamic(()=>import("@/components/Rechart/MultiLineRecharts")      ,{ssr:false});

const ZScoreD3   = dynamic(()=>import("@/components/d3/ZScoreChart")                 ,{ssr:false});
const ZScoreRe   = dynamic(()=>import("@/components/Rechart/ZScoreChartRecharts")    ,{ssr:false});

const Bar24D3    = dynamic(()=>import("@/components/d3/BarChart2024")                ,{ssr:false});
const Bar24Re    = dynamic(()=>import("@/components/Rechart/BarChart2024Recharts")   ,{ssr:false});

const ScatterD3  = dynamic(()=>import("@/components/d3/ScatterChart")                ,{ssr:false});
const ScatterRe  = dynamic(()=>import("@/components/Rechart/ScatterChartRecharts")   ,{ssr:false});

/* ------------------------------------------------------------------ */
/*  Scene specifications                                               */
/*  – axisSel   : CSS selectors for grid + axis groups (for GSAP show)
   – helperSel : selectors for extra “helper” marks (reference-lines, etc.)
   – captions   : array of { at:number, html:ReactNode }
   – chart      : fn that receives the *chart props* and returns JSX
   – makeProps  : maps the global dataset → props consumed by that chart
/* ------------------------------------------------------------------ */
export const scenes: SceneSpec[] = [
  /* 1 - Seasonal (already migrated → see SeasonalScene component) */

  /* 2 - Annual anomaly bar-chart ----------------------------------- */
  {
    key      : "annual",
    pinLen   : 200,
    chart    : d => <AnnualRe data={d.annualAnomaly} />,
    axesSel  : ".chart-grid, .chart-axis",
    captions : [
      { at: 0.20,
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">Annual Anomalies</h3>
            <p className="text-lg">Below zero is the new normal.</p>
          </>
        )
      }
    ],
  },

  /* 3 - IQR envelope ------------------------------------------------ */
  {
    key      : "iqr",
    pinLen   : 200,
       chart    : d => (
      <IQRRe
        data={d.dailySeaIce}
        stats={d.iqrStats}
        /* guarantee an array – fallback to [] */
        partial2025={Array.isArray(d.partial2025) ? d.partial2025 : []}
      />
    ),
    axesSel   : ".chart-grid, .chart-axis",
    helperSel : ".chart-ref",           // dashed record-low / record-high
    captions  : [
      { at: 0.15,
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">Daily IQR Envelope</h3>
            <p className="text-lg">
              The envelope of historical variability keeps shrinking.
            </p>
          </>
        )
      }
    ],
  },

  /* 4 - Daily anomaly ---------------------------------------------- */
  {
    key      : "daily",
    pinLen   : 200,
    chart    : d => <DailyRe data={d.dailySeaIce} chosenYear={2024} />,
    axesSel  : ".chart-grid, .chart-axis",
    captions : [
      { at: 0.25,
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">Daily Anomaly</h3>
            <p className="text-lg">
              Pick any year; each curve whispers shrinking ice.
            </p>
          </>
        )
      }
    ],
  },

  /* 5 - Multi-line temp & CO₂ -------------------------------------- */
  {
    key      : "multi",
    pinLen   : 200,
    chart    : d => <MultiRe data={d.annual} />,
    axesSel  : ".chart-grid, .chart-axis",
    captions : [
      { at: 0.25,
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">Temperature & CO₂</h3>
            <p className="text-lg">
              The Arctic warms about twice as fast as the globe.
            </p>
          </>
        )
      }
    ],
  },

  /* 6 - Z-score anomalies ------------------------------------------ */
  {
    key      : "zscore",
    pinLen   : 200,
    chart    : d => <ZScoreRe data={d.annual} />,
    axesSel  : ".chart-grid, .chart-axis",
    captions : [
      { at: 0.25,
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">Z-Score Anomalies</h3>
            <p className="text-lg">
              Standardise everything, and the Arctic still sticks out.
            </p>
          </>
        )
      }
    ],
  },

  /* 7 - 2024 bar split --------------------------------------------- */
  {
    key      : "bar24",
    pinLen   : 150,
    chart    : d => <Bar24Re data={d.annual} />,
    axesSel  : ".chart-grid, .chart-axis",
    captions : [
      { at: 0.20,
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">2024 Split-Bar</h3>
            <p className="text-lg">
              Arctic anomaly ≈ 2 × global average.
            </p>
          </>
        )
      }
    ],
  },

  /* 8 - Scatter ----------------------------------------------------- */
  {
    key      : "scatter",
    pinLen   : 200,
    chart    : d => <ScatterRe data={d.annual} />,
    axesSel  : ".chart-grid, .chart-axis",
    captions : [
      { at: 0.20,
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">Temp vs Sea-Ice</h3>
            <p className="text-lg">
              Higher temps, thinner ice – the slope speaks volumes.
            </p>
          </>
        )
      }
    ],
  },
];
