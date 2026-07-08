"use client";
import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useTranslation } from 'react-i18next';
import { ChartEmptyState, ChartSourceBadge } from "@/components/ChartExplainers";

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

export default function MultiLineChartRecharts({ data }: Props) {
  const { t } = useTranslation();
  
  // Custom tooltip formatter that formats CO₂ values in gigatonnes
  const tooltipFormatter = (value: any, name: string) => {
    if (name === t('charts.multiLine.co2') && typeof value === "number") {
      return [(value / 1e9).toFixed(2) + " Gt", name];
    }
    return [typeof value === "number" ? value.toFixed(2) : value, name];
  };

  // Filter valid data and sort by Year
  const valid = data.filter((d) => d.Year != null).sort((a, b) => a.Year - b.Year);

  if (!valid.length) {
    return (
      <ChartEmptyState title={t("charts.multiLine.emptyTitle")}>
        {t("charts.multiLine.emptyBody")}
      </ChartEmptyState>
    );
  }

  return (
    <div className="relative" style={{ width: "100%", height: 400 }} role="img" aria-label={t("charts.ariaSummaries.multiLine")}>
       <div className="text-center font-semibold text-slate-800 mb-1 select-none text-sm sm:text-base">
        {t("charts.multiLine.title")}
      </div>
      <div className="absolute right-2 top-0 z-10">
        <ChartSourceBadge href="https://data.giss.nasa.gov/gistemp/">
          {t("charts.multiLine.source")}
        </ChartSourceBadge>
      </div>
      <ResponsiveContainer>
        <ComposedChart data={valid} margin={{ top: 20, right: 30, bottom: 40, left: 0 }}>
          <CartesianGrid  className="chart-grid" strokeDasharray="3 3" />

          <XAxis  className="chart-axis"
            dataKey="Year"
            tickFormatter={(year) => (year % 4 === 0 ? String(year) : "")}
            angle={-45}
            textAnchor="end"
            interval={0}
            height={60}
          />

          {/* Left Y-axis for temperature anomalies */}
          <YAxis  className="chart-axis"
            yAxisId="temp"
            label={{ value: t('charts.multiLine.tempAxisLabel'), angle: -90, position: "insideLeft" }}
            tickFormatter={numberFormatter}
          />

          {/* Right Y-axis for CO₂ values: format in gigatonnes */}
          <YAxis  className="chart-axis"
            yAxisId="co2"
            orientation="right"
            tickFormatter={(val: number) =>
              typeof val === "number" ? (val / 1e9).toFixed(2) : val
            }
            label={{ value: t('charts.multiLine.co2AxisLabel'), angle: 90, position: "insideRight" }}
          />

          <Tooltip formatter={tooltipFormatter} labelStyle={{color:"#000"}} labelFormatter={(year) => `${t('charts.multiLine.yearPrefix')}${year}`} />
          <Legend className="chart-grid" />

          {/* Arctic line */}
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="64N-90N"
            name={t('charts.multiLine.arctic')}
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
          />

          {/* Global line */}
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="Glob"
            name={t('charts.multiLine.global')}
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />

          {/* CO₂ line */}
          <Line
            yAxisId="co2"
            type="monotone"
            dataKey="GlobalCO2Mean"
            name={t('charts.multiLine.co2')}
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
