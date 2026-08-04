"use client";

/* ------------------------------------------------------------------
   AllYearsSeasonChart.tsx – v6  (v4 layout  + simple GSAP stagger)
------------------------------------------------------------------ */
import React, {
  useMemo,
  useRef,
  useEffect,
  MutableRefObject,
  useImperativeHandle,
  useState,
} from "react";
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceArea, ReferenceLine,
} from "recharts";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslation } from 'react-i18next';
import i18n from "@/i18n/client";
import { ChartEmptyState, ChartSourceBadge } from "@/components/ChartExplainers";
import { prefersReducedMotion } from "@/lib/reducedMotion";
import { indexSeasonUncertainty, splitAtYear, type SeasonMeanRow } from "@/lib/chartData";

gsap.registerPlugin(ScrollTrigger);

/* ─── data & API types ────────────────────────────────────────────── */
interface Row { year:number; doy:number; frac:number | null }
export type AllYearsApi = {
  showMode: (mode: "all" | "early" | "late" | "latest") => void;
  nextStage: () => void;
}
interface Props {
  data  : Row[];
  /** per-season mean with its bootstrapped 95 % interval, straight from the API */
  seasonMeans?: SeasonMeanRow[];
  apiRef?: MutableRefObject<AllYearsApi|null>;
}

/* ─── constants ──────────────────────────────────────────────────── */
const SUN_START = 45;   // 14‑Feb
const SUN_END   = 180;  // 29‑Jun
const MINI_H    = 120;
const COLORS    = [
  "#38bdf8","#0ea5e9","#0284c7","#0369a1",
  "#14b8a6","#22c55e","#eab308","#f97316",
  "#ef4444","#dc2626"
];

/* ─── helpers ─────────────────────────────────────────────────────── */
const doyLabel = (doy: number, locale: string = 'de-DE') => {
  const d = new Date(Date.UTC(2020, 0, doy));
  return `${String(d.getUTCDate()).padStart(2, "0")}-${d.toLocaleString(
    locale, { month: "short", timeZone: "UTC" }
  )}`;
};

const densify = (rows:Row[]) => {
  const out:Row[] = [], idx = new Map(rows.map(r=>[`${r.year}-${r.doy}`,r]));
  [...new Set(rows.map(r=>r.year))].forEach(y=>{
    for(let doy=SUN_START; doy<=SUN_END; doy++)
      out.push(idx.get(`${y}-${doy}`) ?? {year:y,doy,frac:null});
  });
  return out;
};

