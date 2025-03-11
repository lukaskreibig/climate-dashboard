"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";

interface DailySeaIceRow {
  Year: number;
  DayOfYear: number;
  Extent?: number | null;
}
interface Props {
  data: DailySeaIceRow[];
  chosenYear: number;
}

/**
 * We compute the baseline from all years != chosenYear, then compute the daily anomaly for chosenYear.
 * In a real app, you might do that in the Python side or pass "df_annual" from the server.
 */
export default function DailyAnomalyChartRecharts({ data, chosenYear }: Props) {
  // Filter out chosen year
  const base = useMemo(()=> data.filter(d => d.Year !== chosenYear && d.Extent!=null), [data, chosenYear]);
  const chosen = useMemo(()=> data.filter(d => d.Year === chosenYear && d.Extent!=null), [data, chosenYear]);

  if(chosen.length===0) {
    return <p className="text-gray-500 p-2">No daily data for {chosenYear}.</p>;
  }

  // Build a map of DayOfYear -> mean baseline extent
  const baselineMap = new Map<number, number>();
  {
    const byDay = new Map<number, number[]>();
    base.forEach(d => {
      if(!byDay.has(d.DayOfYear)) byDay.set(d.DayOfYear, []);
      byDay.get(d.DayOfYear)!.push(d.Extent!);
    });
    byDay.forEach((arr, day) => {
      const m = arr.reduce((s,v)=>s+v, 0)/arr.length;
      baselineMap.set(day, m);
    });
  }

  // Build anomalies
  const anomalyData = chosen.map(d => {
    const baseVal = baselineMap.get(d.DayOfYear) || 0;
    const anom = (d.Extent ?? 0) - baseVal;
    return {
      dayOfYear: d.DayOfYear,
      anomaly: anom
    };
  }).sort((a,b) => a.dayOfYear - b.dayOfYear);

  return (
    <div style={{ width:"100%", height:400 }}>
      <ResponsiveContainer>
        <LineChart data={anomalyData} margin={{ top:20, right:20, bottom:20, left:0 }}>
          <CartesianGrid strokeDasharray="3 3"/>
          <XAxis 
            dataKey="dayOfYear"
            name="Day of Year"
            type="number"
            domain={[1,366]}
            tickCount={12}
          />
          <YAxis/>
          <Tooltip 
            formatter={(val)=>typeof val==="number"? val.toFixed(2): val}
            />
          <Legend />
          {/* horizontal line at 0 -> we can do a reference line or a custom line */}
          <Line
            type="monotone"
            dataKey="anomaly"
            name={`Daily Anomaly (${chosenYear})`}
            stroke="#8884d8"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
