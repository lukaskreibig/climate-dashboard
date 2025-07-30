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

  const HEADLINE = (
    <>
      {t('charts.multiLine.title').split('CO₂')[0]}CO₂&nbsp;
      <span className="inline-block w-3 h-3 bg-green-500 align-baseline rounded-sm" />
      &nbsp;{t('charts.multiLine.title').split('CO₂')[1].split('global')[0]}{t('charts.multiLine.global').toLowerCase()}&nbsp;
      <span className="inline-block w-3 h-3 bg-blue-500 align-baseline rounded-sm" />
      &nbsp;{t('charts.multiLine.title').split('global')[1].split('Arctic')[0]}{t('charts.multiLine.arctic')}&nbsp;
      <span className="inline-block w-3 h-3 bg-red-500 align-baseline rounded-sm" />
    </>
  );
  
  // Filter valid data and sort by Year
  const valid = data.filter((d) => d.Year != null).sort((a, b) => a.Year - b.Year);

  return (
    <div style={{ width: "100%", height: 400 }}>
       <div className="text-center font-semibold text-slate-800 mb-1 select-none text-sm sm:text-base">
        {HEADLINE}
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