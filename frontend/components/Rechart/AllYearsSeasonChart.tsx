"use client";

/* ------------------------------------------------------------------
   AllYearsSeasonChart.tsx – v6  (v4 layout  + simple GSAP stagger)
------------------------------------------------------------------ */
import React, {
  useMemo,
  useRef,
  useEffect,
  MutableRefObject,
  useImperativeHandle,
  useState,
} from "react";
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslation } from 'react-i18next';
import i18n from "@/i18n/client";
import { ChartEmptyState, ChartSourceBadge } from "@/components/ChartExplainers";
import { prefersReducedMotion } from "@/lib/reducedMotion";

gsap.registerPlugin(ScrollTrigger);

/* ─── data & API types ────────────────────────────────────────────── */
interface Row { year:number; doy:number; frac:number | null }
export type AllYearsApi = {
  showMode: (mode: "all" | "early" | "late" | "latest") => void;
  nextStage: () => void;
}
interface Props {
  data  : Row[];
  apiRef?: MutableRefObject<AllYearsApi|null>;
}

/* ─── constants ──────────────────────────────────────────────────── */
const SUN_START = 45;   // 14‑Feb
const SUN_END   = 180;  // 29‑Jun
const MINI_H    = 120;
const COLORS    = [
  "#38bdf8","#0ea5e9","#0284c7","#0369a1",
  "#14b8a6","#22c55e","#eab308","#f97316",
  "#ef4444","#dc2626"
];

/* ─── helpers ─────────────────────────────────────────────────────── */
const doyLabel = (doy: number, locale: string = 'de-DE') => {
  const d = new Date(Date.UTC(2020, 0, doy));
  return `${String(d.getUTCDate()).padStart(2, "0")}-${d.toLocaleString(
    locale, { month: "short", timeZone: "UTC" }
  )}`;
};

const densify = (rows:Row[]) => {
  const out:Row[] = [], idx = new Map(rows.map(r=>[`${r.year}-${r.doy}`,r]));
  [...new Set(rows.map(r=>r.year))].forEach(y=>{
    for(let doy=SUN_START; doy<=SUN_END; doy++)
      out.push(idx.get(`${y}-${doy}`) ?? {year:y,doy,frac:null});
  });
  return out;
};

/* ─── component ──────────────────────────────────────────────────── */
export default function AllYearsSeasonChart({data, apiRef}:Props){
  const { t } = useTranslation();
  const [mode, setMode] = useState<"all" | "early" | "late" | "latest">("all");
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const dense = useMemo(()=>densify(data),[data]);
  const years = useMemo(()=>[...new Set(data.map(r=>r.year))].sort((a,b)=>a-b),[data]);
  const splitAt = Math.ceil(years.length / 2);
  const earlyYears = useMemo(() => new Set(years.slice(0, splitAt)), [years, splitAt]);
  const lateYears = useMemo(() => new Set(years.slice(splitAt)), [years, splitAt]);
  const latestYear = years.at(-1) ?? null;

  useImperativeHandle(apiRef, () => ({
    showMode: (nextMode) => setMode(nextMode),
    nextStage: () => setMode((current) => {
      if (current === "all") return "early";
      if (current === "early") return "late";
      if (current === "late") return "latest";
      return "all";
    }),
  }), []);

  if (!years.length) {
    return (
      <ChartEmptyState title={t("charts.allYearsSeason.emptyTitle")}>
        {t("charts.allYearsSeason.emptyBody")}
      </ChartEmptyState>
    );
  }

  /* monthly tick DOYs */
  const ticks = [45,74,105,135,166,180];

  /* GSAP stagger ---------------------------------------------------- */
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const el = gridRef.current; if(!el) return;
    if (prefersReducedMotion()) {
      gsap.set(Array.from(el.children), { opacity:1, y:0 });
      return;
    }
    gsap.fromTo(Array.from(el.children),
      { opacity:0, y:20 },
      { opacity:1, y:0, stagger:0.12, duration:0.6, ease:"power2.out",
        scrollTrigger:{ trigger:el, start:"top 85%" } }
    );
  },[]);

  /* layout styles */
  const gridStyle:React.CSSProperties = {
    display:"grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap:18,
    justifyItems:"center",
    paddingTop:86,
  };

  const isDimmed = (yr: number) => {
    if (hoverYear !== null) return hoverYear !== yr;
    if (mode === "early") return !earlyYears.has(yr);
    if (mode === "late") return !lateYears.has(yr);
    if (mode === "latest") return yr !== latestYear;
    return false;
  };

  const Mini = (yr:number,i:number) => (
    <div
      key={yr}
      className={`transition-opacity duration-300 ${isDimmed(yr) ? "opacity-25" : "opacity-100"}`}
      style={{width:"100%"}}
      onMouseEnter={() => setHoverYear(yr)}
      onMouseLeave={() => setHoverYear(null)}
    >
      <ResponsiveContainer width="100%" height={MINI_H}>
        <LineChart data={dense.filter(r=>r.year===yr)} margin={{left:8,right:8,top:24,bottom:24}}>
          <CartesianGrid className="chart-grid" strokeDasharray="2 3" stroke="#CBD5E1" vertical={false}/>
          <XAxis dataKey="doy" type="number" domain={[SUN_START,SUN_END]} ticks={ticks}
            tickFormatter={d => doyLabel(Number(d), i18n.language === 'de' ? 'de-DE' : 'en-US').split("-")[1]}
            axisLine={false} tickLine={false} height={18} className="chart-axis"/>
          <YAxis domain={[0,1]} ticks={[0,0.5,1]} tickFormatter={v=>`${(v*100).toFixed(0)} %`}
            tick={{fill:"#94a3b8",fontSize:10,dx:-4}} width={28} axisLine={false} tickLine={false} className="chart-axis"/>
                    <Tooltip 
            cursor={{ stroke: "#64748b", strokeDasharray: "3 3" }} 
            formatter={(v: number) => `${(v * 100).toFixed(1)} %`}
            labelFormatter={l => doyLabel(Number(l), i18n.language === 'de' ? 'de-DE' : 'en-US')}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              padding: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            labelStyle={{ color: '#1e293b', fontWeight: 600 }}
            itemStyle={{ color: '#475569' }}
          />
          <Line type="monotone" dataKey="frac" name={i18n.language === 'de' ? 'Anteil Meereis' : 'Fraction Sea Ice'} connectNulls dot={false}
            stroke={COLORS[i%COLORS.length]} strokeWidth={yr === latestYear ? 2.8 : 2}/>
        </LineChart>
      </ResponsiveContainer>
      <div style={{textAlign:"center",fontSize:12,color:"#64748b",marginTop:4}}>{yr}</div>
    </div>
  );

  return (
    <div style={{position:"relative",width:"100%"}} role="img" aria-label={t("charts.ariaSummaries.allYearsSeason")}>
      {/* title */}
      <div style={{position:"absolute",left:20,top:32,fontSize:28,fontWeight:600,color:"#0f172a",maxWidth:"clamp(220px, calc(100% - 380px), 680px)",lineHeight:1.1}}>
        {t('charts.allYearsSeason.title')}
      </div>
      <div className="absolute right-4 top-8">
        <ChartSourceBadge href="https://sentinels.copernicus.eu/copernicus/sentinel-2">
          {t("charts.allYearsSeason.source")}
        </ChartSourceBadge>
      </div>

      {/* mini-chart grid */}
      <div ref={gridRef} style={gridStyle}>{years.map(Mini)}</div>
    </div>
  );
}
