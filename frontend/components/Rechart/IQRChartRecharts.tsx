
// @ts-nocheck
"use client";
import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  Area, Line
} from "recharts";

interface IQRStatsRow {
  DayOfYear: number;
  minVal: number;
  q25: number;
  q75: number;
  meanVal: number;
}
interface PartialRow {
  DayOfYear: number;
  Extent: number;
}
interface Props {
  stats: IQRStatsRow[];    // from python iqrStats
  partial2025: PartialRow[]; // from python partial2025
}

export default function IQRChartRecharts({ stats,   partial2025 = [],}: Props) {
  if(!stats || !stats.length) {
    return <p>No IQR stats found.</p>;
  }
  // sort
  const mainData = [...stats].sort((a,b)=> a.DayOfYear - b.DayOfYear);
  const partialData = [...partial2025].sort((a,b)=> a.DayOfYear - b.DayOfYear);

  console.log("is this rendering?")

  // We'll do a single ComposedChart. 
  // mainData => has q25, q75, meanVal, minVal
  // We'll define area => q25->q75, a line => meanVal, a line => minVal (dashed), and a line => partial2025

  // We want dayOfYear from 1..366
  // Find min & max extent
  let minE= Infinity, maxE=-Infinity;
  mainData.forEach(d=>{
    [d.minVal, d.q25, d.q75, d.meanVal].forEach(v=>{
      if(v<minE) minE=v;
      if(v>maxE) maxE=v;
    });
  });
  partialData.forEach(d=>{
    if(d.Extent<minE) minE=d.Extent;
    if(d.Extent>maxE) maxE=d.Extent;
  });

  return (
    <div style={{ width:"100%", height:400}}>
      <ResponsiveContainer>
        <ComposedChart margin={{ top:20, right:20, bottom:40, left:20 }}>
          <CartesianGrid  className="chart-grid" strokeDasharray="3 3"/>
          <XAxis  className="chart-axis"
            type="number"
            dataKey="DayOfYear"
            domain={[1,366]}
            tickCount={12}
          />
          <YAxis  className="chart-axis"
            domain={[minE, maxE]}
            label={{ value:"Sea Ice Extent", angle:-90, position:"insideLeft"}}
          />
          <Tooltip formatter={(val)=>(typeof val==="number"? val.toFixed(2) : parseInt(val).toFixed(2))}/>
          <Legend className="chart-axis" />

          {/* The IQR area => we must feed one combined array. We'll do area referencing q25 & q75. */}
          <Area 
            data={mainData}
            name="IQR (25-75%)"
            type="monotone"
            xAxisId={0}
            yAxisId={0}
            dataKey={(obj: IQRStatsRow)=> [obj.q25, obj.q75]}
            stroke="none"
            fill="skyblue"
            fillOpacity={0.4}
          />
          
          {/* meanVal line */}
          <Line
            data={mainData}
            dataKey="meanVal"
            name="Mean"
            stroke="black"
            dot={false}
          />
          {/* minVal line => dashed */}
          <Line
            data={mainData}
            dataKey="minVal"
            name="Min"
            stroke="red"
            strokeDasharray="3 3"
            dot={false}
          />

          {/* partial 2025 => a separate line */}
          {partialData.length>0 && (
            <Line
              data={partialData}
              dataKey="Extent"
              name="2025"
              stroke="orange"
              dot={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      </div>
  );
}
// @ts-nocheck
