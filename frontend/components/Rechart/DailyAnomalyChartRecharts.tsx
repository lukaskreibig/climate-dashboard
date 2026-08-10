"use client";

import React, { useMemo, useState, useImperativeHandle } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from "recharts";
import { useTranslation } from 'react-i18next';
import { ChartEmptyState, ChartSourceBadge } from "@/components/ChartExplainers";

export interface DecadeRow { decade: string; day: number; an: number; sd?: number|null; n: number; }
export interface Props { data: DecadeRow[]; apiRef?: React.MutableRefObject<any>; }

const monthTicks = [1,32,60,91,121,152,182,213,244,274,305,335];
const colorOf = (d:string)=>({ "1980s":"#1e40af","1990s":"#2563eb","2000s":"#f59e0b","2010s":"#ef4444","2020s":"#b91c1c" }[d] || "#6b7280");
const decadeNum = (label:string)=>parseInt(label,10) || 0;

export default function DailyAnomalyChart({ data, apiRef }: Props) {
  const { t } = useTranslation();
  const months = t('common.months.short', { returnObjects: true }) as string[];
  const monthOf = (d:number)=>months[ monthTicks.findLastIndex(t=>d>=t) ] ?? "";

  // Backend-only: Serien bauen (falls Backend doch 1970s liefert, filtern wir sie sicherheitshalber weg)
  const series = useMemo(()=>{
    const byDec = new Map<string, {day:number; an:number}[]>();
    for (const r of data) {
      if (decadeNum(r.decade) < 1980) continue;
      if (!byDec.has(r.decade)) byDec.set(r.decade, []);
      byDec.get(r.decade)!.push({ day: r.day, an: r.an });
    }
    return Array.from(byDec.entries())
      .map(([dec, rows])=>({ decade: dec, rows: rows.sort((a,b)=>a.day-b.day), color: colorOf(dec) }))
      .sort((a,b)=>decadeNum(a.decade)-decadeNum(b.decade));
  },[data]);

  const chartData = useMemo(() => {
    const daySet = new Set<number>();
    const valueByDecade = new Map<string, Map<number, number>>();

    series.forEach(({ decade, rows }) => {
      const lookup = new Map<number, number>();
      rows.forEach(({ day, an }) => {
        daySet.add(day);
        lookup.set(day, an);
      });
      valueByDecade.set(decade, lookup);
    });

    const sortedDays = Array.from(daySet).sort((a, b) => a - b);
    return sortedDays.map((day) => {
      const entry: Record<string, number | null> & { day: number } = { day };
      valueByDecade.forEach((lookup, decade) => {
        entry[decade] = lookup.has(day) ? lookup.get(day)! : null;
      });
      return entry;
    });
  }, [series]);

  const [visible,setVisible]=useState(1);
  useImperativeHandle(apiRef,()=>({ showLevel:(lvl:number)=>setVisible(Math.max(1, Math.min(lvl, series.length))) }),[series.length]);

  /* The zero line carries the whole reading of this chart, and while only the
     decades above it are drawn, an automatic domain put it exactly on the axis
     floor: indistinguishable from the axis itself, with its label "1981 to 2010
     average" landing on top of the month ticks.

     Snapping the domain outwards to a whole tick step lifts the line clear at
     every stage of the reveal. The ticks are then handed over explicitly,
     because a hand-set domain makes Recharts divide the range evenly and it
     stops choosing round numbers. This way the axis keeps quarters and halves,
     and zero is always one of them. */
  const { yDomain, yTicks } = useMemo(() => {
    const shown = series.slice(0, visible).flatMap(({ rows }) => rows.map((r) => r.an));
    const lo0 = Math.min(0, ...shown, 0);
    const hi0 = Math.max(0, ...shown, 0);
    const step = [0.25, 0.5, 1].find((s) => (hi0 - lo0) / s <= 5) ?? 1;
    const r2 = (v: number) => Math.round(v * 100) / 100;
    // outwards to a whole step so the domain holds all the data, and never
    // closer than one step to zero so the reference line keeps its own row
    const lo = r2(Math.min(Math.floor(lo0 / step) * step, -step));
    const hi = r2(Math.max(Math.ceil(hi0 / step) * step, step));
    const ticks: number[] = [];
    for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);
    return { yDomain: [lo, hi] as [number, number], yTicks: ticks };
  }, [series, visible]);

  if (!Array.isArray(data) || !data.length || !series.length) {
    return (
      <ChartEmptyState title={t("charts.dailyAnomaly.emptyTitle")}>
        {t("charts.dailyAnomaly.emptyBody")}
      </ChartEmptyState>
    );
  }

  return (
    <div className="relative flex h-[420px] w-full flex-col" role="img" aria-label={t("charts.ariaSummaries.dailyAnomaly")}>
      {/* flow header: title and source badge wrap instead of overlapping */}
      <div className="mb-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1">
        <div className="min-w-0 flex-1 basis-52 font-semibold text-slate-800 select-none text-sm sm:text-base">
          {t('charts.dailyAnomaly.title')}
        </div>
        <ChartSourceBadge href="https://nsidc.org/sea-ice-today" className="shrink-0">
          {t("charts.dailyAnomaly.source")}
        </ChartSourceBadge>
      </div>
      <div className="min-h-0 flex-1">
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{top:20,right:20,bottom:20,left:40}}>
          <CartesianGrid strokeDasharray="3 3" className="chart-grid"/>
          <XAxis dataKey="day" type="number" domain={[1,365]} ticks={monthTicks} tickFormatter={monthOf} className="chart-axis"/>
          <YAxis domain={yDomain} ticks={yTicks} allowDataOverflow={false} label={{value:t('charts.dailyAnomaly.yAxisLabel'),angle:-90,position:"insideLeft"}} className="chart-axis"/>
          <Tooltip
            formatter={(v: number | string | Array<number | string>) => {
              if (Array.isArray(v)) return v;
              if (v === null || v === undefined || v === "") return "-";
              return Number(v).toFixed(3);
            }}
            labelFormatter={(d:number)=>`${monthOf(d)} (${t('common.day')} ${d})`}
          />
          <Legend/>
          <ReferenceLine
            y={0}
            stroke="#475569"
            strokeDasharray="4 4"
            label={{
              value: t("charts.dailyAnomaly.zeroLine"),
              fill: "#475569",
              fontSize: 11,
              position: "insideTopRight",
            }}
          />
          {series.slice(0,visible).map(({decade,color})=>(
            <Line
              key={decade}
              type="monotone"
              dataKey={decade}
              stroke={color}
              strokeWidth={2}
              name={decade}
              dot={false}
              activeDot={{ r: 3.5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
