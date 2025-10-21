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
    return <p className="text-gray-500 p-2">{t('charts.annualAnomaly.noData')}</p>;
  }

  return (
    <div style={{ width: "100%", height: 400 }}>
       <div className="text-center font-semibold text-slate-800 mb-1 select-none text-sm sm:text-base">
        {t('charts.annualAnomaly.title')}
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
          <ReferenceLine y={0} stroke="#000" strokeDasharray="3 3" />

          <Bar dataKey="AnnualAnomaly" name={t('charts.annualAnomaly.anomaly')}>
            {valid.map((entry, index) => {
              const val = entry.AnnualAnomaly!;
              const color = val >= 0 ? "blue" : "red";
              return <Cell key={index} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}