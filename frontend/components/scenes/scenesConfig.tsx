/* ------------------------------------------------------------------
   scenesConfig.tsx – Chapter 1 — "The Arctic: Our Planet's Canary"
   Restructured for compelling data journalism
------------------------------------------------------------------- */
import dynamic      from "next/dynamic";
import { SceneCfg } from "./ChartScene";
import { NO_MATCH } from "./ChartScene";
import NextChapterButton from "../NextChapterButton";

/* lazy-loaded charts ------------------------------------------ */
const SeasonalChart = dynamic(()=>import("@/components/Rechart/SeasonalLinesChartRecharts"),{ ssr:false });
const AnnualChart   = dynamic(()=>import("@/components/Rechart/AnnualAnomalyBarChartRecharts"),{ ssr:false });
const IQRChart      = dynamic(()=>import("@/components/Rechart/IQRChartRecharts"),{ ssr:false });
const DailyChart    = dynamic(()=>import("@/components/Rechart/DailyAnomalyChartRecharts"),{ ssr:false });
const MultiChart    = dynamic(()=>import("@/components/Rechart/MultiLineRecharts"),{ ssr:false });
const ZScoreChart   = dynamic(()=>import("@/components/Rechart/ZScoreChartRecharts"),{ ssr:false });
const Bar24Chart    = dynamic(()=>import("@/components/Rechart/BarChart2024Recharts"),{ ssr:false });
const ScatterChart  = dynamic(()=>import("@/components/Rechart/ScatterChartRecharts"),{ ssr:false });

/* NEW: Why Arctic explainer component */
const WhyArcticExplainer = dynamic(()=>import("@/components/WhyArcticExplainer"),{ ssr:false });

/* helper ------------------------------------------------------- */
const AXES = ".chart-grid, .chart-axis";

interface DataBundle{
  dailySeaIce   : any[];
  annualAnomaly : any[];
  iqrStats      : any;
  annual        : any[];
}

