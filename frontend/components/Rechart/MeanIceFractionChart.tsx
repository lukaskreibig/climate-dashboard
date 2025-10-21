"use client";

import React, { useMemo, useEffect } from "react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import gsap from "gsap";
import { useTranslation } from 'react-i18next';

/* ─── types ────────────────────────────────────────────────────────── */
interface Datum { year: number; mean: number }
interface Props  { data: Datum[] }

/* ─── OLS slope & intercept ------------------------------------------ */
const fitTrend = (rows: Datum[]) => {
  const n   = rows.length;
  const sx  = rows.reduce((s, r) => s + r.year, 0);
  const sy  = rows.reduce((s, r) => s + r.mean, 0);
  const sxx = rows.reduce((s, r) => s + r.year * r.year, 0);
  const sxy = rows.reduce((s, r) => s + r.year * r.mean, 0);
  const denom = n * sxx - sx * sx;
  if (!denom) return { m: 0, b: 0 };
  const m = (n * sxy - sx * sy) / denom;
  const b = (sy - m * sx) / n;
  return { m, b };
};

/* ─── component ─────────────────────────────────────────────────────── */
export default function MeanIceFractionChart({ data }: Props) {
  const { t } = useTranslation();
  
  /* add regression prediction to every point */
  const { dataFit, pctDrop } = useMemo(() => {
    if (!data.length) return { dataFit: [], pctDrop: 0 };
    const { m, b } = fitTrend(data);
    const dataFit = data.map(d => ({ ...d, fit: m * d.year + b }));
    const pctDrop = ((dataFit[0].fit - dataFit[dataFit.length - 1].fit) / dataFit[0].fit) * 100;
    return { dataFit, pctDrop: +pctDrop.toFixed(1) };
  }, [data]);

  /* animate headline */
  useEffect(() => {
    gsap.fromTo("#pctLoss", { innerText: 0 }, {
      innerText: 3,
      duration: 1.4,
      ease: "power2.out",
      snap: { innerText: 0.1 },
    });
  }, [pctDrop]);

  const HEIGHT = 420;
  const TITLE_Y = -26;

  return (
    <div style={{ position: "relative", width: "100%", height: HEIGHT }}>
      {/* title */}
      <div style={{
        position: "absolute", left: 80, top: TITLE_Y, zIndex: 5,
        fontSize: 28, fontWeight: 600, color: "#0f172a", pointerEvents: "none",
      }}>
        {t('charts.meanIceFraction.title')}
      </div>

      {/* finding */}
      <div style={{
        position: "absolute", right: 20, top: TITLE_Y, zIndex: 5,
        display: "flex", flexDirection: "column", alignItems: "flex-end",
      }}>
        <div style={{ fontSize: 32, fontWeight: 600, color: "#d62929" }}>
          -<span id="pctLoss">0</span>{t('charts.meanIceFraction.perYear')}
        </div>
      </div>

      {/* chart */}
      <ResponsiveContainer width="100%" height={HEIGHT}>
        <ComposedChart data={dataFit} margin={{ top: 40, right: 20, bottom: 30, left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" className="chart-grid" />
          <XAxis
            dataKey="year"
            tick={{ fill: "#94a3b8" }}
            padding={{ left: 10, right: 10 }}
          />
          <YAxis
            domain={[0, 1]}
            tickFormatter={d => `${(d * 100).toFixed(0)} %`}
            tick={{ fill: "#94a3b8" }}
            label={{
              value: t('charts.meanIceFraction.yAxisLabel'),
              angle: -90,
              position: "insideLeft",
              fill: "#94a3b8",
              offset: 0,
            }}
          />
          <Tooltip
            contentStyle={{ background: "#0f172a", border: "none" }}
            formatter={(v: number) => `${(v * 100).toFixed(1)} %`}
            labelFormatter={l => `${t('charts.meanIceFraction.yearPrefix')}${l}`}
          />
          {/* bars */}
          <Bar
            dataKey="mean"
            fill="#38bdf8"
            stroke="#38bdf8"
            barSize={22}
            radius={[4, 4, 0, 0]}
            name={t('charts.meanIceFraction.yearMean')}
          />
          {/* trendline */}
          <Line
            type="linear"
            dataKey="fit"
            stroke="#d62929"
            strokeWidth={2}
            dot={false}
            strokeDasharray="6 4"
            name={t('charts.meanIceFraction.trend')}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}