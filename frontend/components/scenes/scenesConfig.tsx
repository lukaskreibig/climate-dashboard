/* ------------------------------------------------------------------
   scenesConfig.tsx  –  caption-triggered strategy (v9.1)
   ▸ Captions samt at/out & Text 1-zu-1 beibehalten
   ▸ Grid/Helper/Actions jetzt über Caption-Indizes gesteuert
------------------------------------------------------------------- */
import dynamic      from "next/dynamic";
import { SceneCfg } from "./ChartScene";
import { NO_MATCH } from "./ChartScene";

/* lazy-loaded charts -------------------------------------------- */
const SeasonalChart = dynamic(()=>import("@/components/Rechart/SeasonalLinesChartRecharts"),{ ssr:false });
const AnnualChart   = dynamic(()=>import("@/components/Rechart/AnnualAnomalyBarChartRecharts"),{ ssr:false });
const IQRChart      = dynamic(()=>import("@/components/Rechart/IQRChartRecharts"),{ ssr:false });
const DailyChart    = dynamic(()=>import("@/components/Rechart/DailyAnomalyChartRecharts"),{ ssr:false });
const MultiChart    = dynamic(()=>import("@/components/Rechart/MultiLineRecharts"),{ ssr:false });
const ZScoreChart   = dynamic(()=>import("@/components/Rechart/ZScoreChartRecharts"),{ ssr:false });
const Bar24Chart    = dynamic(()=>import("@/components/Rechart/BarChart2024Recharts"),{ ssr:false });
const ScatterChart  = dynamic(()=>import("@/components/Rechart/ScatterChartRecharts"),{ ssr:false });

/* helper --------------------------------------------------------- */
const AXES = ".chart-grid, .chart-axis";

interface DataBundle{
  dailySeaIce   : any[];
  annualAnomaly : any[];
  iqrStats      : any;
  annual        : any[];
}

