/* ------------------------------------------------------------------
   EarlyLateSeasonChart.tsx  ·  v2.5 – backend-props + fallback
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
} from "recharts";
import gsap from "gsap";
import { useTranslation } from 'react-i18next';

/* ——— incoming data ——— */
export interface SeasonRow {
  day: string;
  eMean: number | null;
  e25: number | null;
  e75: number | null;
  lMean: number | null;
  l25: number | null;
  l75: number | null;
}

/* ——— GSAP handle ——— */
export type EarlyLateApi = { 
  nextStep: () => void 
  highlight: (which: "early" | "late" | "both") => void };
interface Props {
  data: SeasonRow[];
  apiRef?: MutableRefObject<EarlyLateApi | null>;
  /** optional: vom Backend vorab berechneter %-Loss über Feb–Jun */
  lossPct?: number | null;
}

/* ——— constants ——— */
const SUN_START = 45; // 14-Feb
const SUN_END   = 180; // 29-Jun
const HEIGHT = 520;
const TITLE_Y = -29;
const HALF    = HEIGHT / 2;

/* densify rows und Bandbreiten vorberechnen */
function buildDense(rows: SeasonRow[]) {
  const byDay = Object.fromEntries(rows.map((r) => [r.day, r]));
  const dense: any[] = [];

  // Wir laufen den vollen Feb–Jun Bereich ab, damit X-Achse immer gleich ist
  for (let doy = SUN_START; doy <= SUN_END; doy++) {
    // DOY → "DD-Mon" (2020 chosen for leap-safe JS parity)
    const d = new Date(Date.UTC(2020, 0, doy));
    const day = `${String(d.getUTCDate()).padStart(2, "0")}-${d.toLocaleString("en-US", { month: "short", timeZone: "UTC" })}`;

    const r = byDay[day];
    dense.push(
      r
        ? {
            ...r,
            eBand: r.e75 != null && r.e25 != null ? +(r.e75 - r.e25).toFixed(4) : null,
            lBand: r.l75 != null && r.l25 != null ? +(r.l75 - r.l25).toFixed(4) : null,
          }
        : {
            day,
            eMean: null, e25: null, e75: null, eBand: null,
            lMean: null, l25: null, l75: null, lBand: null,
          }
    );
  }
  return dense;
}

/* Fallback: mean %-loss wenn nicht vom Backend geliefert */
function deriveLoss(rows: SeasonRow[]) {
  const diffs = rows
    .filter(r => r.eMean != null && r.lMean != null && r.eMean !== 0)
    .map(r => 1 - (r.lMean! / r.eMean!))
    .filter(Number.isFinite);
  return diffs.length ? +(100 * diffs.reduce((a,b)=>a+b,0) / diffs.length).toFixed(1) : 0;
}

/* ——— tooltip, nur Mittelwerte zeigen ——— */
const MeanOnlyTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string; }) => {
  if (!active || !payload?.length) return null;
  const entry = payload.find((p) => String(p.dataKey).endsWith("Mean"));
  if (!entry) return null;

  return (
    <div style={{ background:"#fff", border:"1px solid #ccc", padding:"6px 10px", fontSize:12, lineHeight:1.3 }}>
      <strong>{label}</strong><br/>
      <span style={{ color: entry.color }}>
        {entry.name}: {(entry.value * 100).toFixed(1)} %
      </span>
    </div>
  );
};