/* ─── component ──────────────────────────────────────────────────── */
export default function AllYearsSeasonChart({data, seasonMeans, apiRef}:Props){
  const { t } = useTranslation();
  const [mode, setMode] = useState<"all" | "early" | "late" | "latest">("all");
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const dense = useMemo(()=>densify(data),[data]);
  const uncertainty = useMemo(()=>indexSeasonUncertainty(seasonMeans),[seasonMeans]);
  const years = useMemo(()=>[...new Set(data.map(r=>r.year))].sort((a,b)=>a-b),[data]);
  /* Fixed 2021 boundary, shared with MemoryMeasurementTimeline and the
     backend's seasonLossPct window. A median split moved with the row count. */
  const split = useMemo(() => splitAtYear(years.map((year) => ({ year }))), [years]);
  const earlyYears = useMemo(() => new Set(split.early.map((r) => r.year)), [split]);
  const lateYears = useMemo(() => new Set(split.late.map((r) => r.year)), [split]);
  const latestYear = years.at(-1) ?? null;

  useImperativeHandle(apiRef, () => ({
    showMode: (nextMode) => setMode(nextMode),
    nextStage: () => setMode((current) => {
      if (current === "all") return "early";
      if (current === "early") return "late";
      if (current === "late") return "latest";
      return "all";
    }),
  }), []);

  /* GSAP stagger — must stay ABOVE the empty-state early return, or the hook
     count changes between the empty and the loaded render and React throws
     "Rendered more hooks than during the previous render" (blank page). */
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const el = gridRef.current; if(!el) return;
    if (prefersReducedMotion()) {
      gsap.set(Array.from(el.children), { opacity:1, y:0 });
      return;
    }
    gsap.fromTo(Array.from(el.children),
      { opacity:0, y:20 },
      { opacity:1, y:0, stagger:0.12, duration:0.6, ease:"power2.out",
        scrollTrigger:{ trigger:el, start:"top 85%" } }
    );
  },[years.length]);

  if (!years.length) {
    return (
      <ChartEmptyState title={t("charts.allYearsSeason.emptyTitle")}>
        {t("charts.allYearsSeason.emptyBody")}
      </ChartEmptyState>
    );
  }

  /* monthly tick DOYs */
  const ticks = [45,74,105,135,166,180];

  const locale = i18n.language === "de" ? "de-DE" : "en-US";
  /* one decimal everywhere, so 2021's 21,9 % and 2018's 61,6 % line up and a
     round value does not silently look more precise than its neighbours */
  const pctFmt = new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const numFmt = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const pct = (value: number) => pctFmt.format(value);
  /* lower bound without the unit: "42,9 bis 67,4 %" is how a German desk
     writes a range, not "42,9 % bis 67,4 %" */
  const bare = (value: number) => numFmt.format(value * 100);

  /* layout styles. The header sits in flow, not absolutely, so the band
     explainer can wrap freely instead of being squeezed into a 220px column
     next to the source badge. */
  const gridStyle:React.CSSProperties = {
    display:"grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap:18,
    justifyItems:"center",
    paddingTop:14,
  };

  const isDimmed = (yr: number) => {
    if (hoverYear !== null) return hoverYear !== yr;
    if (mode === "early") return !earlyYears.has(yr);
    if (mode === "late") return !lateYears.has(yr);
    if (mode === "latest") return yr !== latestYear;
    return false;
  };

  const Mini = (yr:number,i:number) => {
    const season = uncertainty.get(yr);
    /* The interval is a bootstrap percentile pair, so both ends come from
       ci95 directly. Reconstructing them as mean ± 1.96·SE would draw 2017
       symmetric when the measured interval reaches 0.161 below the mean and
       only 0.083 above it. */
    const band = season?.ci95 ?? null;
    const seasonLine =
      season && season.mean !== null && band
        ? t("charts.seasonUncertainty.panelLine", {
            mean: pct(season.mean),
            lo: bare(band[0]),
            hi: pct(band[1]),
          })
        : season && season.mean !== null
        ? pct(season.mean)
        : null;
    const summary =
      season && season.mean !== null && band && season.observedDays !== null
        ? t("charts.seasonUncertainty.rowSummary", {
            year: yr,
            mean: pct(season.mean),
            lo: bare(band[0]),
            hi: pct(band[1]),
            days: season.observedDays,
          })
        : undefined;

    return (
    <div
      key={yr}
      data-season-panel={yr}
      data-season-mean={season?.mean ?? ""}
      data-ci-lo={band?.[0] ?? ""}
      data-ci-hi={band?.[1] ?? ""}
      data-observed-days={season?.observedDays ?? ""}
      title={summary}
      className={`transition-opacity duration-300 ${isDimmed(yr) ? "opacity-25" : "opacity-100"}`}
      style={{width:"100%"}}
      onMouseEnter={() => setHoverYear(yr)}
      onMouseLeave={() => setHoverYear(null)}
    >
      <ResponsiveContainer width="100%" height={MINI_H}>
        {/* tight top/bottom margins: the y domain is fixed at 0 to 1, so the
            spare 32px only shrank the plot and with it the visible difference
            between a wide and a narrow interval */}
        <LineChart data={dense.filter(r=>r.year===yr)} margin={{left:8,right:8,top:8,bottom:8}}>
          <CartesianGrid className="chart-grid" strokeDasharray="2 3" stroke="#CBD5E1" vertical={false}/>
          <XAxis dataKey="doy" type="number" domain={[SUN_START,SUN_END]} ticks={ticks}
            tickFormatter={d => doyLabel(Number(d), i18n.language === 'de' ? 'de-DE' : 'en-US').split("-")[1]}
            axisLine={false} tickLine={false} height={18} className="chart-axis"/>
          <YAxis domain={[0,1]} ticks={[0,0.5,1]} tickFormatter={v=>`${(v*100).toFixed(0)} %`}
            tick={{fill:"#94a3b8",fontSize:10,dx:-4}} width={28} axisLine={false} tickLine={false} className="chart-axis"/>
                    <Tooltip 
            cursor={{ stroke: "#64748b", strokeDasharray: "3 3" }} 
            formatter={(v: number) => `${(v * 100).toFixed(1)} %`}
            labelFormatter={l => doyLabel(Number(l), i18n.language === 'de' ? 'de-DE' : 'en-US')}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              padding: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            labelStyle={{ color: '#1e293b', fontWeight: 600 }}
            itemStyle={{ color: '#475569' }}
          />
          {/* season mean and its sampling interval, drawn under the data line */}
          {band && (
            <ReferenceArea
              className="season-ci-band"
              y1={band[0]}
              y2={band[1]}
              fill="#0f172a"
              fillOpacity={0.09}
              stroke="#0f172a"
              strokeOpacity={0.28}
              strokeWidth={1}
              ifOverflow="hidden"
              isFront={false}
            />
          )}
          {season?.mean != null && (
            <ReferenceLine
              className="season-mean-line"
              y={season.mean}
              stroke="#0f172a"
              strokeOpacity={0.6}
              strokeWidth={1.25}
              strokeDasharray="5 3"
              ifOverflow="hidden"
            />
          )}

          <Line type="monotone" dataKey="frac" name={i18n.language === 'de' ? 'Anteil Meereis' : 'Fraction Sea Ice'} connectNulls dot={false}
            stroke={COLORS[i%COLORS.length]} strokeWidth={yr === latestYear ? 2.8 : 2}/>
        </LineChart>
      </ResponsiveContainer>
      <div style={{textAlign:"center",fontSize:12,color:"#64748b",marginTop:4}}>{yr}</div>
      {seasonLine && (
        <div
          data-season-line
          style={{textAlign:"center",fontSize:10,color:"#94a3b8",marginTop:1,fontVariantNumeric:"tabular-nums"}}
        >
          {seasonLine}
        </div>
      )}
    </div>
    );
  };

  return (
    <div style={{position:"relative",width:"100%"}} data-testid="all-years-season-chart" role="img" aria-label={t("charts.ariaSummaries.allYearsSeason")}>
      {/* header: title and source share a wrapping row, so neither can clip
          the other regardless of chart width */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 px-5 pt-6">
        <div
          className="min-w-0 flex-1 basis-60"
          style={{fontSize:28,fontWeight:600,color:"#0f172a",lineHeight:1.1}}
        >
          {t('charts.allYearsSeason.title')}
        </div>
        <div className="flex shrink-0 justify-end">
          <ChartSourceBadge href="https://github.com/lukaskreibig">
            {t("charts.allYearsSeason.source")}
          </ChartSourceBadge>
        </div>
      </div>

      {/* the reader meets the band here, before the first panel */}
      <div
        data-season-explainer
        className="mt-2 flex max-w-[70ch] items-start gap-2 px-5"
        style={{fontSize:12,lineHeight:1.4,color:"#64748b"}}
      >
        <span
          aria-hidden="true"
          style={{
            marginTop:3,
            flex:"0 0 auto",
            width:22,
            height:11,
            borderRadius:2,
            background:"rgba(15,23,42,0.09)",
            border:"1px solid rgba(15,23,42,0.28)",
            /* the dashed mean line inside the swatch, so the legend mark and
               the panels carry the same two elements */
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(15,23,42,0.6) 0 5px, transparent 5px 8px)",
            backgroundSize:"100% 1px",
            backgroundPosition:"center",
            backgroundRepeat:"no-repeat",
          }}
        />
        <span>{t("charts.seasonUncertainty.explainer")}</span>
      </div>

      {/* mini-chart grid */}
      <div ref={gridRef} style={gridStyle}>{years.map(Mini)}</div>
    </div>
  );
}
