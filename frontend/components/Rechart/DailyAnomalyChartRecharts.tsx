"use client";

/* ------------------------------------------------------------------
   DailyAnomalyChartRecharts (v4.0)
   • Starts with ONE decade (1970s).
   • apiRef exposes showLevel(level) – set visible count *exactly*.
   • Scrolling back reduces lines; no duplicate renders possible.
------------------------------------------------------------------ */

import React, { useMemo, useState, useImperativeHandle } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useTranslation } from 'react-i18next';

/* ---------- types ------------------------------------------- */
export interface Row { Year: number; DayOfYear: number; Extent: number|null; }
export interface Props { data: Row[]; apiRef?: React.MutableRefObject<any>; }

/* ---------- helpers ----------------------------------------- */
const monthTicks = [1,32,60,91,121,152,182,213,244,274,305,335];

const colorOf = (dec:string)=>({
  "1970s":"#0f766e",  // teal
  "1980s":"#1e40af",  // blue-1
  "1990s":"#2563eb",  // blue-2
  "2000s":"#f59e0b",  // amber
  "2010s":"#ef4444",  // red
  "2020s":"#b91c1c",  // dark-red
}[dec] || "#6b7280");


/* ============================================================ */
export default function DailyAnomalyChart({ data, apiRef }: Props) {
  const { t, i18n } = useTranslation();
  
  const months = t('common.months.short', { returnObjects: true }) as string[];
  const monthOf = (d:number)=>months[ monthTicks.findLastIndex(t=>d>=t) ] ?? "";
  
  /* ---- build decades & baseline --------------------------- */
  const series = useMemo(()=>{
    /* baseline - mean extent for each day -------------------- */
    const base=new Map<number,number>();
    for(let d=1;d<=366;d++){
      const vals=data.filter(r=>r.DayOfYear===d&&r.Extent!=null).map(r=>r.Extent!);
      base.set(d, vals.reduce((s,v)=>s+v,0)/vals.length);
    }

    /* collect anomalies per decade -------------------------- */
    const byDec=new Map<string,Map<number,number[]>>();
    data.forEach(r=>{
      if(r.Extent==null) return;
      const dec=`${Math.floor(r.Year/10)*10}s`;
      if(!byDec.has(dec)) byDec.set(dec,new Map());
      const m=byDec.get(dec)!;
      const an=r.Extent - (base.get(r.DayOfYear) ?? 0);
      m.set(r.DayOfYear,[...(m.get(r.DayOfYear)??[]),an]);
    });

    return Array.from(byDec.keys()).sort().map(dec=>{
      const rows:Array<{day:number;an:number}>=[];
      byDec.get(dec)!.forEach((arr,day)=>{
        rows.push({day,an:arr.reduce((s,v)=>s+v,0)/arr.length});
      });
      rows.sort((a,b)=>a.day-b.day);
      return {decade:dec,rows,color:colorOf(dec)};
    });
  },[data]);

  /* ---- visible count & imperative API --------------------- */
  const [visible,setVisible]=useState(1);          // show 1970s only at start
  useImperativeHandle(apiRef,()=>({
    showLevel:(lvl:number)=>setVisible(Math.max(1,Math.min(lvl,series.length)))
  }),[series.length]);

  /* ---------------- render --------------------------------- */
  return(
    
    <div className="h-[400px] w-full">
         <div className="text-center font-semibold text-slate-800 mb-1 select-none text-sm sm:text-base">
        {t('charts.dailyAnomaly.title')}
      </div>
      <ResponsiveContainer>
        <LineChart margin={{top:20,right:20,bottom:20,left:40}}>
          <CartesianGrid strokeDasharray="3 3" className="chart-grid"/>
          <XAxis dataKey="day" type="number" domain={[1,366]}
                 ticks={monthTicks} tickFormatter={monthOf}
                 className="chart-axis"/>
          <YAxis label={{value:t('charts.dailyAnomaly.yAxisLabel'),angle:-90,position:"insideLeft"}}
                 className="chart-axis"/>
          <Tooltip formatter={(v:number)=>v.toFixed(3)}
                   labelFormatter={(d:number)=>`${monthOf(d)} (${t('common.day')} ${d})`}/>
          <Legend/>

          {series.slice(0,visible).map(({decade,rows,color})=>(
            <Line key={decade} data={rows} dataKey="an"
                  type="monotone" stroke={color} strokeWidth={2}
                  name={decade} dot={false}/>
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}