/* ——— COMPONENT ——— */
export default function EarlyLateSeasonChart({ data, apiRef, lossPct }: Props) {
  const { t } = useTranslation();

  const [stage, setStage] = useState(0);
  const [focus, setFocus] = useState<"early" | "late" | "both">("both");

  useImperativeHandle(apiRef, () => ({
    nextStep:  () => setStage((s) => Math.min(3, s + 1)),
    highlight: (which) => setFocus(which),
  }), []);

  const dense = useMemo(() => buildDense(data), [data]);
  const meanLossPct = useMemo(
    () => (typeof lossPct === "number" ? lossPct : deriveLoss(data)),
    [lossPct, data]
  );

  /* animate % when red mean appears (stage 2) */
  useEffect(() => {
    if (stage === 2) {
      gsap.fromTo("#lossValue", { innerText: 0 }, {
        innerText: meanLossPct ?? 0,
        duration: 1.2, ease: "power2.out", snap: { innerText: 0.1 },
      });
    }
  }, [stage, meanLossPct]);

  useEffect(() => {
    const earlyEls = gsap.utils.toArray<SVGElement>('.early-epoch');
    const lateEls = gsap.utils.toArray<SVGElement>('.late-epoch');

    if (!earlyEls.length && !lateEls.length) return;

    if (focus === "both") {
      if (earlyEls.length) gsap.to(earlyEls, { opacity: 1, duration: 0.6, ease: "power2.out" });
      if (lateEls.length) gsap.to(lateEls, { opacity: 1, duration: 0.6, ease: "power2.out" });
    } else if (focus === "early") {
      if (earlyEls.length) gsap.to(earlyEls, { opacity: 1, duration: 0.6, ease: "power2.out" });
      if (lateEls.length) gsap.to(lateEls, { opacity: 0.15, duration: 0.6, ease: "power2.out" });
    } else {
      if (lateEls.length) gsap.to(lateEls, { opacity: 1, duration: 0.6, ease: "power2.out" });
      if (earlyEls.length) gsap.to(earlyEls, { opacity: 0.15, duration: 0.6, ease: "power2.out" });
    }
  }, [focus]);

  const AxisStyle = { tick: { fill: "#94a3b8", fontSize: 12 }, className: "chart-axis" };

  const Panel = (which: "early" | "late", color: string, label: string, showBand: boolean) => (
    <ResponsiveContainer width="100%" height={HEIGHT / 2}>
      <ComposedChart data={dense} syncId="epoch" margin={{ top: 10, right: 20, bottom: 30, left: 20 }}>
        <CartesianGrid strokeDasharray="1 1" className="chart-grid" />
        <XAxis dataKey="day" {...AxisStyle} />
        <YAxis domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)} %`} {...AxisStyle} />
        <Tooltip content={<MeanOnlyTooltip />} />
        <Area dataKey={`${which[0]}25`} stackId={which} stroke="none" fillOpacity={0} className={`${which}-epoch`} />
        {showBand && (
          <Area
            dataKey={`${which[0]}Band`}
            stackId={which}
            name={`${label}${t('charts.earlyLateSeason.iqrSuffix')}`}
            stroke="none"
            fill={which === "late" ? "rgba(214,41,41,0.20)" : "rgba(66,135,245,0.25)"}
            className={`${which}-epoch`}
          />
        )}
        <Line
          type="monotone"
          dataKey={`${which[0]}Mean`}
          name={`${label}${t('charts.earlyLateSeason.meanSuffix')}`}
          stroke={color}
          strokeWidth={3}
          connectNulls
          dot={false}
          className={`${which}-epoch`}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );

  const showEarlyBand = true;
  const showLateBand = true;

  return (
    <div style={{ position:"relative", width:"100%", height:HEIGHT }}>
      <div style={{ position:"absolute", left:80, top:`${TITLE_Y}px`, zIndex:5, fontSize:28, fontWeight:600, color:"#0f172a", pointerEvents:"none" }}>
        {t('charts.earlyLateSeason.earlyTitle')}
      </div>
      <div style={{ position:"absolute", left:80, top:`${HALF+TITLE_Y}px`, zIndex:5, fontSize:28, fontWeight:600, color:"#0f172a", pointerEvents:"none" }}>
        {t('charts.earlyLateSeason.lateTitle')}
      </div>
      <div style={{ position:"absolute", right:20, top:`${HALF+TITLE_Y}px`, zIndex:5, display:"flex", flexDirection:"column", alignItems:"flex-end", opacity:stage===2?1:0, pointerEvents:"none" }}>
        <div style={{ fontSize:42, fontWeight:600, color:"#d62929" }}>
          <span id="lossValue">{typeof meanLossPct === "number" ? meanLossPct : 0}</span>%
        </div>
        <div style={{ fontSize:14, color:"#64748b" }}>
          {t('charts.earlyLateSeason.lessIce')}
        </div>
      </div>

      {Panel("early","#4287f5","2017-20",showEarlyBand)}
      {Panel("late" ,"#d62929","2021-25",showLateBand)}
    </div>
  );
}
