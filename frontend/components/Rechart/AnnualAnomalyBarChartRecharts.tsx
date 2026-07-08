"use client";
import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell
} from "recharts";
import { useTranslation } from 'react-i18next';
import { ChartEmptyState, ChartSourceBadge } from "@/components/ChartExplainers";

interface Row {
  Year: number;
  AnnualAnomaly?: number | null;
}
interface Props {
  data: Row[];
}

export default function AnnualAnomalyBarChartRecharts({ data }: Props) {
  const { t } = useTranslation();
  
  const valid = data
    .filter((d) => d.Year != null && d.AnnualAnomaly != null)
    .sort((a, b) => a.Year - b.Year);

  if (!valid.length) {
    return (
      <ChartEmptyState title={t('charts.annualAnomaly.noData')}>
        {t("charts.annualAnomaly.emptyBody")}
      </ChartEmptyState>
    );
  }

  return (
    <div className="relative" style={{ width: "100%", height: 400 }} role="img" aria-label={t("charts.ariaSummaries.annualAnomaly")}>
       <div className="text-center font-semibold text-slate-800 mb-1 select-none text-sm sm:text-base">
        {t('charts.annualAnomaly.title')}
      </div>
      <div className="absolute right-2 top-0 z-10">
        <ChartSourceBadge href="https://nsidc.org/sea-ice-today">
          {t("charts.annualAnomaly.source")}
        </ChartSourceBadge>
      </div>
      <ResponsiveContainer>
        <BarChart data={valid} margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
          <CartesianGrid  className="chart-grid" strokeDasharray="3 3" />
          <XAxis  className="chart-axis"
            dataKey="Year"
            angle={-45}
            textAnchor="end"
            interval={0}
            height={60}
            tickFormatter={(year: number) => (year % 5 === 0 ? String(year) : "")}
          />
          <YAxis  className="chart-axis" />
          <Tooltip formatter={(val) => (typeof val === "number" ? val.toFixed(2) : val)} />
          {/* <Legend className="chart-grid" /> */}
          {/* Dashed zero line */}
          <ReferenceLine
            y={0}
            stroke="#334155"
            strokeDasharray="3 3"
            label={{
              value: t("charts.annualAnomaly.zeroLine"),
              fill: "#334155",
              fontSize: 11,
              position: "insideTopLeft",
            }}
          />

          <Bar dataKey="AnnualAnomaly" name={t('charts.annualAnomaly.anomaly')}>
            {valid.map((entry, index) => {
              const val = entry.AnnualAnomaly!;
              const color = val >= 0 ? "#2563eb" : "#dc2626";
              return <Cell key={index} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
