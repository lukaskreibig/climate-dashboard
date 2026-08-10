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

// Required only strips the question mark and leaves | null standing, so the
// six arithmetic reads below were all unchecked. Spelled out instead.
type ValidRow = { Year: number; Glob: number; SeaIceMean: number };

export default function ScatterChartRecharts({ data }: Props) {
  // Everything derived sits above the empty-data guard on purpose. The useMemo
  // used to come after it, so on a slow API the first render returned early,
  // the second called one hook more, and React throws. Three sibling charts had
  // the same shape and were fixed; this one was missed.
  //
  // The dependency is `data` rather than the mapped array: the mapping produced
  // a new array on every render, so the memo recomputed every time anyway.
  const { scatterData, slope, intercept, xMin, xMax } = useMemo(() => {
    const valid = data.filter(
      (d): d is ValidRow => d.Glob != null && d.SeaIceMean != null
    );
    const points = valid.map((d) => ({ x: d.Glob, y: d.SeaIceMean, Year: d.Year }));

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    const n = points.length;
    points.forEach((pt) => {
      sumX += pt.x; sumY += pt.y; sumXY += pt.x * pt.y; sumXX += pt.x * pt.x;
    });
    // A single point, or several sharing one x, leaves the slope 0/0. Recharts
    // would draw a line of NaNs, which renders as nothing and looks like a
    // styling bug rather than a data one.
    const denominator = n * sumXX - sumX * sumX;
    const slope_ = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
    const intercept_ = n === 0 ? 0 : (sumY - slope_ * sumX) / n;
    const xVals = points.map((d) => d.x);

    return {
      scatterData: points,
      slope: slope_,
      intercept: intercept_,
      xMin: n ? Math.min(...xVals) : 0,
      xMax: n ? Math.max(...xVals) : 0,
    };
  }, [data]);

  if (!scatterData.length) {
    return <p>No scatter data found.</p>;
  }

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
            formatter={(val) => (typeof val === "number" ? val.toFixed(2) : val)}
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
