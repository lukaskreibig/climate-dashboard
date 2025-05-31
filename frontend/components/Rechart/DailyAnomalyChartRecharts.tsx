"use client";
import React, { useMemo, useState, useImperativeHandle } from "react";
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend
} from "recharts";

/* ------------- types -------------------------------------------- */
interface Row { Year:number; DayOfYear:number; Extent?:number|null }
interface Props {
  data       : Row[];
  chosenYear : number;
  apiRef?    : React.MutableRefObject<any>;
}

/* ------------- component ---------------------------------------- */
export default function DailyAnomalyChartRecharts({
  data, chosenYear, apiRef
}:Props){
  const [year, setYear] = useState(chosenYear);

  /* expose imperative API (called by ChartScene.actions) ---------- */
  useImperativeHandle(apiRef, ()=>({
    nextYear: () => setYear(y => y + 1),
  }));

  /* baseline (all years except current) --------------------------- */
  const baselineMap = useMemo(()=>{
    const base = data.filter(r => r.Year !== year && r.Extent!=null);
    const byDay = new Map<number, number[]>();
    base.forEach(r=>{
      byDay.set(r.DayOfYear, [...(byDay.get(r.DayOfYear) ?? []), r.Extent!]);
    });
    const m = new Map<number, number>();
    byDay.forEach((arr, day)=> {
      m.set(day, arr.reduce((s,v)=>s+v,0)/arr.length);
    });
    return m;
  },[data, year]);

  /* chosen year anomalies ---------------------------------------- */
  const chosen = data.filter(r=>r.Year===year && r.Extent!=null);
  if(!chosen.length) return <p className="text-gray-500 p-2">
    No daily data for {year}.
  </p>;

  const anoms = chosen.map(r=>({
    dayOfYear: r.DayOfYear,
    anomaly : (r.Extent ?? 0) - (baselineMap.get(r.DayOfYear) ?? 0)
  })).sort((a,b)=>a.dayOfYear-b.dayOfYear);

  /* ------------- render ----------------------------------------- */
  return(
    <div className="h-[400px] w-full">
      <ResponsiveContainer>
        <LineChart data={anoms} margin={{top:20,right:20,bottom:20,left:0}}>
          <CartesianGrid className="chart-grid" strokeDasharray="3 3"/>
          <XAxis className="chart-axis"
                 dataKey="dayOfYear" type="number" domain={[1,366]}
                 tickCount={12}/>
          <YAxis className="chart-axis"/>
          <Tooltip formatter={v=>typeof v==="number"?v.toFixed(2):v}/>
          <Legend/>
          <Line type="monotone" dataKey="anomaly"
                name={`Daily Anomaly (${year})`}
                stroke="#8884d8" dot={false}/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
