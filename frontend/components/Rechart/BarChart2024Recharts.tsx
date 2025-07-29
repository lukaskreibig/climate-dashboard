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
  Legend,
} from "recharts";
import { useTranslation } from "react-i18next";

/* ------------- types ------------------------------------------- */
export interface AnnualRowBar {
  Year: number;
  "64N-90N"?: number | null; // Arctic
  Glob?: number | null;      // Global
}

interface Props {
  data: AnnualRowBar[];
}

/* ------------- component --------------------------------------- */
export default function BarChart2024Recharts({ data }: Props) {
  const { t } = useTranslation();

  /* ─── Headline-Schutz: immer String & nur split(), wenn möglich ── */
  const rawTitle: string =
    typeof t("charts.bar2024.title") === "string"
      ? (t("charts.bar2024.title") as string)
      : t("zscore.title", ""); // einfacher Fallback

  const hasArcticGlobal =
    rawTitle.includes("Arctic") && rawTitle.includes("Global");

  const HEADLINE = hasArcticGlobal ? (
    <>
      {rawTitle.split("Arctic")[0]}
      {t("charts.bar2024.arctic")}&nbsp;
      <span className="inline-block w-3 h-3 bg-red-500 align-baseline rounded-sm" />
      &nbsp;
      {rawTitle.split("Arctic")[1]?.split("Global")[0]}
      {t("charts.bar2024.global")}&nbsp;
      <span className="inline-block w-3 h-3 bg-blue-500 align-baseline rounded-sm" />
      &nbsp;
      {rawTitle.split("Global")[1]}
    </>
  ) : (
    rawTitle || `${t("charts.bar2024.arctic")} vs. ${t("charts.bar2024.global")}`
  );

  /* ─── Datensatz nur für 2024 herausfiltern ───────────────────── */
  const row2024 = data.find((d) => d.Year === 2024);
  if (!row2024 || row2024["64N-90N"] == null || row2024.Glob == null) {
    return (
      <p className="text-gray-500 p-2">{t("charts.bar2024.noData")}</p>
    );
  }

  const chartData = [
    { location: t("charts.bar2024.arctic"), value: row2024["64N-90N"] },
    { location: t("charts.bar2024.global"), value: row2024.Glob },
  ];

  /* ─── render ─────────────────────────────────────────────────── */
  return (
    <div style={{ width: "100%", height: 400 }}>
      <div className="text-center font-semibold text-slate-800 mb-1 select-none text-sm sm:text-base">
        {HEADLINE}
      </div>

      <ResponsiveContainer>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
        >
          <CartesianGrid className="chart-grid" strokeDasharray="3 3" />
          <XAxis className="chart-axis" dataKey="location" />
          <YAxis className="chart-axis" />
          <Tooltip
            formatter={(val) =>
              typeof val === "number" ? val.toFixed(2) : val
            }
          />
          <Legend className="chart-grid" />
          <Bar dataKey="value" name={t("charts.bar2024.meanAnomaly")}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.location === t("charts.bar2024.arctic")
                    ? "red"
                    : "blue"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
