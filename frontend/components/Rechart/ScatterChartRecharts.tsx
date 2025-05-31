"use client";
import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  Scatter, Line
} from "recharts";

interface AnnualRowScatter {
  Year: number;
  Glob?: number|null;
  SeaIceMean?: number|null;
}
interface Props {
  data: AnnualRowScatter[];
}

export default function ScatterChartRecharts({ data }: Props) {
  const valid = data.filter(d => d.Glob!=null && d.SeaIceMean!=null) as Required<Pick<AnnualRowScatter,"Year"|"Glob"|"SeaIceMean">>[];
  if (!valid.length) {
    return <p>No scatter data found.</p>;
  }
  // Build scatter points => { x, y, Year }
  const scatterData = valid.map(d => ({
    x: d.Glob,
    y: d.SeaIceMean,
    Year: d.Year
  }));
  
  // Compute linear regression slope + intercept
  const { slope, intercept, xMin, xMax } = useMemo(()=> {
    let sumX=0, sumY=0, sumXY=0, sumXX=0;
    const n = scatterData.length;
    scatterData.forEach(pt=>{
      sumX += pt.x; sumY += pt.y; sumXY += pt.x*pt.y; sumXX += pt.x*pt.x;
    });
    const slope_ = (n*sumXY - sumX*sumY)/(n*sumXX - sumX*sumX);
    const intercept_ = (sumY - slope_* sumX)/n;
    const xVals = scatterData.map(d=>d.x);
    const min_ = Math.min(...xVals);
    const max_ = Math.max(...xVals);
    return { slope: slope_, intercept: intercept_, xMin: min_, xMax: max_ };
  }, [scatterData]);

  // Build line points => 2 points
  const lineData = [
    { x: xMin, y: slope*xMin + intercept },
    { x: xMax, y: slope*xMax + intercept }
  ];

  return (
    <div style={{ width:"100%", height:400 }}>
      <ResponsiveContainer>
        <ComposedChart margin={{ top:20, right:20, bottom:20, left:20 }}>
          <CartesianGrid  className="chart-grid" strokeDasharray="3 3" />
          <XAxis  className="chart-axis" 
            type="number" 
            dataKey="x" 
            name="Global Temp" 
            tickCount={5}
          />
          <YAxis  className="chart-axis" 
            type="number" 
            dataKey="y" 
            name="Sea Ice Mean"
            label={{ value:"Sea Ice Mean in million km²", angle:-90, position:"outsideLeft", offset: 20}}
          />
          <Tooltip 
            formatter={(val,name) => typeof val==="number"? val.toFixed(2): val}
            labelFormatter={() => ""} // to not show weird label
          />
          <Legend className="chart-grid" />

          {/* The Scatter points */}
          <Scatter 
            data={scatterData} 
            name="Global vs Sea Ice" 
            fill="#82ca9d"
            line={false} // don't connect them 
            // shape="circle"
          />

          {/* The trend line as a separate <Line /> */}
          <Line
            data={lineData}
            type="linear"
            dataKey="y"
            xAxisId="0" // default
            yAxisId="0"
            stroke="orange"
            dot={false}
            strokeWidth={1.5} 
            name="Trendline"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
