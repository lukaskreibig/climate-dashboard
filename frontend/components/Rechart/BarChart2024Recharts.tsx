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

  const latestRow = [...(data ?? [])]
    .filter((d) => d["64N-90N"] != null && d.Glob != null)
    .sort((a, b) => b.Year - a.Year)[0];

  if (!latestRow) {
    return (
      <p className="text-gray-500 p-2">{t("charts.bar2024.noData")}</p>
    );
  }

  const chartData = [
    { location: t("charts.bar2024.arctic"), value: latestRow["64N-90N"] },
    { location: t("charts.bar2024.global"), value: latestRow.Glob },
  ];

  /* ─── render ─────────────────────────────────────────────────── */
  return (
    <div style={{ width: "100%", height: 400 }} role="img" aria-label={t("charts.ariaSummaries.bar2024")}>
      <div className="text-center font-semibold text-slate-800 mb-2 select-none text-sm sm:text-base">
        {t("charts.bar2024.title", { year: latestRow.Year })}
      </div>
      <div className="mb-1 flex items-center justify-center gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-red-500" />
          {t("charts.bar2024.arctic")}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-blue-500" />
          {t("charts.bar2024.global")}
        </span>
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
            labelStyle={{color:"#000"}}
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
