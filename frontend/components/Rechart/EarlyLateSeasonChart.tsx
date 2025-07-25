/* ------------------------------------------------------------------
   EarlyLateSeasonChart.tsx  ·  v2.4 – full file
------------------------------------------------------------------ */
"use client";

import React, {
  useMemo,
  useState,
  useImperativeHandle,
  MutableRefObject,
  useEffect,
} from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import gsap from "gsap";

/* ——— incoming data ——— */
export interface SeasonRow {
  day: string;
  eMean: number;
  e25: number;
  e75: number;
  lMean: number;
  l25: number;
  l75: number;
}

/* ——— GSAP handle ——— */
export type EarlyLateApi = { 
  nextStep: () => void 
  highlight: (which: "early" | "late" | "both") => void };
interface Props {
  data: SeasonRow[];
  apiRef?: MutableRefObject<EarlyLateApi | null>;
}

/* ——— constants ——— */
const SUN_START = 45; // 14-Feb
const SUN_END = 180; // 29-Jun
const HEIGHT = 520;
const TITLE_Y   = -29;      // 42 px über der Panel-Oberkante
const HALF      = HEIGHT / 2;


/* helper: DOY → "DD-Mon" (matches your CSV labels) */
const labelForDOY = (doy: number) => {
  const d = new Date(Date.UTC(2020, 0, doy));
  return `${String(d.getUTCDate()).padStart(2, "0")}-${d.toLocaleString(
    "en-US",
    { month: "short", timeZone: "UTC" }
  )}`;
};

/* densify rows and pre-compute band height */
function buildDense(rows: SeasonRow[]) {
  const byDay = Object.fromEntries(rows.map((r) => [r.day, r]));
  const dense: any[] = [];

  for (let doy = SUN_START; doy <= SUN_END; doy++) {
    const day = labelForDOY(doy);
    const r = byDay[day];

    dense.push(
      r
        ? {
            ...r,
            eBand: +(r.e75 - r.e25).toFixed(4),
            lBand: +(r.l75 - r.l25).toFixed(4),
          }
        : {
            day,
            eMean: null,
            e25: null,
            e75: null,
            eBand: null,
            lMean: null,
            l25: null,
            l75: null,
            lBand: null,
          }
    );
  }
  return dense;
}

/* mean %-loss across the whole Feb-Jun window */
function deriveLoss(rows: SeasonRow[]) {
  const diffs = rows
    .filter((r) => r.eMean != null && r.lMean != null)
    .map((r) => 1 - r.lMean! / r.eMean!)
    .filter(Number.isFinite);

  return diffs.length
    ? +(100 * diffs.reduce((a, b) => a + b, 0) / diffs.length).toFixed(1)
    : 0;
}

/* ——— tooltip that shows only mean lines ——— */
const MeanOnlyTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;

  const entry = payload.find((p) => String(p.dataKey).endsWith("Mean"));
  if (!entry) return null;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #ccc",
        padding: "6px 10px",
        fontSize: 12,
        lineHeight: 1.3,
      }}
    >
      <strong>{label}</strong>
      <br />
      <span style={{ color: entry.color }}>
        {entry.name}: {(entry.value * 100).toFixed(1)} %
      </span>
    </div>
  );
};

