"use client";

/* ------------------------------------------------------------------
   BreakupTimingChart.tsx
   Answers the opening memory ("ice was gone in June/July, now April/May")
   with the measured Uummannaq breakup date per year. Uses breakup only —
   the freeze field is clamped to the observation-window start.
------------------------------------------------------------------ */
import React, {
  MutableRefObject,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { useTranslation } from "react-i18next";
import {
  ChartEmptyState,
  ChartMetricBadge,
  ChartSourceBadge,
} from "@/components/ChartExplainers";
import { doyToMonthDay, summarizeBreakup } from "@/lib/chartData";

interface Row {
  year: number;
  breakup: number | null;
}

export interface BreakupTimingApi {
  showStage: (stage: number) => void;
}

interface Props {
  data: Row[];
  apiRef?: MutableRefObject<BreakupTimingApi | null>;
  latestYear?: number | null;
}

const STAGE_ALL = 0;
const STAGE_SHIFT = 1;
const STAGE_SPREAD = 2;

const EARLY_COLOR = "#3b82f6";
const LATE_COLOR = "#ef4444";

/* month-start day-of-year values used for axis ticks */
const MONTH_TICKS = [91, 105, 121, 135, 152, 166];

export default function BreakupTimingChart({ data, apiRef, latestYear }: Props) {
  const { t, i18n } = useTranslation();
  const [stage, setStage] = useState(STAGE_ALL);
  const locale = i18n.language === "de" ? "de-DE" : "en-US";

  useImperativeHandle(
    apiRef,
    () => ({
      showStage: (next: number) =>
        setStage(Math.max(STAGE_ALL, Math.min(STAGE_SPREAD, next))),
    }),
    []
  );

  const summary = useMemo(() => summarizeBreakup(data), [data]);

  const points = useMemo(
    () =>
      summary.byYear
        .filter((row) => typeof row.breakup === "number")
        .map((row) => ({ ...row, breakup: row.breakup as number })),
    [summary]
  );

  if (!points.length) {
    return (
      <ChartEmptyState title={t("charts.breakupTiming.emptyTitle")}>
        {t("charts.breakupTiming.emptyBody")}
      </ChartEmptyState>
    );
  }

  const breakupDoys = points.map((p) => p.breakup);
  const yMin = Math.min(...breakupDoys);
  const yMax = Math.max(...breakupDoys);
  const domain: [number, number] = [
    Math.max(60, Math.floor(yMin / 5) * 5 - 10),
    Math.min(181, Math.ceil(yMax / 5) * 5 + 12),
  ];
  const ticks = MONTH_TICKS.filter((d) => d >= domain[0] && d <= domain[1]);

  const years = points.map((p) => p.year);
  // strip only the abbreviation dot ("30. Apr." → "30. Apr"); a blanket strip
  // also removed the ordinal dot German dates require ("30 Apr")
  const fmtDay = (doy: number) => doyToMonthDay(doy, locale).replace(/\.$/, "");

  // The badges used an em dash for "no value" and an en dash between the two
  // ends of the range. Both are read out as silence, and the range one also
  // broke the rule the rest of the copy follows, so both are words now.
  const shiftLabel =
    summary.shiftDays === null
      ? t("common.noData")
      : `${Math.round(Math.abs(summary.shiftDays))} ${t(
          "charts.breakupTiming.daysEarlier"
        )}`;
  const spreadLabel =
    summary.lateMin === null || summary.lateMax === null
      ? t("common.noData")
      : `${fmtDay(summary.lateMin)} ${t("common.rangeTo")} ${fmtDay(summary.lateMax)}`;

  // Recharts hands a custom shape the placed coordinates plus the row it came
  // from. Only those three are read, so only those three are promised.
  type BreakupPoint = (typeof points)[number];
  type DotProps = { cx?: number; cy?: number; payload?: BreakupPoint };
  const DotShape = ({ cx, cy, payload }: DotProps) => {
    if (cx == null || cy == null || !payload) return <g />;
    const isLate = payload.period === "late";
    const isLatest = latestYear != null && payload.year === latestYear;
    const color = isLate ? LATE_COLOR : EARLY_COLOR;
    return (
      <g>
        <circle cx={cx} cy={cy} r={isLatest ? 7 : 5.5} fill={color} stroke="#fff" strokeWidth={1.5} />
      </g>
    );
  };

  type TooltipProps = { active?: boolean; payload?: { payload: BreakupPoint }[] };
  const TooltipContent = ({ active, payload }: TooltipProps) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 4, padding: "6px 10px", fontSize: 12 }}>
        <strong>{p.year}</strong>
        <div style={{ color: p.period === "late" ? LATE_COLOR : EARLY_COLOR }}>
          {t("charts.breakupTiming.breakupLabel")}: {fmtDay(p.breakup)}
        </div>
      </div>
    );
  };

  return (
    <div style={{ position: "relative", width: "100%" }} data-testid="breakup-timing-chart" role="img" aria-label={t("charts.ariaSummaries.breakupTiming")}>
      {/* flow header: title and source badges share a wrapping row, so they
          can never overlap regardless of chart width */}
      <div className="mb-2 flex flex-wrap items-start justify-between gap-x-6 gap-y-2 px-4 pt-2">
        <div className="min-w-0 flex-1 basis-60" style={{ fontSize: 26, fontWeight: 600, color: "#0f172a", lineHeight: 1.15 }}>
          {t("charts.breakupTiming.title")}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <ChartSourceBadge href="https://github.com/lukaskreibig">
            {t("charts.breakupTiming.source")}
          </ChartSourceBadge>
          <ChartSourceBadge href="https://doi.org/10.1016/j.polar.2017.05.002">
            {t("charts.memoryMeasurement.contextSource")}
          </ChartSourceBadge>
        </div>
      </div>

      <div style={{ paddingTop: 8 }}>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={points} margin={{ top: 16, right: 28, bottom: 24, left: 12 }}>
            <CartesianGrid className="chart-grid" strokeDasharray="2 4" stroke="#cbd5e1" vertical={false} />
            <XAxis
              dataKey="year"
              type="number"
              domain={["dataMin", "dataMax"]}
              ticks={years}
              tick={{ fill: "#64748b", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              className="chart-axis"
            />
            <YAxis
              dataKey="breakup"
              type="number"
              domain={domain}
              ticks={ticks}
              tickFormatter={(d) => fmtDay(Number(d))}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              width={56}
              axisLine={false}
              tickLine={false}
              className="chart-axis"
            />
            <Tooltip content={<TooltipContent />} cursor={{ stroke: "#94a3b8", strokeDasharray: "3 3" }} />

            {/* memory recollection band (clearly a recollection, not data) */}
            {stage === STAGE_ALL && domain[1] >= 152 && (
              <ReferenceArea
                y1={152}
                y2={domain[1]}
                fill="#fde68a"
                fillOpacity={0.25}
                stroke="none"
                label={{ value: t("charts.breakupTiming.memoryNote"), position: "insideTopLeft", fill: "#a16207", fontSize: 11 }}
              />
            )}

            {/* late-period variability band */}
            {stage >= STAGE_SPREAD && summary.lateMin != null && summary.lateMax != null && (
              <ReferenceArea
                y1={summary.lateMin}
                y2={summary.lateMax}
                fill={LATE_COLOR}
                fillOpacity={0.08}
                stroke={LATE_COLOR}
                strokeOpacity={0.25}
                strokeDasharray="4 4"
              />
            )}

            {/* early / late mean lines */}
            {/* Anchored inside the plot, not in the left gutter. "left" puts the
                text outside the drawing area, where the only thing waiting for
                it is the date axis, and "mean 2017 to 2020" is twice as wide as
                the axis is. The early mean is the later date and therefore the
                upper line, so its label rides above it and the late one below,
                and the two can never meet however close the lines run. */}
            {stage >= STAGE_SHIFT && summary.earlyMean != null && (
              <ReferenceLine y={summary.earlyMean} stroke={EARLY_COLOR} strokeWidth={2} strokeDasharray="6 4"
                label={{ value: t("charts.breakupTiming.earlyLabel"), position: "insideTopLeft", fill: EARLY_COLOR, fontSize: 11 }} />
            )}
            {stage >= STAGE_SHIFT && summary.lateMean != null && (
              <ReferenceLine y={summary.lateMean} stroke={LATE_COLOR} strokeWidth={2} strokeDasharray="6 4"
                label={{ value: t("charts.breakupTiming.lateLabel"), position: "insideBottomLeft", fill: LATE_COLOR, fontSize: 11 }} />
            )}

            <Line type="linear" dataKey="breakup" stroke="#cbd5e1" strokeWidth={1.5} dot={false} connectNulls legendType="none" isAnimationActive={false} />
            <Scatter dataKey="breakup" shape={<DotShape />} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-start gap-3 pl-3">
        <ChartMetricBadge
          label={t("charts.breakupTiming.shiftMetricLabel")}
          value={shiftLabel}
          detail={t("charts.breakupTiming.shiftMetricDetail")}
          tone="warning"
          className={`transition-opacity duration-300 ${stage >= STAGE_SHIFT ? "opacity-100" : "pointer-events-none opacity-0"}`}
        />
        <ChartMetricBadge
          label={t("charts.breakupTiming.spreadMetricLabel")}
          value={spreadLabel}
          detail={t("charts.breakupTiming.spreadMetricDetail")}
          tone="neutral"
          className={`transition-opacity duration-300 ${stage >= STAGE_SPREAD ? "opacity-100" : "pointer-events-none opacity-0"}`}
        />
      </div>
    </div>
  );
}