/* ------------------------------------------------------------------
   Szene-Liste
------------------------------------------------------------------- */
export const scenes: SceneCfg[] = [
  /* 1 — Seasonal lines ----------------------------------------- */
  {
    key       : "seasonal",
    chart     : (d:DataBundle)=> <SeasonalChart data={d.dailySeaIce}/>,
    axesSel   : AXES,
    helperSel : ".chart-ref",

    axesInIdx   : 1,   // rein mit 2. Caption
    axesOutIdx  : 2,
    helperInIdx : 2,
    helperOutIdx: 2,

    captions : [
      {
        at:0.05, out:0.35,
        html:(<>
          <h3 className="text-2xl font-display mb-2">A Spaghetti Bowl of Seasons</h3>
          <p className="text-lg">Each line is a year of Arctic sea-ice. The lighter the stroke,
             the further back in time. What once looked like a neat heartbeat
             is starting to flat-line.</p>
        </>)
      },
      {
        at:0.35, out:0.65,
        html:(<>
          <h3 className="text-2xl font-display mb-2">Extremes Keep Slipping</h3>
          <p className="text-lg">Dashed lines mark the record high and record low. Both records
             keep getting broken — in the wrong direction.</p>
        </>)
      },
      {
        at:0.65, out:0.95,
        html:(<>
          <h3 className="text-2xl font-display mb-2">The New Normal</h3>
          <p className="text-lg">What we're seeing isn't random variation. It's a fundamental shift
             in how Arctic sea ice behaves — and it's accelerating.</p>
        </>)
      }
    ]
  },

  /* 2 — Annual anomalies --------------------------------------- */
  {
    key       : "annual",
    chart     : (d:DataBundle)=> <AnnualChart data={d.annualAnomaly}/>,
    axesSel   : AXES,
    axesInIdx : 0,

    captions  : [
      {
        at:0.15, out:0.85,
        html:(<>
          <h3 className="text-2xl font-display mb-2">Annual Anomalies</h3>
          <p className="text-lg">Here's the big picture. Every bar shows how a year's ice stacked up
             against the 1950–80 baseline. The red bars now dominate — we've
             entered a new normal, and it's not great.</p>
        </>)
      }
    ]
  },

  /* 3 — Explainer card ---------------------------------------- */
  {
    key      : "explainer-iqr",
    chart    : () => <div/>,
    axesSel  : NO_MATCH,
    captions : [
      {
        at:0.10, out:0.90,
        html:(<>
          <h3 className="text-2xl font-display mb-2">What's an IQR Envelope?</h3>
          <p className="text-lg">It shows the middle 50% of all values — the comfy zone. Think of it
             like the Arctic's usual range of behavior. The further current
             data drifts outside this envelope, the more we should worry.</p>
        </>)
      }
    ]
  },

  /* 4 — Daily IQR envelope ------------------------------------ */
  {
    key       : "iqr",
    chart     : (d:DataBundle)=> <IQRChart data={d.dailySeaIce} stats={d.iqrStats}/>,
    axesSel   : AXES,
    axesInIdx : 0,

    captions  : [
      {
        at:0.15, out:0.85,
        html:(<>
          <h3 className="text-2xl font-display mb-2">Slipping Below the Envelope</h3>
          <p className="text-lg">In 2024, over 90 days fell below the 25th percentile. That used to
             be rare. Now? It's becoming the rule, not the exception.</p>
        </>)
      }
    ]
  },

  /* 5 — Daily anomaly ----------------------------------------- */
  {
    key       : "daily",
    chart     : (d:DataBundle,api)=> <DailyChart data={d.dailySeaIce} chosenYear={2024} apiRef={api}/>,
    axesSel   : AXES,
    axesInIdx : 0,

    captions  : [
      {
        at:0.15, out:0.55,
        html:(<>
          <h3 className="text-2xl font-display mb-2">A Daily Story</h3>
          <p className="text-lg">This is 2024, wiggling through the year. Scroll further and we'll
             jump to 2025. Same season, same story.</p>
        </>)
      }
    ],

    actions : [
      { captionIdx:0, call: api=>api?.nextYear?.() }
    ]
  },

  /* 6 — Multi-line temp & CO₂ --------------------------------- */
  {
    key      : "multi",
    chart    : (d:DataBundle)=> <MultiChart data={d.annual}/>,
    axesSel  : AXES,

    captions : [
      {
        at:0.15, out:0.85,
        html:(<>
          <h3 className="text-2xl font-display mb-2">Connecting the Dots</h3>
          <p className="text-lg">CO₂ rises, temperature follows — especially in the Arctic, where
             warming runs at nearly double the global average. The ice? It melts.</p>
        </>)
      }
    ]
  },

  /* 7 — Z-score (invert toggle) -------------------------------- */
  {
    key       : "zscore",
    chart     : (d:DataBundle,api)=> <ZScoreChart data={d.annual} apiRef={api}/>,
    axesSel   : AXES,
    axesInIdx : 0,
    axesOutIdx: 1,

    captions  : [
      {
        at:0.15, out:0.55,
        html:(<>
          <h3 className="text-2xl font-display mb-2">One Scale to Compare Them All</h3>
          <p className="text-lg">Standardized Z-scores let us compare apples to oranges — CO₂,
             temperature, ice — all on the same axis. The trends couldn't be clearer.</p>
        </>)
      },
      {
        at:0.55, out:0.85,
        html:(<>
          <h3 className="text-2xl font-display mb-2">Inverting the Sea Ice Loss</h3>
          <p className="text-lg">When we invert the Loss of Sea Ice, we see how well the rise of CO₂
             and Global Temperature align with the Loss of Sea Ice.</p>
        </>)
      }
    ],

    actions : [
      { captionIdx:0, call: api=>api?.toggleInvert?.(false) },
      { captionIdx:1, call: api=>api?.toggleInvert?.(true)  }
    ]
  },

  /* 8 — 2024 split-bar ---------------------------------------- */
  {
    key      : "bar24",
    chart    : (d:DataBundle)=> <Bar24Chart data={d.annual}/>,
    axesSel  : AXES,
    captions : [
      {
        at:0.15, out:0.85,
        html:(<>
          <h3 className="text-2xl font-display mb-2">2024: Twice the Trouble</h3>
          <p className="text-lg">Last year, the Arctic warmed at roughly <strong>2×</strong> the
             global rate. Climate change isn't equal — and the Arctic is on the
             front lines.</p>
        </>)
      }
    ]
  },

  /* 9 — Scatter ----------------------------------------------- */
  {
    key      : "scatter",
    chart    : (d:DataBundle)=> <ScatterChart data={d.annual}/>,
    axesSel  : AXES,
    captions : [
      {
        at:0.05, out:0.99,
        html:(<>
          <h3 className="text-2xl font-display mb-2">More Heat, Less Ice</h3>
          <p className="text-lg">Every dot here is a year. The trend? Clear as day: warmer years
             leave less sea ice. It's not an opinion. It's physics.</p>
        </>)
      }
    ]
  }
];
