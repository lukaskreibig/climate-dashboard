"use client";

import React from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ReferenceDot,
} from "recharts";

interface Datum { year: number; freeze: number; breakup: number }

interface Props { data: Datum[] }

export default function FreezeBreakTimelineChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={420}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="chart-grid" />
        <XAxis dataKey="year" tick={{ fill: "#94a3b8" }} />
        <YAxis
          tickFormatter={d => `${d} doy`}           /* day-of-year */
          tick={{ fill: "#94a3b8" }}
        />
        <Tooltip />
        <Line
          type="monotone" dataKey="freeze"
          stroke="#38bdf8" dot={<ReferenceDot r={4} />} strokeWidth={2}
        />
        <Line
          type="monotone" dataKey="breakup"
          stroke="#f472b6" dot={<ReferenceDot r={4} />} strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