/* ——— COMPONENT ——— */
export default function EarlyLateSeasonChart({ data, apiRef }: Props) {
  /* reveal sequence (unchanged) */
const [stage, setStage] = useState(0);

/* which epoch is “in focus”?                */
const [focus, setFocus] = useState<"early" | "late" | "both">("both");

useImperativeHandle(apiRef, () => ({
nextStep:   () => setStage((s) => Math.min(3, s + 1)),
highlight:  (which) => setFocus(which),
}), []);

  const dense = useMemo(() => buildDense(data), [data]);
  const meanLossPct = useMemo(() => deriveLoss(dense), [dense]);

  /* animate % when red mean appears (stage 2) */
  useEffect(() => {
    if (stage === 2) {
      gsap.fromTo(
        "#lossValue",
        { innerText: 0 },
        {
          innerText: meanLossPct,
          duration: 1.2,
          ease: "power2.out",
          snap: { innerText: 0.1 },
        }
      );
    }
  }, [stage, meanLossPct]);

  useEffect(() => {
  const allEarly = ".early-epoch";
  const allLate  = ".late-epoch";

  if (focus === "both") {
    gsap.to([allEarly, allLate], { opacity: 1, duration: 0.6, ease: "power2.out" });
  } else if (focus === "early") {
    gsap.to(allEarly, { opacity: 1,   duration: 0.6, ease: "power2.out" });
    gsap.to(allLate,  { opacity: 0.15, duration: 0.6, ease: "power2.out" });
  } else if (focus === "late") {
    gsap.to(allLate,  { opacity: 1,   duration: 0.6, ease: "power2.out" });
    gsap.to(allEarly, { opacity: 0.15, duration: 0.6, ease: "power2.out" });
  }
}, [focus]);

  const AxisStyle = {
    tick: { fill: "#94a3b8", fontSize: 12 },
    className: "chart-axis",
  };

 const Panel = (
  which: "early" | "late",
  color: string,
  label: string,
  showBand: boolean
) => (
  <ResponsiveContainer width="100%" height={HEIGHT / 2}>
    <ComposedChart
      data={dense}
      syncId="epoch"
      margin={{ top: 10, right: 20, bottom: 30, left: 20 }}
    >
      <CartesianGrid strokeDasharray="1 1" className="chart-grid" />
      <XAxis dataKey="day" {...AxisStyle} />
      <YAxis
        domain={[0, 1]}
        tickFormatter={(v) => `${(v * 100).toFixed(0)} %`}
        {...AxisStyle}
      />
      <Tooltip content={<MeanOnlyTooltip />} />

      {/* transparent baseline for band stacking */}
      <Area
        dataKey={`${which[0]}25`}
        stackId={which}
        stroke="none"
        fillOpacity={0}
        className={`${which}-epoch`}
      />

      {/* inter-quartile range */}
      {showBand && (
        <Area
          dataKey={`${which[0]}Band`}
          stackId={which}
          name={`${label} IQR`}
          stroke="none"
          fill={
            which === "late"
              ? "rgba(214,41,41,0.20)"
              : "rgba(66,135,245,0.25)"
          }
          className={`${which}-epoch`}
        />
      )}

      {/* mean line */}
      <Line
        type="monotone"
        dataKey={`${which[0]}Mean`}
        name={`${label} mean`}
        stroke={color}
        strokeWidth={3}
        connectNulls
        dot={false}
        className={`${which}-epoch`}
      />
    </ComposedChart>
  </ResponsiveContainer>
);


  /* bands are always on (adjust if you re-enable stages) */
  const showEarlyBand = true;
  const showLateBand = true;

  return(
    <div style={{position:"relative",width:"100%",height:HEIGHT}}>
      {/* ---------- linke Panel-Titel ---------- */}
      <div style={{
        position:"absolute",left:80,top:`${TITLE_Y}px`,zIndex:5,
        fontSize:28,fontWeight:600,color:"#0f172a",pointerEvents:"none"
      }}>2017-20 Sea Ice (Mean)</div>

      <div style={{
        position:"absolute",left: 80,top:`${HALF+TITLE_Y}px`,zIndex:5,
        fontSize:28,fontWeight:600,color:"#0f172a",pointerEvents:"none",
      }}>2021-25 Sea Ice (Mean)</div>

      {/* ---------- Headline rechts im zweiten Panel ---------- */}
      <div style={{
        position:"absolute",right:20,top:`${HALF+TITLE_Y}px`,zIndex:5,
        display:"flex",flexDirection:"column",alignItems:"flex-end",
        opacity:stage===2?1:0,pointerEvents:"none"
      }}>
        <div style={{fontSize:42,fontWeight:600,color:"#d62929"}}>
          <span id="lossValue">0</span>%
        </div>
        <div style={{fontSize:14,color:"#64748b"}}>
          less&nbsp;ice&nbsp;coverage
        </div>
      </div>

      {/* ---------- Charts ---------- */}
      {Panel("early","#4287f5","2017-20",showEarlyBand)}
      {Panel("late" ,"#d62929","2021-25",showLateBand)}
    </div>
  );
}
