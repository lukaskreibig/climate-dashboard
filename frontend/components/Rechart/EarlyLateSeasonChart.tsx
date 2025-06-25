/* ------------------------------------------------------------------
   EarlyLateSeasonChart.tsx
   4 interactive stages:
     0 – early-epoch mean line
     1 – add early IQR envelope
     2 – add late-epoch mean line
     3 – add late IQR envelope
------------------------------------------------------------------ */
"use client";

import React, { useState, useImperativeHandle } from "react";
import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid,
  XAxis, YAxis, Tooltip, ReferenceArea,
} from "recharts";

/* ─── shape coming from page.tsx buildDatasets() -------------- */
export interface Row {
  day   : string;  // "01-Mar"
  early : number;  // mean 2017-20
  late  : number;  // mean 2021-25
  iqr25 : number;  // 25-pct (early epoch)
  iqr75 : number;  // 75-pct (early epoch)
  l25?  : number;  // 25-pct (late)  – optional, chart still works if missing
  l75?  : number;  // 75-pct (late)
}

export type EarlyLateApi = { nextStep: () => void };

interface Props {
  data  : Row[];
  apiRef?: React.MutableRefObject<EarlyLateApi | null>;
}

export default function EarlyLateSeasonChart({ data, apiRef }: Props) {
  /* stage advances via ChartScene.actions → nextStep() */
  const [stage, setStage] = useState(0);

  useImperativeHandle(apiRef, () => ({
    nextStep: () => setStage(s => Math.min(s + 1, 3)),
  }), []);

  return (
    <ResponsiveContainer width="100%" height={440}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="chart-grid" />
        <XAxis dataKey="day" tick={false} />
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Tooltip
          formatter={(v: number) => v.toFixed(2)}
          labelFormatter={l => l}
          contentStyle={{ background:"#0f172a", border:"none" }}
        />

        {/* early-epoch IQR envelope (blue) */}
        {stage >= 1 && (
          <ReferenceArea
            y1="iqr25" y2="iqr75"
            stroke="none" fill="#60a5fa" fillOpacity={0.2}
          />
        )}

        {stage >= 3 && data[0].l25 != null && data[0].l75 != null && (
          <ReferenceArea
            y1="l25" y2="l75"
            stroke="none" fill="#f87171" fillOpacity={0.2}
          />
        )}

        {/* late mean (red) */}
        {stage >= 2 && (
          <Area
            type="monotone" dataKey="late"
            stroke="#f43f5e" fill="none" strokeWidth={3}
            isAnimationActive={false}
          />
        )}

        {/* early mean (blue) */}
        <Area
          type="monotone" dataKey="early"
          stroke="#3b82f6" fill="none" strokeWidth={3}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
