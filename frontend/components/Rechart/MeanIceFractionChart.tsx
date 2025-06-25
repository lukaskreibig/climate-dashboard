"use client";

import React from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

interface Props { data: { year: number; fraction: number }[] }

export default function MeanIceFractionChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={380}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="chart-grid" />
        <XAxis dataKey="year" tick={{ fill: "#94a3b8" }} />
        <YAxis
          domain={[0, 1]}
          tickFormatter={v => `${(v * 100).toFixed(0)} %`}
          tick={{ fill: "#94a3b8" }}
        />
        <Tooltip formatter={v => `${(v as number * 100).toFixed(1)} %`} />
        <Bar dataKey="fraction" fill="#38bdf8" className="chart-bar" />
      </BarChart>
    </ResponsiveContainer>
  );
}
