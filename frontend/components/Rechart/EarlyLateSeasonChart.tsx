/* ------------------------------------------------------------------
   EarlyLateSeasonChart.tsx  ·  v2.5 – backend-props + fallback
------------------------------------------------------------------ */
"use client";

import React, {
  useMemo,
  useState,
  useImperativeHandle,
  MutableRefObject,
  useEffect,
} from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import gsap from "gsap";
import { useTranslation } from 'react-i18next';
import {
  ChartEmptyState,
  ChartSourceBadge,
} from "@/components/ChartExplainers";

/* ——— incoming data ——— */
export interface SeasonRow {
  day: string;
  eMean: number | null;
  e25: number | null;
  e75: number | null;
  lMean: number | null;
  l25: number | null;
  l75: number | null;
}

/* ——— GSAP handle ——— */
export type EarlyLateApi = { 
  nextStep: () => void 
  highlight: (which: "early" | "late" | "both") => void
  showMetric: (visible: boolean) => void
};
interface Props {
  data: SeasonRow[];
  apiRef?: MutableRefObject<EarlyLateApi | null>;
  /** optional: vom Backend vorab berechneter %-Loss über Feb–Jun */
  lossPct?: number | null;
}

/* ——— constants ——— */
const SUN_START = 45; // 14-Feb
const SUN_END   = 180; // 29-Jun
const HEIGHT = 520;
const CHART_H = 470;

/* densify rows und Bandbreiten vorberechnen */
function buildDense(rows: SeasonRow[]) {
  const byDay = Object.fromEntries(rows.map((r) => [r.day, r]));
  const dense: any[] = [];

  // Wir laufen den vollen Feb–Jun Bereich ab, damit X-Achse immer gleich ist
  for (let doy = SUN_START; doy <= SUN_END; doy++) {
    // DOY → "DD-Mon" (2020 chosen for leap-safe JS parity)
    const d = new Date(Date.UTC(2020, 0, doy));
    const day = `${String(d.getUTCDate()).padStart(2, "0")}-${d.toLocaleString("en-US", { month: "short", timeZone: "UTC" })}`;

    const r = byDay[day];
    dense.push(
      r
        ? {
            ...r,
            eBand: r.e75 != null && r.e25 != null ? +(r.e75 - r.e25).toFixed(4) : null,
            lBand: r.l75 != null && r.l25 != null ? +(r.l75 - r.l25).toFixed(4) : null,
          }
        : {
            day,
            eMean: null, e25: null, e75: null, eBand: null,
            lMean: null, l25: null, l75: null, lBand: null,
          }
    );
  }
  return dense;
}

/* Fallback: mean %-loss wenn nicht vom Backend geliefert */
function deriveLoss(rows: SeasonRow[]) {
  const diffs = rows
    .filter(r => r.eMean != null && r.lMean != null && r.eMean !== 0)
    .map(r => 1 - (r.lMean! / r.eMean!))
    .filter(Number.isFinite);
  return diffs.length ? +(100 * diffs.reduce((a,b)=>a+b,0) / diffs.length).toFixed(1) : 0;
}

/* ——— tooltip, nur Mittelwerte zeigen ——— */
const MeanOnlyTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string; }) => {
  if (!active || !payload?.length) return null;
  const means = payload.filter((p) => String(p.dataKey).endsWith("Mean") && p.value != null);
  if (!means.length) return null;

  return (
    <div style={{ background:"#fff", border:"1px solid #ccc", padding:"6px 10px", fontSize:12, lineHeight:1.4 }}>
      <strong>{label}</strong>
      {means.map((m) => (
        <div key={String(m.dataKey)} style={{ color: m.color }}>
          {m.name}: {(m.value * 100).toFixed(1)} %
        </div>
      ))}
    </div>
  );
};

