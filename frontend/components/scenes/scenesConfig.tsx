/* ------------------------------------------------------------------
   scenesConfig.tsx – caption-triggered strategy  (v9.2-fix with tunnel)
------------------------------------------------------------------- */
import dynamic      from "next/dynamic";
import { SceneCfg } from "./ChartScene";
import { NO_MATCH } from "./ChartScene";

/* lazy-loaded charts ------------------------------------------ */
const SeasonalChart = dynamic(()=>import("@/components/Rechart/SeasonalLinesChartRecharts"),{ ssr:false });
const AnnualChart   = dynamic(()=>import("@/components/Rechart/AnnualAnomalyBarChartRecharts"),{ ssr:false });
const IQRChart      = dynamic(()=>import("@/components/Rechart/IQRChartRecharts"),{ ssr:false });
const DailyChart    = dynamic(()=>import("@/components/Rechart/DailyAnomalyChartRecharts"),{ ssr:false });
const MultiChart    = dynamic(()=>import("@/components/Rechart/MultiLineRecharts"),{ ssr:false });
const ZScoreChart   = dynamic(()=>import("@/components/Rechart/ZScoreChartRecharts"),{ ssr:false });
const Bar24Chart    = dynamic(()=>import("@/components/Rechart/BarChart2024Recharts"),{ ssr:false });
const ScatterChart  = dynamic(()=>import("@/components/Rechart/ScatterChartRecharts"),{ ssr:false });

/* helper ------------------------------------------------------- */
const AXES = ".chart-grid, .chart-axis";

interface DataBundle{
  dailySeaIce   : any[];
  annualAnomaly : any[];
  iqrStats      : any;
  annual        : any[];
}

