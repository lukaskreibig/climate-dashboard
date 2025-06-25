"use client";

import React from "react";
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid,
} from "recharts";

interface Props { data: { year: number; anomaly: number }[] }

export default function MeanSpringAnomalyChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={420}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="chart-grid" />
        <XAxis dataKey="year" tick={{ fill: "#94a3b8" }} />
        <YAxis
          tick={{ fill: "#94a3b8" }}
          label={{ value: "km²", angle: -90, position: "insideLeft", fill: "#94a3b8" }}
        />
        <Tooltip contentStyle={{ background: "#0f172a", border: "none" }} />
        {/* 0-line reference */}
        <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="anomaly"
          stroke="#38bdf8"
          dot={false}
          strokeWidth={3}
          className="chart-line"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