/* ——— COMPONENT ——— */
export default function EarlyLateSeasonChart({ data, apiRef, lossPct }: Props) {
  const { t } = useTranslation();

  const [metricVisible, setMetricVisible] = useState(false);
  const [focus, setFocus] = useState<"early" | "late" | "both">("both");

  useImperativeHandle(apiRef, () => ({
    nextStep:  () => setMetricVisible(true),
    highlight: (which) => setFocus(which),
    showMetric: (visible) => setMetricVisible(visible),
  }), []);

  if (!Array.isArray(data) || !data.length) {
    return (
      <ChartEmptyState title={t("charts.earlyLateSeason.emptyTitle")}>
        {t("charts.earlyLateSeason.emptyBody")}
      </ChartEmptyState>
    );
  }

  const dense = useMemo(() => buildDense(data), [data]);
  const meanLossPct = useMemo(
    () => (typeof lossPct === "number" ? lossPct : deriveLoss(data)),
    [lossPct, data]
  );

  /* animate % when red mean appears */
  useEffect(() => {
    if (metricVisible) {
      gsap.fromTo("#lossValue", { innerText: 0 }, {
        innerText: meanLossPct ?? 0,
        duration: 1.2, ease: "power2.out", snap: { innerText: 0.1 },
      });
    }
  }, [metricVisible, meanLossPct]);

  useEffect(() => {
    const earlyEls = gsap.utils.toArray<SVGElement>('.early-epoch');
    const lateEls = gsap.utils.toArray<SVGElement>('.late-epoch');

    if (!earlyEls.length && !lateEls.length) return;

    if (focus === "both") {
      if (earlyEls.length) gsap.to(earlyEls, { opacity: 1, duration: 0.6, ease: "power2.out" });
      if (lateEls.length) gsap.to(lateEls, { opacity: 1, duration: 0.6, ease: "power2.out" });
    } else if (focus === "early") {
      if (earlyEls.length) gsap.to(earlyEls, { opacity: 1, duration: 0.6, ease: "power2.out" });
      if (lateEls.length) gsap.to(lateEls, { opacity: 0.15, duration: 0.6, ease: "power2.out" });
    } else {
      if (lateEls.length) gsap.to(lateEls, { opacity: 1, duration: 0.6, ease: "power2.out" });
      if (earlyEls.length) gsap.to(earlyEls, { opacity: 0.15, duration: 0.6, ease: "power2.out" });
    }
  }, [focus]);

  const AxisStyle = { tick: { fill: "#94a3b8", fontSize: 12 }, className: "chart-axis" };

  return (
    <div style={{ position:"relative", width:"100%", height:HEIGHT }} role="img" aria-label={t("charts.ariaSummaries.earlyLateSeason")}>
      {/* inline legend replaces the two stacked panel titles */}
      <div className="absolute left-16 top-0 z-[5] flex flex-wrap items-center gap-4 text-base font-semibold text-slate-700">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-1 w-6 rounded-full" style={{ background: "#4287f5" }} />
          {t('charts.earlyLateSeason.earlyTitle')}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-1 w-6 rounded-full" style={{ background: "#d62929" }} />
          {t('charts.earlyLateSeason.lateTitle')}
        </span>
      </div>

      <div className="absolute right-5 top-[-30px] z-[5]">
        <ChartSourceBadge href="https://sentinels.copernicus.eu/copernicus/sentinel-2">
          {t("charts.earlyLateSeason.source")}
        </ChartSourceBadge>
      </div>

      {/* animated loss metric */}
      <div style={{ position:"absolute", right:20, top:40, zIndex:5, display:"flex", flexDirection:"column", alignItems:"flex-end", opacity:metricVisible?1:0, transition:"opacity .4s ease", pointerEvents:"none" }}>
        <div style={{ fontSize:42, fontWeight:600, color:"#d62929", lineHeight:1 }}>
          <span id="lossValue">{typeof meanLossPct === "number" ? meanLossPct : 0}</span>%
        </div>
        <div style={{ fontSize:14, color:"#64748b" }}>
          {t('charts.earlyLateSeason.lessIce')}
        </div>
      </div>

      <div className="absolute bottom-2 left-20 z-[5] flex gap-3 text-[11px] text-slate-500">
        <span>{t("charts.earlyLateSeason.bandHint")}</span>
      </div>

      {/* single overlaid chart: both epochs share one axis so the gap is directly visible */}
      <div style={{ paddingTop: 44 }}>
        <ResponsiveContainer width="100%" height={CHART_H}>
          <ComposedChart data={dense} margin={{ top: 10, right: 24, bottom: 30, left: 20 }}>
            <CartesianGrid strokeDasharray="1 1" className="chart-grid" />
            <XAxis dataKey="day" minTickGap={28} {...AxisStyle} />
            <YAxis domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)} %`} {...AxisStyle} />
            <Tooltip content={<MeanOnlyTooltip />} />

            {/* early IQR band (e25 invisible base + eBand) */}
            <Area dataKey="e25" stackId="early" stroke="none" fillOpacity={0} className="early-epoch" isAnimationActive={false} />
            <Area
              dataKey="eBand"
              stackId="early"
              name={`${t('charts.earlyLateSeason.earlyTitle')}${t('charts.earlyLateSeason.iqrSuffix')}`}
              stroke="none"
              fill="rgba(66,135,245,0.18)"
              className="early-epoch"
              isAnimationActive={false}
            />

            {/* late IQR band (l25 invisible base + lBand) */}
            <Area dataKey="l25" stackId="late" stroke="none" fillOpacity={0} className="late-epoch" isAnimationActive={false} />
            <Area
              dataKey="lBand"
              stackId="late"
              name={`${t('charts.earlyLateSeason.lateTitle')}${t('charts.earlyLateSeason.iqrSuffix')}`}
              stroke="none"
              fill="rgba(214,41,41,0.16)"
              className="late-epoch"
              isAnimationActive={false}
            />

            {/* mean lines on top */}
            <Line
              type="monotone"
              dataKey="eMean"
              name={t('charts.earlyLateSeason.earlyTitle')}
              stroke="#4287f5"
              strokeWidth={3}
              connectNulls
              dot={false}
              className="early-epoch"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="lMean"
              name={t('charts.earlyLateSeason.lateTitle')}
              stroke="#d62929"
              strokeWidth={3}
              connectNulls
              dot={false}
              className="late-epoch"
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
