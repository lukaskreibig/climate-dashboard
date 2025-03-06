"use client";
import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
} from "recharts";

interface AnnualRow {
  Year: number;
  Glob?: number | null;
  ["64N-90N"]?: number | null;
  GlobalCO2Mean?: number | null;
}

interface Props {
  data: AnnualRow[];
}

const numberFormatter = (value: number) => value.toFixed(2);

// Custom tooltip formatter that formats CO₂ values differently
const tooltipFormatter = (value: any, name: string) => {
  if (name === "CO₂" && typeof value === "number") {
    return [(value / 1e9).toFixed(2) + " Gt", name];
  }
  return [typeof value === "number" ? value.toFixed(2) : value, name];
};

export default function MultiLineChartRecharts({ data }: Props) {
  // Filter valid data and sort by Year
  const valid = data.filter((d) => d.Year != null).sort((a, b) => a.Year - b.Year);

  return (
    <div style={{ width: "100%", height: 400 }}>
      <ResponsiveContainer>
        <ComposedChart data={valid} margin={{ top: 20, right: 30, bottom: 40, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="Year"
            tickFormatter={(y) => String(y)}
            angle={-45}
            textAnchor="end"
            interval={0}
            height={60}
          />

          {/* Left Y-axis for temperature anomalies */}
          <YAxis
            yAxisId="temp"
            label={{ value: "Temp Anomaly (°C)", angle: -90, position: "insideLeft" }}
            tickFormatter={numberFormatter}
          />

          {/* Right Y-axis for CO₂ values: format in gigatonnes */}
          <YAxis
            yAxisId="co2"
            orientation="right"
            tickFormatter={(val: number) => (typeof val === "number" ? (val / 1e9).toFixed(2) : val)}
            label={{ value: "CO₂ (Gt)", angle: 90, position: "insideRight" }}
          />

          <Tooltip formatter={tooltipFormatter} labelFormatter={(year) => `Year: ${year}`} />
          <Legend />

          {/* Arctic line */}
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="64N-90N"
            name="Arctic"
            stroke="#ef4444"
            dot={false}
          />

          {/* Global line */}
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="Glob"
            name="Global"
            stroke="#3b82f6"
            dot={false}
          />

          {/* CO₂ line */}
          <Line
            yAxisId="co2"
            type="monotone"
            dataKey="GlobalCO2Mean"
            name="CO₂"
            stroke="#10b981"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
