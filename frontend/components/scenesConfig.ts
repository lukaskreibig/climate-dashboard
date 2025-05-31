/* components/scenes/scenesConfig.ts ------------------------------------- */
import { SceneSpec } from "@/components/scenes/ChartScene";
import dynamic       from "next/dynamic";

/* lazy charts */
const Seasonal   = dynamic(()=>import("@/components/Rechart/SeasonalLinesChartRecharts"),{ssr:false});
const AnnualBar  = dynamic(()=>import("@/components/Rechart/AnnualAnomalyBarChartRecharts"),{ssr:false});
const IQR        = dynamic(()=>import("@/components/Rechart/IQRChartRecharts"),            {ssr:false});
const Daily      = dynamic(()=>import("@/components/Rechart/DailyAnomalyChartRecharts"),   {ssr:false});
const Multi      = dynamic(()=>import("@/components/Rechart/MultiLineRecharts"),           {ssr:false});
const ZScore     = dynamic(()=>import("@/components/Rechart/ZScoreChartRecharts"),         {ssr:false});
const Split2024  = dynamic(()=>import("@/components/Rechart/BarChart2024Recharts"),        {ssr:false});
const Scatter    = dynamic(()=>import("@/components/Rechart/ScatterChartRecharts"),        {ssr:false});

/* little helpers for captions */
const H = (t:string)=><h3 className="text-2xl font-display mb-2">{t}</h3>;
const P = (t:string)=><p  className="text-lg">{t}</p>;

export const scenes: SceneSpec[] = [

  /* 1 ─ Seasonal lines -------------------------------------------------- */
  {
    key      : "seasonal",
    pinLen   : 250,
    chart    : d => <Seasonal data={d.dailySeaIce}/>,
    axesSel  : ".chart-grid, .chart-axis",
    helperSel: ".chart-ref",
    captions : [
      { at:0.00, content:<>{H("Seasonal Sea-Ice Lines")}
                          {P("The Arctic breathes — but each breath gets shallower.")}</> },
      { at:0.60, content:<>{H("Extremes Highlighted")}
                          {P("Dashed lines show the record high & low days drifting apart.")}</>}
    ]
  },

  /* 2 ─ Annual anomalies ----------------------------------------------- */
  {
    key     : "annual",
    chart   : d => <AnnualBar data={d.annualAnomaly}/>,
    axesSel : ".recharts-cartesian-grid, .recharts-cartesian-axis",
    captions:[{at:0,content:<>{H("Annual Anomalies")}
                               {P("Below-zero summers are the new normal.")}</>}]
  },

  /* 3 ─ Daily IQR envelope --------------------------------------------- */
  {
    key     : "iqr",
    chart   : d => <IQR data={d.dailySeaIce}
                        stats={d.iqrStats}
                        partial2025={d.partial2025}/>,
    axesSel : ".chart-grid, .chart-axis",
    captions:[{at:0,content:<>{H("Daily IQR Envelope")}
                               {P("The spread of historical variability keeps shrinking.")}</>}]
  },

  /* 4 ─ Daily anomaly (year auto-advance) ------------------------------- */
  {
    key     : "daily",
    chart   : d => <Daily data={d.dailySeaIce} chosenYear={2024}/>,
    axesSel : ".chart-grid, .chart-axis",
    captions:[{at:0,content:<>{H("Daily Anomaly")}
                               {P("Each curve whispers: shrinking ice.")}</>}],
    actions : [{at:0.40,action:(api:any)=>api?.nextYear?.()}]
  },

  /* 5 ─ Multi line temp & CO₂ ------------------------------------------ */
  {
    key     : "multi",
    chart   : d => <Multi data={d.annual}/>,
    axesSel : ".chart-grid, .chart-axis",
    captions:[{at:0,content:<>{H("Temperature & CO₂")}
                               {P("The globe warms — the Arctic doubles down.")}</>}]
  },

  /* 6 ─ Z-Score with auto invert --------------------------------------- */
  {
    key     : "zscore",
    chart   : d => <ZScore data={d.annual}/>,
    axesSel : ".chart-grid, .chart-axis",
    captions:[
      {at:0.00,content:<>{H("Z-Score Anomalies")}
                         {P("Standardise everything: the Arctic still sticks out.")}</>},
      {at:0.55,content:<>{H("Sea-Ice Inverted")}
                         {P("Flip the ice line: all three rise in lock-step.")}</>}
    ],
    actions : [
      {at:0.55,action:(api:any)=>api?.toggleInvert?.(true)},
      {at:0.90,action:(api:any)=>api?.toggleInvert?.(false)}
    ]
  },

  /* 7 ─ 2024 split bar -------------------------------------------------- */
  {
    key     : "split24",
    chart   : d => <Split2024 data={d.annual}/>,
    axesSel : ".chart-grid, .chart-axis",
    captions:[{at:0,content:<>{H("2024 in Context")}
                               {P("Arctic temperatures ran ~2× the global average.")}</>}]
  },

  /* 8 ─ Scatter --------------------------------------------------------- */
  {
    key     : "scatter",
    chart   : d => <Scatter data={d.annual}/>,
    axesSel : ".chart-grid, .chart-axis",
    captions:[{at:0,content:<>{H("Temp vs Sea-Ice")}
                               {P("Every °C up erases roughly a million square kilometres.")}</>}]
  },

  /* 9 ─ Outro ----------------------------------------------------------- */
  {
    key     : "outro",
    pinLen  : 120,
    chart   : ()=>null,
    axesSel : "",             // none
    captions:[{at:0,content:
      <div className="text-center text-slate-600">
        <h2 className="text-3xl font-display mb-4">Where next?</h2>
        <p className="text-xl">
          The Arctic is Earth’s early-warning siren.<br/>
          <span className="italic">If it sounds loud, that’s because it is.</span>
        </p>
      </div>}]
  }
];
