"use client";

import React, {
  CSSProperties,
  MutableRefObject,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { prefersReducedMotion } from "@/lib/reducedMotion";
import { useTranslation } from "react-i18next";
import {
  ChartEmptyState,
  ChartMetricBadge,
  ChartSourceBadge,
} from "@/components/ChartExplainers";
import {
  buildFjordSeasonMatrix,
  doyToMonthDay,
  FjordSeasonCell,
  meanOf,
  percentChange,
  splitEarlyLate,
  summarizeFjordSeasons,
  UUMMANNAQ_SEASON_END_DOY,
  UUMMANNAQ_SEASON_START_DOY,
} from "@/lib/chartData";

interface Row {
  date?: string;
  year: number;
  doy: number;
  frac: number | null;
}

export interface MemoryMeasurementApi {
  showStage: (stage: number) => void;
}

interface Props {
  data: Row[];
  lossPct?: number | null;
  sourceLabel?: string | null;
  latestYear?: number | null;
  apiRef?: MutableRefObject<MemoryMeasurementApi | null>;
}

/* Reveal stages: build one winter day-by-day → stack all → early/late/caveat */
const STAGE_BUILD = 0;
const STAGE_ALL = 1;
const STAGE_EARLY = 2;
const STAGE_LATE = 3;
const STAGE_CONTEXT = 4;

const DAY_COUNT = UUMMANNAQ_SEASON_END_DOY - UUMMANNAQ_SEASON_START_DOY + 1;
const MONTH_TICKS = [45, 60, 91, 121, 152, 181];
const EXAMPLE_DOY = 105;

const hexToRgb = (hex: string) => {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
};

const mixColor = (from: string, to: string, amount: number) => {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const t = Math.max(0, Math.min(1, amount));
  return `rgb(${Math.round(a.r + (b.r - a.r) * t)}, ${Math.round(
    a.g + (b.g - a.g) * t
  )}, ${Math.round(a.b + (b.b - a.b) * t)})`;
};

const iceFill = (frac: number) =>
  frac <= 0.5
    ? mixColor("#111827", "#67e8f9", frac / 0.5)
    : mixColor("#67e8f9", "#0ea5e9", (frac - 0.5) / 0.5);

const cellStyle = (cell: FjordSeasonCell, visible: boolean): CSSProperties => {
  const base: CSSProperties = {
    opacity: visible ? 1 : 0,
    transition: "opacity 260ms ease, background-color 260ms ease",
  };

  if (cell.frac === null) {
    return {
      ...base,
      backgroundColor: "#e2e8f0",
      backgroundImage:
        "repeating-linear-gradient(135deg, rgba(100,116,139,0.32) 0 1px, transparent 1px 5px)",
    };
  }

  if (cell.status === "estimated") {
    return {
      ...base,
      backgroundColor: iceFill(cell.frac),
      backgroundImage:
        "repeating-linear-gradient(135deg, rgba(255,255,255,0.45) 0 2px, transparent 2px 7px)",
    };
  }

  return {
    ...base,
    backgroundColor: iceFill(cell.frac),
  };
};

const nearestMeasuredCell = (
  cells: FjordSeasonCell[] | undefined,
  targetDoy = EXAMPLE_DOY
) => {
  const candidates = (cells ?? []).filter((cell) => cell.status === "measured");
  if (!candidates.length) return null;
  return candidates.reduce((best, cell) =>
    Math.abs(cell.doy - targetDoy) < Math.abs(best.doy - targetDoy) ? cell : best
  );
};

export default function MemoryMeasurementTimeline({
  data,
  lossPct,
  sourceLabel,
  latestYear,
  apiRef,
}: Props) {
  const { t, i18n } = useTranslation();
  const [stage, setStage] = useState(STAGE_BUILD);
  const [revealCols, setRevealCols] = useState(DAY_COUNT);
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const [hoverCell, setHoverCell] = useState<{
    cell: FjordSeasonCell;
    left: number;
    top: number;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(apiRef, () => ({
    showStage: (nextStage: number) =>
      setStage(Math.max(STAGE_BUILD, Math.min(STAGE_CONTEXT, nextStage))),
  }));

  /* Stage 0: reveal one winter left-to-right, day by day (time-lapse). */
  useEffect(() => {
    if (stage !== STAGE_BUILD || prefersReducedMotion()) {
      setRevealCols(DAY_COUNT);
      return;
    }
    setRevealCols(0);
    let raf = 0;
    const DURATION = 1300;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / DURATION);
      setRevealCols(Math.round(progress * DAY_COUNT));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stage]);

  const prepared = useMemo(() => {
    const matrix = buildFjordSeasonMatrix(data);
    const years = matrix.map((row) => row.year);
    const summaries = summarizeFjordSeasons(data);
    const split = splitEarlyLate(summaries);
    const earlyMean = meanOf(split.early.map((row) => row.mean));
    const lateMean = meanOf(split.late.map((row) => row.mean));
    const derivedChange = percentChange(earlyMean, lateMean);
    const latest = latestYear ?? years.at(-1) ?? null;
    const latestRow =
      matrix.find((row) => row.year === latest) ?? matrix.at(-1) ?? null;
    const fallbackExample = matrix
      .map((row) => nearestMeasuredCell(row.cells))
      .find((cell): cell is FjordSeasonCell => cell !== null);
    const example = nearestMeasuredCell(latestRow?.cells) ?? fallbackExample ?? null;

    return {
      matrix,
      years,
      earlyYears: new Set(split.early.map((row) => row.year)),
      lateYears: new Set(split.late.map((row) => row.year)),
      example,
      change:
        typeof lossPct === "number"
          ? -Math.abs(lossPct)
          : derivedChange === null
          ? null
          : derivedChange,
    };
  }, [data, latestYear, lossPct]);

  if (!prepared.matrix.length || !prepared.example) {
    return (
      <ChartEmptyState title={t("charts.memoryMeasurement.emptyTitle")}>
        {t("charts.memoryMeasurement.emptyBody")}
      </ChartEmptyState>
    );
  }

  const exampleCell = prepared.example;
  const locale = i18n.language === "de" ? "de-DE" : "en-US";
  const percentFormatter = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 1,
  });
  const formatPercent = (value: number | null) =>
    value === null ? t("charts.memoryMeasurement.tooltip.noValue") : percentFormatter.format(value);
  const formatDate = (date: string) =>
    new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${date}T00:00:00Z`));

  const percentLabel =
    prepared.change === null
      ? "n/a"
      : `${prepared.change > 0 ? "+" : ""}${prepared.change.toFixed(1)}%`;

  const shouldDim = (year: number) => {
    if (stage < STAGE_ALL) return year !== exampleCell.year;
    if (hoverYear !== null) return hoverYear !== year;
    if (stage === STAGE_EARLY) return !prepared.earlyYears.has(year);
    if (stage === STAGE_LATE) return !prepared.lateYears.has(year);
    return false;
  };

  const cellVisible = (cell: FjordSeasonCell) => {
    if (stage < STAGE_ALL) {
      return (
        cell.year === exampleCell.year &&
        cell.doy - UUMMANNAQ_SEASON_START_DOY < revealCols
      );
    }
    return true;
  };

  const updateTooltip = (
    cell: FjordSeasonCell,
    event: React.PointerEvent<HTMLElement> | React.FocusEvent<HTMLElement>
  ) => {
    const root = rootRef.current?.getBoundingClientRect();
    if (!root) return;

    const source =
      "clientX" in event
        ? { x: event.clientX, y: event.clientY }
        : (() => {
            const rect = event.currentTarget.getBoundingClientRect();
            return { x: rect.left + rect.width / 2, y: rect.top };
          })();
    const left = Math.min(Math.max(source.x - root.left + 12, 8), root.width - 248);
    const top = Math.min(Math.max(source.y - root.top - 8, 8), root.height - 118);
    setHoverCell({ cell, left, top });
  };

  const statusLabel = (cell: FjordSeasonCell) =>
    t(`charts.memoryMeasurement.status.${cell.status}`);

  return (
    <div
      ref={rootRef}
      className="relative min-h-[440px] w-full px-2 py-3 text-slate-900 sm:px-4"
      data-testid="memory-measurement-chart"
      role="img"
      aria-label={t("charts.ariaSummaries.memoryMeasurement")}
    >
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
          {t("charts.memoryMeasurement.axisLabel")}
        </div>
        <div className="flex flex-wrap gap-2">
          <ChartSourceBadge href="https://sentinels.copernicus.eu/copernicus/sentinel-2">
            {sourceLabel ?? t("charts.memoryMeasurement.sourceFallback")}
          </ChartSourceBadge>
          <ChartSourceBadge href="https://doi.org/10.1016/j.polar.2017.05.002">
            {t("charts.memoryMeasurement.contextSource")}
          </ChartSourceBadge>
        </div>
      </div>

      <div data-testid="memory-measurement-table">
        <div className="relative mb-2 ml-12 grid text-[10px] font-medium text-slate-500 sm:ml-16">
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${DAY_COUNT}, minmax(2px, 1fr))` }}
          >
            {MONTH_TICKS.map((doy) => (
              <div
                key={doy}
                className="border-l border-slate-300 pl-1"
                style={{
                  gridColumn: `${doy - UUMMANNAQ_SEASON_START_DOY + 1} / span 14`,
                }}
              >
                {doyToMonthDay(doy, locale).replace(/\./g, "")}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          {prepared.matrix.map((row) => {
            const dim = shouldDim(row.year);
            const labelVisible = stage >= STAGE_ALL || row.year === exampleCell.year;
            return (
              <div
                key={row.year}
                className={`grid grid-cols-[3rem_1fr] items-center gap-2 transition-opacity duration-500 sm:grid-cols-[4rem_1fr] ${
                  stage < STAGE_ALL && row.year !== exampleCell.year
                    ? "opacity-0"
                    : dim
                    ? "opacity-25"
                    : "opacity-100"
                }`}
              >
                <div
                  className={`text-right text-xs font-semibold tabular-nums text-slate-600 transition-opacity ${
                    labelVisible ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {row.year}
                </div>
                <div
                  className="grid h-4 overflow-hidden rounded-sm bg-white/70 ring-1 ring-slate-300/70 sm:h-5"
                  style={{
                    gridTemplateColumns: `repeat(${DAY_COUNT}, minmax(2px, 1fr))`,
                  }}
                >
                  {row.cells.map((cell, index) => {
                    const visible = cellVisible(cell);
                    const example =
                      cell.year === exampleCell.year &&
                      cell.doy === exampleCell.doy;
                    return (
                      <button
                        key={cell.doy}
                        type="button"
                        data-testid={`memory-cell-${cell.year}-${cell.doy}`}
                        aria-label={`${formatDate(cell.date)}: ${formatPercent(
                          cell.frac
                        )}, ${statusLabel(cell)}`}
                        tabIndex={visible ? 0 : -1}
                        className={`min-w-0 border-0 p-0 outline-none ${
                          visible ? "pointer-events-auto" : "pointer-events-none"
                        } ${
                          index % 7 === 0 ? "border-l border-white/30" : ""
                        } ${
                          example && stage <= STAGE_BUILD
                            ? "relative z-10 ring-2 ring-slate-950 ring-offset-1 ring-offset-white"
                            : "focus-visible:ring-2 focus-visible:ring-slate-900"
                        }`}
                        style={cellStyle(cell, visible)}
                        onPointerEnter={(event) => {
                          if (!visible) return;
                          setHoverYear(cell.year);
                          updateTooltip(cell, event);
                        }}
                        onPointerMove={(event) => visible && updateTooltip(cell, event)}
                        onPointerLeave={() => {
                          setHoverCell(null);
                          setHoverYear(null);
                        }}
                        onFocus={(event) => {
                          if (!visible) return;
                          setHoverYear(cell.year);
                          updateTooltip(cell, event);
                        }}
                        onBlur={() => {
                          setHoverCell(null);
                          setHoverYear(null);
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid min-h-[76px] gap-3 sm:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="min-w-0 text-[11px] text-slate-600">
          <div className="mb-1 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
            <span>{t("charts.memoryMeasurement.legend.iceScale")}</span>
          </div>
          <div className="h-2.5 rounded-full bg-[linear-gradient(90deg,#111827_0%,#67e8f9_50%,#0ea5e9_100%)] ring-1 ring-slate-300/70" />
          <div className="mt-1 flex justify-between tabular-nums text-slate-500">
            <span>{t("charts.memoryMeasurement.legend.low")}</span>
            <span>{t("charts.memoryMeasurement.legend.mid")}</span>
            <span>{t("charts.memoryMeasurement.legend.high")}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-4 rounded-sm bg-sky-400 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.5)_0_2px,transparent_2px_7px)] ring-1 ring-slate-300" />
              {t("charts.memoryMeasurement.legend.estimated")}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-4 rounded-sm bg-slate-200 bg-[repeating-linear-gradient(135deg,rgba(100,116,139,0.4)_0_1px,transparent_1px_5px)] ring-1 ring-slate-300" />
              {t("charts.memoryMeasurement.legend.missing")}
            </span>
          </div>
        </div>

        <div className="min-h-[72px]">
          <ChartMetricBadge
            label={t("charts.memoryMeasurement.metricLabel")}
            value={percentLabel}
            detail={t("charts.memoryMeasurement.metricDetail")}
            tone="warning"
            className={`w-full transition-opacity duration-300 ${
              stage === STAGE_LATE ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          />
        </div>
      </div>

      {hoverCell && (
        <div
          data-testid="memory-cell-tooltip"
          className="pointer-events-none absolute z-30 w-60 rounded-md border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-xl backdrop-blur"
          style={{ left: hoverCell.left, top: hoverCell.top }}
        >
          <div className="font-semibold text-slate-950">
            {formatDate(hoverCell.cell.date)}
          </div>
          <div className="mt-1 flex justify-between gap-3">
            <span>{t("charts.memoryMeasurement.tooltip.iceFraction")}</span>
            <span className="font-semibold tabular-nums text-slate-950">
              {formatPercent(hoverCell.cell.frac)}
            </span>
          </div>
          <div className="mt-1 text-slate-500">{statusLabel(hoverCell.cell)}</div>
        </div>
      )}
    </div>
  );
}
