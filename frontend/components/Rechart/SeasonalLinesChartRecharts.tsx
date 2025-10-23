// @ts-nocheck
"use client";
import React, {
  useMemo,
  useRef,
  useState,
  useImperativeHandle,
} from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import * as d3 from "d3";
import { useTranslation } from 'react-i18next';

/* ------------------------------------------------------------------
   SeasonalLinesChartRecharts – headline, highlight API, delta badge
------------------------------------------------------------------- */
interface Row {
  Year: number;
  DayOfYear: number;
  Extent?: number | null;
}
interface Props {
  data: Row[];
  apiRef?: React.MutableRefObject<any>; // ChartScene passes this
}

/* ─── tweakables ───────────────────────────────────────────── */
const POINT_EVERY_N_DAYS = 6;
const SPLIT_YEAR = 2000; // early <2000   late ≥2000

type HighlightMode =
  | "all"
  | "both"
  | "first"
  | "early"
  | "second"
  | "late"
  | "current";

const RECORD_LOW_START_DOY = 45;  // ~14. Februar
const RECORD_LOW_END_DOY = 75;    // ~16. März

export default function SeasonalLinesChartRecharts({
  data,
  apiRef,
}: Props) {
  const { t } = useTranslation();
  const months = t('common.months.short', { returnObjects: true }) as string[];
  
  if (!Array.isArray(data) || !data.length) return null;

  /* ── group & down-sample by year ───────────────────────── */
  const byYear = useMemo(() => {
    const m = new Map<number, Row[]>();
    data.forEach((r) => (m.get(r.Year)?.push(r) ?? m.set(r.Year, [r])));
    m.forEach((arr) => arr.sort((a, b) => a.DayOfYear - b.DayOfYear));
    const keep = (rows: Row[]) =>
      rows.filter((_, i) => i % POINT_EVERY_N_DAYS === 0);
    return [...m]
      .map(([year, values]) => ({ year, values: keep(values) }))
      .sort((a, b) => a.year - b.year);
  }, [data]);

  /* ── stats ─────────────────────────────────────────────── */
  const flat = data.filter((d) => d.Extent != null) as Required<Row>[];
  const [minE, maxE] = d3.extent(flat, (d) => d.Extent)!;
  const max = flat.reduce((a, b) => (b.Extent > a.Extent ? b : a));
  const min = flat.reduce((a, b) => (b.Extent < a.Extent ? b : a));

  const minYear = byYear[0].year;
  const maxYear = byYear.at(-1)!.year;
  const currentYear = maxYear;

  /* colour scale */
  const col = useMemo(
    () => d3.scaleSequential(d3.interpolateTurbo).domain([minYear, maxYear]),
    [minYear, maxYear]
  );

  /* early / late means & delta */
  const earlyMean = d3.mean(flat.filter((d) => d.Year < SPLIT_YEAR), (d) => d.Extent)!;
  const lateMean  = d3.mean(flat.filter((d) => d.Year >= SPLIT_YEAR), (d) => d.Extent)!;
  const delta     = lateMean - earlyMean; // negative → loss

  /* ── state ─────────────────────────────────────────────── */
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const [labelPos, setLabelPos]   = useState<{ x: number; y: number } | null>(null);
  const [highlight, setHighlight] = useState<HighlightMode>("all");
  const wrapRef = useRef<HTMLDivElement>(null);

  /* expose API instantly */
  useImperativeHandle(apiRef, () => ({
    highlight: (mode: HighlightMode) => setHighlight(mode),
  }));

  /* helpers */
  const isVisible = (y: number) => {
    if (highlight === "early"  || highlight === "first")  return y <  SPLIT_YEAR;
    if (highlight === "late"   || highlight === "second") return y >= SPLIT_YEAR;
    if (highlight === "current")                           return y === currentYear;
    return true; // all / both
  };

  const handleMove = (e: React.MouseEvent) => {
    if (!hoverYear) return;
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    setLabelPos({ x: e.clientX - r.left + 8, y: e.clientY - r.top - 24 });
  };
  const clearHover = () => {
    setHoverYear(null);
    setLabelPos(null);
  };

  const lineStyle = {
    pointerEvents: "visibleStroke",
    transition: "stroke-opacity .25s ease",
  } as const;

  /* ── render ─────────────────────────────────────────────── */
  return (
    <div
      ref={wrapRef}
      onMouseMove={handleMove}
      onMouseLeave={clearHover}
      className="relative"
      style={{ width: "100%", height: 460 }}
    >
      {/* headline + legend */}
      <div className="text-center font-semibold text-slate-800 mb-1 select-none text-sm sm:text-base">
        {t('charts.seasonal.title')}
        <div className="flex items-center justify-center gap-1 px-4 pt-1 text-xs sm:text-sm font-medium text-slate-700">
          <span>{minYear}</span>
          <div className="h-2 w-40 rounded bg-gradient-to-r from-blue-600 via-yellow-400 to-red-600" />
          <span>{maxYear}</span>
        </div>
      </div>

      {/* hover badge */}
      {hoverYear && labelPos && (
        <div
          className="absolute z-10 text-xs sm:text-sm font-semibold text-slate-700 bg-white/80 backdrop-blur px-2 py-0.5 rounded pointer-events-none select-none"
          style={{ left: labelPos.x, top: labelPos.y }}
        >
          {hoverYear}
        </div>
      )}

      {/* delta badge (late view only) */}
      {(highlight === "late" || highlight === "second") && (
        <div className="absolute bottom-3 right-4 text-red-600 text-2xl sm:text-3xl font-bold select-none">
          {delta.toFixed(1)} M&nbsp;km²
        </div>
      )}

      <ResponsiveContainer height={400}>
        <LineChart margin={{ top: 4, right: 20, bottom: 40, left: 20 }} isAnimationActive={false}>
          {/* grid / axes keep their classes so GSAP fades still work */}
          <CartesianGrid strokeDasharray="3 3" className="chart-grid" />
          <XAxis
            dataKey="DayOfYear"
            type="number"
            domain={[1, 366]}
            tickCount={12}
            tickFormatter={(d) => months[new Date(2001, 0, d).getMonth()]}
            className="chart-axis"
            label={{ value: t('charts.seasonal.xAxisLabel'), position: "bottom" }}
          />
          <YAxis
            domain={[minE, maxE]}
            tickFormatter={(v) => v.toFixed(1)}
            className="chart-axis"
            label={{ value: t('charts.seasonal.yAxisLabel'), angle: -90, position: "insideLeft" }}
          />

          {byYear.map(({ year, values }) => {
            const active = hoverYear === year;
            return (
              <Line
                key={year}
                data={values}
                dataKey="Extent"
                stroke={col(year)}
                strokeWidth={highlight !== "current" && !active ? 1 : 2.4}
                strokeOpacity={
                  hoverYear
                    ? active
                      ? 1
                      : 0.06
                    : isVisible(year)
                    ? 0.9
                    : 0.06
                }
                dot={false}
                activeDot={false}
                style={lineStyle}
                onMouseEnter={() => setHoverYear(year)}
              />
            );
          })}

          {highlight === "current" && (
  <ReferenceArea
    x1={RECORD_LOW_START_DOY}
    x2={RECORD_LOW_END_DOY}
    fill="#1f2937"
    fillOpacity={0.1}
    strokeOpacity={1}
    label={t('charts.seasonal.recordLow')}
  />
)}

          {/* helper lines keep .chart-ref for GSAP fade */}
          {/* <ReferenceLine
            className="chart-ref"
            x={max.DayOfYear}
            stroke={col(max.Year)}
            strokeDasharray="3 3"
            label={{
              position: "right",
              value: `Max ${max.Extent.toFixed(2)} M km² (${max.Year})`,
              fill: col(max.Year),
              fontSize: 12,
            }}
          /> */}
          {/* <ReferenceLine
            className="chart-ref"
            x={min.DayOfYear}
            stroke={col(min.Year)}
            strokeDasharray="3 3"
            label={{
              position: "top",
              value: `Min ${min.Extent.toFixed(2)} M km² (${min.Year})`,
              fill: col(min.Year),
              fontSize: 12,
            }}
          /> */}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
// @ts-nocheck
