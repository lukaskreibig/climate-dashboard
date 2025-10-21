"use client";

import React, { useMemo, useState, useImperativeHandle } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { useTranslation } from 'react-i18next';

export interface DecadeRow { decade: string; day: number; an: number; sd?: number|null; n: number; }
export interface Props { data: DecadeRow[]; apiRef?: React.MutableRefObject<any>; }

const monthTicks = [1,32,60,91,121,152,182,213,244,274,305,335];
const colorOf = (d:string)=>({ "1980s":"#1e40af","1990s":"#2563eb","2000s":"#f59e0b","2010s":"#ef4444","2020s":"#b91c1c" }[d] || "#6b7280");
const decadeNum = (label:string)=>parseInt(label,10) || 0;

export default function DailyAnomalyChart({ data, apiRef }: Props) {
  const { t } = useTranslation();
  const months = t('common.months.short', { returnObjects: true }) as string[];
  const monthOf = (d:number)=>months[ monthTicks.findLastIndex(t=>d>=t) ] ?? "";

  // Backend-only: Serien bauen (falls Backend doch 1970s liefert, filtern wir sie sicherheitshalber weg)
  const series = useMemo(()=>{
    const byDec = new Map<string, {day:number; an:number}[]>();
    for (const r of data) {
      if (decadeNum(r.decade) < 1980) continue;
      if (!byDec.has(r.decade)) byDec.set(r.decade, []);
      byDec.get(r.decade)!.push({ day: r.day, an: r.an });
    }
    return Array.from(byDec.entries())
      .map(([dec, rows])=>({ decade: dec, rows: rows.sort((a,b)=>a.day-b.day), color: colorOf(dec) }))
      .sort((a,b)=>decadeNum(a.decade)-decadeNum(b.decade));
  },[data]);

  const [visible,setVisible]=useState(1);
  useImperativeHandle(apiRef,()=>({ showLevel:(lvl:number)=>setVisible(Math.max(1, Math.min(lvl, series.length))) }),[series.length]);

  return (
    <div className="h-[400px] w-full">
      <div className="text-center font-semibold text-slate-800 mb-1 select-none text-sm sm:text-base">
        {t('charts.dailyAnomaly.title')}
      </div>
      <ResponsiveContainer>
        <LineChart margin={{top:20,right:20,bottom:20,left:40}}>
          <CartesianGrid strokeDasharray="3 3" className="chart-grid"/>
          <XAxis dataKey="day" type="number" domain={[1,365]} ticks={monthTicks} tickFormatter={monthOf} className="chart-axis"/>
          <YAxis label={{value:t('charts.dailyAnomaly.yAxisLabel'),angle:-90,position:"insideLeft"}} className="chart-axis"/>
          <Tooltip formatter={(v:any)=>Number(v).toFixed(3)} labelFormatter={(d:number)=>`${monthOf(d)} (${t('common.day')} ${d})`} />
          <Legend/>
          {series.slice(0,visible).map(({decade,rows,color})=>(
            <Line key={decade} data={rows} dataKey="an" type="monotone" stroke={color} strokeWidth={2} name={decade} dot={false}/>
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