export const scenes: SceneCfg[] = [
  /* 1 — Seasonal lines --------------------------------------- */
  {
    key       : "seasonal",
    chart     : (d:DataBundle)=> <SeasonalChart data={d.dailySeaIce}/>,
    axesSel   : AXES,
    helperSel : ".chart-ref",
    axesInIdx   : 1,
    // axesOutIdx  : 2,
    helperInIdx : 2,
    // helperOutIdx: 2,
    captions : [
      {
        html:(<>
          <h3 className="text-2xl font-display mb-2">A Spaghetti Bowl of Seasons</h3>
          <p className="text-lg">Each line represents a year of Arctic sea-ice. The colors move from cooler blues in earlier years to warmer reds in recent times, clearly showing a trend towards less and less ice.</p>
        </>)
      },
      {
        html:(<>
          <h3 className="text-2xl font-display mb-2">The New Normal</h3>
          <p className="text-lg">Recent years consistently group together far below historical ice averages. This isn't a random fluctuation—it's a new and troubling reality.

</p>
        </>)
      },
      {
        html:(<>
          <h3 className="text-2xl font-display mb-2">Breaking Extremes</h3>
          <p className="text-lg">The dashed lines indicate record highs and lows. Recent years frequently dip below these historic low marks, reflecting increasing extremes in ice loss.
</p>
        </>)
      }
    ]
  },

  /* 2 — Annual anomalies ------------------------------------- */
  {
    key       : "annual",
    chart     : (d:DataBundle)=> <AnnualChart data={d.annualAnomaly}/>,
    axesSel   : AXES,
    axesInIdx : 0,
    captions : [
      {
        captionSide:"right",
        at:0.15, out:0.85,
        html:(<>
          <h3 className="text-2xl font-display mb-2">Annual Anomalies</h3>
          <p className="text-lg">Bars above zero in blue show more ice than the historical baseline, while bars below zero in red represent years with less ice. The shift to predominantly red bars highlights a dramatic and sustained reduction of ice.
</p>
        </>)
      }
    ]
  },

  /* 3 — Daily IQR envelope ---------------------------------- */
  {
    key       : "iqr",
    chart     : (d:DataBundle)=> <IQRChart data={d.dailySeaIce} stats={d.iqrStats}/>,
    axesSel   : AXES,
    axesInIdx : 0,
    captions : [
      {
        captionSide:"left",
        at:0.10, out:0.90,
        html:(<>
          <h3 className="text-2xl font-display mb-2">What&apos;s an IQR Envelope?</h3>
          <p className="text-lg">The shaded area marks the middle 50% of historic ice extents—our comfort zone. Drifting below this area signals troubling deviations from normal.
</p>
        </>)
      },
      {
        captionSide:"left",
        at:0.15, out:0.85,
        html:(<>
          <h3 className="text-2xl font-display mb-2">Falling Below the Norm</h3>
          <p className="text-lg">In 2024, ice levels frequently dipped below the shaded &quot;normal&quot; envelope. What was once unusual is now increasingly common.</p>
        </>)
      }
    ]
  },

  /* 4 — Daily anomaly jump (2024→25) ------------------------- */
  {
    key       : "daily",
    chart     : (d:DataBundle,api)=>
                  <DailyChart data={d.dailySeaIce} chosenYear={2024} apiRef={api}/>,
    axesSel   : AXES,
    axesInIdx : 0,
    captions : [
      {
        captionSide:"right",
        at:0.15, out:0.55,
        html:(<>
          <h3 className="text-2xl font-display mb-2">A Daily Story</h3>
          <p className="text-lg">This chart shows the daily ice anomalies for each decade. Recent decades show increasingly negative anomalies, clearly visualizing a persistent decline year-round.
</p>
        </>)
      }
    ],
    actions : [
      { captionIdx:0, call: api=>api?.nextYear?.() }
    ]
  },

  // /* 4b — Horizontal daily time-tunnel ------------------------ */
  // dailyTimeTunnel,

  /* 5 — Multi-line temp & CO₂ ------------------------------- */
  {
    key      : "multi",
    chart    : (d:DataBundle)=> <MultiChart data={d.annual}/>,
    axesSel  : AXES,
    axesInIdx : 0,
    captions : [
      {
        captionSide:"right",
        at:0.15, out:0.85,
        html:(<>
          <h3 className="text-2xl font-display mb-2">Connecting the Dots</h3>
          <p className="text-lg">This graph plots Arctic temperature, global temperature, and CO₂ levels. The synchronized rise in CO₂ and temperature—especially pronounced in the Arctic—is clear evidence of the interconnected drivers behind melting sea-ice.
</p>
        </>)
      }
    ]
  },

  /* 6 — Z-score --------------------------------------------- */
  {
    key       : "zscore",
    chart     : (d:DataBundle,api)=>
                  <ZScoreChart data={d.annual} apiRef={api}/>,
    axesSel   : AXES,
    axesInIdx : 0,
    // axesOutIdx: 1,
    captions : [
      {
        captionSide:"left",
        at:0.15, out:0.55,
        html:(<>
          <h3 className="text-2xl font-display mb-2">One Scale to Compare Them All</h3>
          <p className="text-lg">Standardized Z-scores let us compare apples to oranges — CO₂, temperature, ice — all on the same axis. The trends couldn’t be clearer.</p>
        </>)
      },
      {
        captionSide:"left",
        at:0.55, out:0.85,
        html:(<>
          <h3 className="text-2xl font-display mb-2">Inverting the Sea-Ice Loss</h3>
          <p className="text-lg">When we invert the loss of sea-ice, we see how well the rise of CO₂ and global temperature align with the loss of sea-ice.</p>
        </>)
      }
    ],
    actions : [
      { captionIdx:0, call: api=>api?.toggleInvert?.(false) },
      { captionIdx:1, call: api=>api?.toggleInvert?.(true)  }
    ]
  },

  /* 7 — 2024 split-bar -------------------------------------- */
  {
    key      : "bar24",
    chart    : (d:DataBundle)=> <Bar24Chart data={d.annual}/>,
    axesSel  : AXES,
    captions : [
      {
        captionSide:"right",
        at:0.15, out:1,
        html:(<>
          <h3 className="text-2xl font-display mb-2">2024: Twice the Trouble</h3>
          <p className="text-lg">In 2024, Arctic temperatures increased at roughly twice the global rate, shown by the notably taller red bar. Climate impacts hit harder and faster in the Arctic.
</p>
        </>)
      }
    ]
  },

  /* 8 — Scatter --------------------------------------------- */
  {
    key      : "scatter",
    chart    : (d:DataBundle)=> <ScatterChart data={d.annual}/>,
    axesSel  : AXES,
    captions : [
      {
        at:0.05, out:0.99,
        html:(<>
          <h3 className="text-2xl font-display mb-2">More Heat, Less Ice</h3>
          <p className="text-lg">Each dot marks a year. Warmer years (right side) clearly have significantly less sea-ice (lower on the chart). This straightforward correlation underscores the direct relationship between warming and ice loss. It’s not an opinion. It’s physics.</p>
        </>)
      }
    ]
  },
  /* ------------------------------------------------------------------
   Beta / Disclaimer scene – full-screen caption, no chart, no axes
------------------------------------------------------------------ */

{  key: "beta",
  /* blank chart keeps the sticky area in place
     but shows nothing – just a neutral backdrop */
  chart: () => <div className="w-full h-full bg-slate-100" />,

  /* no helper/axes selectors */
  axesSel: NO_MATCH,

  captions: [
    {
      html: (
        <>
          <h2 className="text-4xl font-bold mb-4">🚧 Beta Preview</h2>

              <p className="text-lg max-w-prose mx-auto">
        Here ends the <strong>early-access beta</strong>. <br/>The experience is still
        being refined, and new chapters are coming soon, including a&nbsp;
        <em>Knud Rasmussen Gen-AI chatbot</em> that tells Inuit stories, Computer Vision
        insights from AI processed Arctic satellite imagery, and new sea-ice change data.
        <br />
        <br />
        Thanks for exploring <strong>arctic.rip</strong>. Check back in a few weeks
        for the next wave of features!
      </p>
        </>
      ),
    }
  ],
  chartSide: "fullscreen"}

];
