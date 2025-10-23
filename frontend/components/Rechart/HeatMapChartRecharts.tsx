// @ts-nocheck
"use client";

import React from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Legend,
  type TooltipProps,
} from "recharts";
import * as d3 from "d3";

interface HeatmapRow {
  rowLabel: string;
  colLabel: string;
  value: number;
}

/**
 * Suppose we have a correlation matrix with "rowLabel", "colLabel", "value" in [-1..1].
 */
interface HeatmapChartRechartsProps {
  data: HeatmapRow[]; 
  rowDomain: string[];  // e.g. ["Global Temperature","Arctic Temperature","CO2 Emissions"]
  colDomain: string[];  // same or similar
}


export default function HeatmapChartRecharts({ data, rowDomain, colDomain }: HeatmapChartRechartsProps) {
  // We'll transform each cell into { x, y, z } so that 
  // x = index of colLabel, y = index of rowLabel, z = correlation value.
  const rowIndexMap = new Map(rowDomain.map((r,i)=>[r,i]));
  const colIndexMap = new Map(colDomain.map((c,i)=>[c,i]));
  const scatterData = data.map(d => ({
    x: colIndexMap.get(d.colLabel),
    y: rowIndexMap.get(d.rowLabel),
    z: d.value
  }));

  // We'll define a color scale for z in [-1,1].
  const colorScale = d3.scaleSequential(d3.interpolateRdBu).domain([1, -1]);

  type CustomSquareProps = {
    cx?: number;
    cy?: number;
    size?: number;
    payload?: { z?: number };
  };

  const CustomSquare: React.FC<CustomSquareProps> = ({ cx = 0, cy = 0, size = 24, payload }) => {
    const value = payload?.z ?? 0;
    const half = size / 2;
    return (
      <rect
        x={cx - half}
        y={cy - half}
        width={size}
        height={size}
        fill={colorScale(value)}
      />
    );
  };

  const tooltipFormatter: TooltipProps<number, string>["formatter"] = (value) => {
    if (typeof value !== "number") return ["-", "Corr"];
    return [value.toFixed(2), "Corr"];
  };

  return (
    <div style={{ width:"100%", height:400 }}>
      <ResponsiveContainer>
        <ScatterChart margin={{ top:20, right:20, bottom:20, left:20 }}>
          {/* We'll define xAxis range = [0, colDomain.length], yAxis range = [0, rowDomain.length] */}
          <XAxis  className="chart-axis"
            type="number"
            dataKey="x"
            domain={[0, colDomain.length]}
            tickCount={colDomain.length+1}
            tickFormatter={idx => colDomain[idx]||""}
          />
          <YAxis  className="chart-axis"
            type="number"
            dataKey="y"
            domain={[0, rowDomain.length]}
            tickCount={rowDomain.length+1}
            tickFormatter={idx => rowDomain[idx]||""}
          />
          <ZAxis dataKey="z" range={[0,1]} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={tooltipFormatter} />
          <Legend className="chart-grid" />

          <Scatter
            name="Heatmap"
            data={scatterData}
            fill="#8884d8"
            shape={(props: CustomSquareProps) => <CustomSquare {...props} size={30} />}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
// @ts-nocheck
