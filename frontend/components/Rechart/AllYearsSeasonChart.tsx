"use client";

/* ------------------------------------------------------------------
   AllYearsSeasonChart.tsx – v6  (v4 layout  + simple GSAP stagger)
------------------------------------------------------------------ */
import React, { useMemo, useRef, useEffect, MutableRefObject } from "react";
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslation } from 'react-i18next';

gsap.registerPlugin(ScrollTrigger);

/* ─── data & API types ────────────────────────────────────────────── */
interface Row { year:number; doy:number; frac:number }
export type AllYearsApi = {}
interface Props {
  data  : Row[];
  apiRef?: MutableRefObject<AllYearsApi|null>;
}

/* ─── constants ──────────────────────────────────────────────────── */
const COLS = 3;    
const SUN_START = 45;   // 14‑Feb
const SUN_END   = 180;  // 29‑Jun
const MINI_W    = 200;
const MINI_H    = 120;
const COLORS    = [
  "#38bdf8","#0ea5e9","#0284c7","#0369a1",
  "#14b8a6","#22c55e","#eab308","#f97316",
  "#ef4444","#dc2626"
];

/* ─── helpers ─────────────────────────────────────────────────────── */
const doyLabel = (doy:number) => {
  const d = new Date(Date.UTC(2020,0,doy));
  return `${String(d.getUTCDate()).padStart(2,"0")}-${d.toLocaleString(
    "en-US",{month:"short",timeZone:"UTC"})}`;
};

const densify = (rows:Row[]) => {
  const out:Row[] = [], idx = new Map(rows.map(r=>[`${r.year}-${r.doy}`,r]));
  [...new Set(rows.map(r=>r.year))].forEach(y=>{
    for(let doy=SUN_START; doy<=SUN_END; doy++)
      out.push(idx.get(`${y}-${doy}`) ?? {year:y,doy,frac:NaN});
  });
  return out;
};

/* ─── component ──────────────────────────────────────────────────── */
export default function AllYearsSeasonChart({data}:Props){
  const { t } = useTranslation();
  const dense = useMemo(()=>densify(data),[data]);
  const years = useMemo(()=>[...new Set(data.map(r=>r.year))].sort(),[data]);

  /* monthly tick DOYs */
  const ticks = [45,74,105,135,166,180];

  /* GSAP stagger ---------------------------------------------------- */
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const el = gridRef.current; if(!el) return;
    gsap.fromTo(Array.from(el.children),
      { opacity:0, y:20 },
      { opacity:1, y:0, stagger:0.12, duration:0.6, ease:"power2.out",
        scrollTrigger:{ trigger:el, start:"top 85%" } }
    );
  },[]);

  /* layout styles */
  const gridStyle:React.CSSProperties = {
    display:"grid", gridTemplateColumns: `repeat(${COLS}, 1fr)`,
    
    gap:24, justifyItems:"center", paddingTop:96,
  };

  const Mini = (yr:number,i:number) => (
    <div key={yr} style={{width:"100%"}}>
      <ResponsiveContainer width="100%" height={MINI_H}>
        <LineChart data={dense.filter(r=>r.year===yr)} margin={{left:8,right:8,top:24,bottom:24}}>
          <CartesianGrid strokeDasharray="2 3" stroke="#CBD5E1" vertical={false}/>
          <XAxis dataKey="doy" type="number" domain={[SUN_START,SUN_END]} ticks={ticks}
            tickFormatter={d=>doyLabel(Number(d)).split("-")[1]} tick={{fill:"#94a3b8",fontSize:10,dy:6}}
            axisLine={false} tickLine={false} height={18}/>
          <YAxis domain={[0,1]} ticks={[0,0.5,1]} tickFormatter={v=>`${(v*100).toFixed(0)} %`}
            tick={{fill:"#94a3b8",fontSize:10,dx:-4}} width={28} axisLine={false} tickLine={false}/>
          <Tooltip cursor={{stroke:"#64748b",strokeDasharray:"3 3"}} formatter={(v:number)=>`${(v*100).toFixed(1)} %`}
            labelFormatter={l=>doyLabel(Number(l))}/>
          <Line type="monotone" dataKey="frac" connectNulls dot={false}
            stroke={COLORS[i%COLORS.length]} strokeWidth={2}/>
        </LineChart>
      </ResponsiveContainer>
      <div style={{textAlign:"center",fontSize:12,color:"#64748b",marginTop:4}}>{yr}</div>
    </div>
  );

  return (
    <div style={{position:"relative",width:"100%"}}>
      {/* title */}
      <div style={{position:"absolute",left:20,top:32,fontSize:28,fontWeight:600,color:"#0f172a"}}>
        {t('charts.allYearsSeason.title')}
      </div>

      {/* mini-chart grid */}
      <div ref={gridRef} style={gridStyle}>{years.map(Mini)}</div>
    </div>
  );
}