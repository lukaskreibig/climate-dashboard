"use client";
import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

export interface AnnualRowBar {
  Year: number;
  "64N-90N"?: number | null;
  Glob?: number | null;
}

interface Props {
  data: AnnualRowBar[];
}

const HEADLINE = (
  <>
      Comparing Arctic Temperature Anomaly&nbsp;
    <span className="inline-block w-3 h-3 bg-red-500 align-baseline rounded-sm" />
    &nbsp;and Mean Global Temperature Anomaly&nbsp;
    <span className="inline-block w-3 h-3 bg-blue-500 align-baseline rounded-sm" />
        &nbsp;in 2024
  </>
);

export default function BarChart2024Recharts({ data }: Props) {
  // Find row for 2024
  const row2024 = data.find(d => d.Year === 2024);
  if (!row2024 || row2024["64N-90N"] == null || row2024.Glob == null) {
    return <p className="text-gray-500 p-2">No 2024 data found for Arctic/Global.</p>;
  }

  // Build a small array with the values
  const chartData = [
    { location: "Arctic", value: row2024["64N-90N"] },
    { location: "Global", value: row2024.Glob }
  ];

  return (
    <div style={{ width: "100%", height: 400 }}>
       <div className="text-center font-semibold text-slate-800 mb-1 select-none text-sm sm:text-base">
        {HEADLINE}
      </div>
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
          <CartesianGrid  className="chart-grid" strokeDasharray="3 3" />
          <XAxis  className="chart-axis" dataKey="location" />
          <YAxis  className="chart-axis" />
          <Tooltip formatter={(val) => typeof val === "number" ? val.toFixed(2) : val} />
          <Legend className="chart-grid" />
          <Bar dataKey="value" name="Mean Anomaly">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.location === "Arctic" ? "red" : "blue"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