export const scenes: SceneCfg[] = [
  /* 0 — Project introduction (enhanced storytelling) ---------- */
  {
    key   : "intro",  
    wide  : true,            
    chart : () => null,
    axesSel: NO_MATCH,

    captions: [
      {
        boxClass:"ice-card",
        html: (
          <>
            <h2 className="text-4xl font-bold mb-5">
              Chapter 1<br/>
              The Arctic: Our Planet's Canary
            </h2>
            <p className="text-lg max-w-prose mx-auto">
              Deep in a Greenlandic fjord, I watched ancient ice disappear into dark water. 
              What I witnessed with my own eyes, satellites have been documenting for decades.
              <br /><br />
              This is the story the data tells—and why it matters to all of us.
              <br /><br />
              <em>Scroll at your own pace. The charts ahead will guide you through one of the planet's most dramatic transformations.</em>
            </p>
          </>
        ),
      },
    ],
  },

  /* 1 — NEW: Why the Arctic matters --------------------------- */
  {
    key      : "why-arctic",
    chart: (_d, api) => <WhyArcticExplainer apiRef={api} />,

    chartSide: "fullscreen",
    axesSel  : NO_MATCH,

    captions: [
      {
        captionSide: "left",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">Why the Arctic?</h3>
            <p className="text-lg max-w-sm">
              The Arctic isn't just cold and remote—it's the planet's air conditioner. 
              When it breaks down, we all feel the heat.
            </p>
          </>
        ),
      },
      {
        captionSide: "left", 
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">The Albedo Effect</h3>
            <p className="text-lg max-w-sm">
              White ice reflects sunlight back to space. Dark water absorbs it. 
              As ice melts, the planet traps more heat—accelerating the melt.
            </p>
          </>
        ),
      },
      {
        captionSide: "left",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">Arctic Amplification</h3>
            <p className="text-lg max-w-sm">
              This feedback loop means the Arctic warms <strong>twice as fast</strong> as 
              the global average. It's not just changing—it's racing ahead.
            </p>
          </>
        ),
      },
    ],

        actions: [
      { captionIdx: 1, call: api => api?.showStage?.(2) },
      { captionIdx: 2, call: api => api?.showStage?.(3) },
    ],
  },

  /* 2 — Seasonal lines (improved storytelling) --------------- */
  {
    key       : "seasonal",
    chart     : (d:DataBundle)=> <SeasonalChart data={d.dailySeaIce}/>,
    axesSel   : AXES,
    helperSel : ".chart-ref",
    axesInIdx   : 1,
    helperInIdx : 2,

    captions : [
      {
        html:(<>
          <h3 className="text-2xl font-display mb-2">A Spaghetti Bowl of Bad News</h3>
          <p className="text-lg">
            Each line traces a year of Arctic sea ice from minimum to maximum and back again. 
            Blue lines show colder years, red lines show warmer years. 
            <br/><br/>
            The pattern is unmistakable: recent years cluster far below historical averages.
          </p>
        </>)
      },
      {
        html:(<>
          <h3 className="text-2xl font-display mb-2">The New Reality</h3>
          <p className="text-lg">
            These red lines aren't outliers—they're the new normal. 
            The thick gray band shows the historical average, but recent years 
            consistently finish below it.
            <br/><br/>
            We're not just losing ice. We're redefining what "normal" means.
          </p>
        </>)
      },
      {
        html:(<>
          <h3 className="text-2xl font-display mb-2">Breaking Through the Floor</h3>
          <p className="text-lg">
            The dashed lines mark historical record highs and lows. 
            Notice how recent years frequently punch through the old record lows, 
            setting new extremes.
            <br/><br/>
            This isn't natural variation—it's a system in free fall.
          </p>
        </>)
      }
    ]
  },

  /* 3 — Annual anomalies (better context) -------------------- */
  {
    key       : "annual",
    chart     : (d:DataBundle)=> <AnnualChart data={d.annualAnomaly}/>,
    axesSel   : AXES,
    axesInIdx : 0,

    captions : [
      {
        captionSide:"right",
        html:(<>
          <h3 className="text-2xl font-display mb-2">The Tipping Point</h3>
          <p className="text-lg">
            Each bar shows how much above (blue) or below (red) the long-term average 
            that year finished. Think of zero as the "normal" line.
            <br/><br/>
            The 1980s and 90s danced around normal. The 2000s leaned negative. 
            The 2010s and 2020s? <strong>Almost entirely red.</strong>
            <br/><br/>
            We've crossed a threshold, and there's no going back.
          </p>
        </>)
      }
    ]
  },

  /* 4 — IQR envelope (simplified explanation) ---------------- */
  {
    key       : "iqr",
    chart     : (d:DataBundle)=> <IQRChart data={d.dailySeaIce} stats={d.iqrStats}/>,
    axesSel   : AXES,
    axesInIdx : 0,

    captions : [
      {
        captionSide:"left",
        html:(<>
          <h3 className="text-2xl font-display mb-2">What Does "Normal" Even Mean?</h3>
          <p className="text-lg">
            The blue envelope shows what scientists call the "comfort zone"—
            the middle 50% of all historical measurements. 
            <br/><br/>
            If ice levels stay within this band, it's business as usual. 
            Drop below it, and we're in uncharted territory.
          </p>
        </>)
      },
      {
        captionSide:"left",
        at:0.15, out:0.85,
        html:(<>
          <h3 className="text-2xl font-display mb-2">2024: Living Below the Line</h3>
          <p className="text-lg">
            In 2024, ice levels spent most of the year below the comfort zone. 
            These aren't brief dips—they're sustained periods in unknown territory.
            <br/><br/>
            What was once considered "extreme" is becoming routine.
          </p>
        </>)
      }
    ]
  },

  /* 5 — Multi-decade view (enhanced drama) ------------------- */
  {
    key       : "multi-decade",
    chart : (d:DataBundle, api) =>
            <DailyChart data={d.dailySeaIce} apiRef={api} />,
    axesSel   : AXES,
    axesInIdx : 0,

    captions : [
      {
        captionSide:"right",
        html:(<>
          <h3 className="text-2xl font-display mb-2">Six Decades, One Direction</h3>
          <p className="text-lg">
            Each colored band represents a decade of Arctic ice measurements. 
            Watch as we reveal them one by one—and notice the unmistakable 
            staircase downward.
          </p>
        </>)
      },
      {
        captionSide:"right",
        html:(<>
          <h3 className="text-2xl font-display mb-2">The 1980s: The Old Normal</h3>
          <p className="text-lg">
            This light blue band shows what Arctic ice looked like when many of us were born. 
            Values around zero million km² were typical for late summer.
          </p>
        </>)
      },
      {
        captionSide:"right",
        html:(<>
          <h3 className="text-2xl font-display mb-2">The 1990s: First Cracks</h3>
          <p className="text-lg">
            Each new decade settles slightly lower than the last. 
            The changes seem gradual, but they're building momentum.
          </p>
        </>)
      },
            {
        captionSide:"right",
        html:(<>
          <h3 className="text-2xl font-display mb-2">The 2000s: Going Down</h3>
          <p className="text-lg">
            The downward spiral holding on. (replace)
          </p>
        </>)
      },
      {
        captionSide:"right",
        html:(<>
          <h3 className="text-2xl font-display mb-2">The 2010s: Acceleration</h3>
          <p className="text-lg">
            The decline steepens. Values around -0.6 million km² become common—
            territory that was unthinkable just decades earlier.
          </p>
        </>)
      },
      {
        captionSide:"right",
        html:(<>
          <h3 className="text-2xl font-display mb-2">The 2020s: Free Fall</h3>
          <p className="text-lg">
            The current decade sits at the bottom of the stack. 
            Values around -0.9 million km² show how quickly the "new normal" 
            keeps shifting downward.
            <br/><br/>
            We're not just losing ice—we're accelerating into unknown territory.
          </p>
        </>)
      },
    ],

    actions : [
      { captionIdx:0, call: api=>api?.showLevel?.(1) },
      { captionIdx:1, call: api=>api?.showLevel?.(2) },
      { captionIdx:2, call: api=>api?.showLevel?.(3) },
      { captionIdx:3, call: api=>api?.showLevel?.(4) },
      { captionIdx:4, call: api=>api?.showLevel?.(5) },
      { captionIdx:5, call: api=>api?.showLevel?.(6) }
    ]
  },

  /* 6 — Multi-line connections (clearer narrative) ----------- */
  {
    key      : "connections",
    chart    : (d:DataBundle)=> <MultiChart data={d.annual}/>,
    axesSel  : AXES,
    axesInIdx : 0,

    captions : [
      {
        captionSide:"right",
        at:0.15, out:0.85,
        html:(<>
          <h3 className="text-2xl font-display mb-2">The Smoking Gun</h3>
          <p className="text-lg">
            Three lines, one story: atmospheric CO₂ (green), global temperature (blue), 
            and Arctic temperature (red) have marched in lockstep for decades.
            <br/><br/>
            This isn't correlation—it's causation. More CO₂ traps more heat, 
            and the Arctic feels it first and fastest.
            <br/><br/>
            The connection is undeniable.
          </p>
        </>)
      }
    ]
  },

  /* 7 — Z-score normalization (better explanation) ----------- */
  {
    key       : "zscore",
    chart     : (d:DataBundle,api)=> <ZScoreChart data={d.annual} apiRef={api}/>,
    axesSel   : AXES,
    axesInIdx : 0,

    captions : [
      {
        captionSide:"left",
        at:0.15, out:0.55,
        html:(<>
          <h3 className="text-2xl font-display mb-2">Apples to Apples</h3>
          <p className="text-lg">
            How do you compare CO₂ levels (measured in parts per million) 
            with temperature (degrees) and ice extent (square kilometers)?
            <br/><br/>
            By converting everything to the same scale: how many standard deviations 
            each measurement is from its historical average. Now we can see 
            the patterns clearly.
          </p>
        </>)
      },
      {
        captionSide:"left",
        at:0.55, out:0.85,
        html:(<>
          <h3 className="text-2xl font-display mb-2">The Mirror Image</h3>
          <p className="text-lg">
            When we flip the ice loss data upside down, something remarkable appears: 
            the rise in CO₂ and temperature perfectly mirrors the loss of ice.
            <br/><br/>
            Three different measurements, one unified story. 
            This is what climate change looks like in data.
          </p>
        </>)
      }
    ],

    actions : [
      { captionIdx:0, call: api=>api?.toggleInvert?.(false) },
      { captionIdx:1, call: api=>api?.toggleInvert?.(true)  }
    ]
  },

  /* 8 — 2024 emphasis (current relevance) -------------------- */
  {
    key      : "2024-focus",
    chart    : (d:DataBundle)=> <Bar24Chart data={d.annual}/>,
    axesSel  : AXES,

    captions : [
      {
        captionSide:"right",
        at:0.15, out:1,
        html:(<>
          <h3 className="text-2xl font-display mb-2">2024: The Exclamation Point</h3>
          <p className="text-lg">
            While global temperatures broke records in 2024, Arctic temperatures 
            soared even higher—rising at roughly twice the global rate.
            <br/><br/>
            That towering red bar isn't just data—it's a warning. 
            Climate impacts don't spread evenly across our planet. 
            They hit the Arctic first, and they hit it hardest.
            <br/><br/>
            What happens in the Arctic doesn't stay in the Arctic.
          </p>
        </>)
      }
    ]
  },

  /* 9 — Scatter relationship (crystal clear causation) ------- */
  {
    key      : "relationship",
    chart    : (d:DataBundle)=> <ScatterChart data={d.annual}/>,
    axesSel  : AXES,

    captions : [
      {
        at:0.05, out:0.99,
        html:(<>
          <h3 className="text-2xl font-display mb-2">More Heat, Less Ice</h3>
          <p className="text-lg">
            Every dot represents one year. The relationship couldn't be clearer: 
            warmer Arctic temperatures (rightward) mean less sea ice (downward).
            <br/><br/>
            This isn't a political opinion or a theoretical model. 
            It's physics, playing out in real time across our planet's most 
            vulnerable region.
            <br/><br/>
            The question isn't whether this relationship exists—it's what we do about it.
          </p>
        </>)
      }
    ]
  },

  /* 10 — Chapter transition (setup for Chapter 2) ----------- */
  {
    key: "chapter-end",
    chart: () => <div className="w-full h-full bg-gradient-to-b from-slate-100 to-blue-50" />,
    axesSel: NO_MATCH,
    chartSide: "fullscreen",

    captions: [
      {
        boxClass: "ice-card pointer-events-auto",
        html: (
          <>
            <h2 className="text-3xl font-bold mb-4">The Big Picture</h2>
            <p className="text-lg max-w-prose mx-auto">
              The Arctic is our planet's early warning system, and it's screaming. 
              Decades of data show an undeniable pattern: rising emissions, rising temperatures, 
              vanishing ice.
              <br/><br/>
              But numbers can feel abstract. In Chapter 2, we'll fly to a remote Greenlandic fjord 
              where satellites capture this transformation in stunning detail—and where the people 
              living through it can no longer deny what's happening.
              <br/><br/>
              Ready to see climate change up close?
            </p>
            <NextChapterButton />
          </>
        ),
      }
    ],
  }

];