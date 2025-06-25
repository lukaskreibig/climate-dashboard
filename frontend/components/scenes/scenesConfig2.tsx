/* ------------------------------------------------------------------
   scenesConfig2.tsx  ·  Chapter-2 storyline
   – uses the four working Recharts components
------------------------------------------------------------------ */
"use client";

import dynamic from "next/dynamic";
import { NO_MATCH } from "@/components/scenes/ChartScene";   // runtime value
import type { SceneCfg } from "@/components/scenes/ChartScene";  // type-only

/* —— lazy-load the Recharts files exactly as they exist on disk —— */
const MeanSpringAnomalyChart   = dynamic(
  () => import("@/components/Rechart/MeanSpringAnomalyChart"),   { ssr: false }
);
const EarlyLateSeasonChart     = dynamic(
  () => import("@/components/Rechart/EarlyLateSeasonChart"),     { ssr: false }
);
const MeanIceFractionChart     = dynamic(
  () => import("@/components/Rechart/MeanIceFractionChart"),     { ssr: false }
);
const FreezeBreakTimelineChart = dynamic(
  () => import("@/components/Rechart/FreezeBreakTimelineChart"), { ssr: false }
);

/* selector for grid + axis elements (so GSAP can fade them) */
const AXES = ".chart-grid, .chart-axis";

/* bundle shape coming from page.tsx */
interface DataBundle {
  spring : any[];
  season : any[];
  frac   : any[];
  freeze : any[];
}

/* ——————————————————————————————————————————————————————— */
export const scenes2: SceneCfg[] = [
  /* 1 ▸ mean spring anomaly -------------------------------- */
  {
    key     : "spring-anomaly",
    chart   : (d:DataBundle) => <MeanSpringAnomalyChart data={d.spring} />,
    axesSel : AXES,
    captions: [{
      html: (
        <>
          <h3 className="text-2xl font-display mb-2">Spring extent anomaly</h3>
          <p className="text-lg">
            March – May mean extent relative to the 2017-20 baseline.
            Recent springs plunge far below zero.
          </p>
        </>
      ),
    }],
  },

  /* 2 ▸ early ↔ late season – 4 interactive stages ---------- */
  {
    key   : "early-late",
    chart : (d:DataBundle, api) =>
              <EarlyLateSeasonChart data={d.season} apiRef={api} />,
    axesSel : AXES,
    captions: [
      {
        captionSide:"right",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">2017-20&nbsp;mean</h3>
            <p className="text-lg">
              A “recent normal” reference before the record lows.
            </p>
          </>
        ),
      },
      {
        captionSide:"right",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">2017-20&nbsp;IQR</h3>
            <p className="text-lg">
              Light-blue band shows the middle 50 % of those seasons.
            </p>
          </>
        ),
      },
      {
        captionSide:"right",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">2021-25&nbsp;mean</h3>
            <p className="text-lg">
              The latest five-year average (red) sits far lower.
            </p>
          </>
        ),
      },
      {
        captionSide:"right",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">2021-25&nbsp;IQR</h3>
            <p className="text-lg">
              Red envelope: virtually no overlap with the older “normal”.
            </p>
          </>
        ),
      },
    ],
    actions: [
      { captionIdx: 1, call: api => api?.nextStep?.() },
      { captionIdx: 2, call: api => api?.nextStep?.() },
      { captionIdx: 3, call: api => api?.nextStep?.() },
    ],
  },

  /* 3 ▸ mean ice fraction ---------------------------------- */
  {
    key     : "mean-fraction",
    chart   : (d:DataBundle) => <MeanIceFractionChart data={d.frac} />,
    axesSel : AXES,
    captions: [{
      captionSide:"left",
      html: (
        <>
          <h3 className="text-2xl font-display mb-2">How much ocean is still iced-over?</h3>
          <p className="text-lg">
            The year-average fraction keeps sliding — open water wins.
          </p>
        </>
      ),
    }],
  },

  /* 4 ▸ freeze / break-up timeline -------------------------- */
  {
    key   : "freeze-timeline",
    chart : (d:DataBundle) => <FreezeBreakTimelineChart data={d.freeze} />,
    axesSel : AXES,
    captions: [{
      html: (
        <>
          <h3 className="text-2xl font-display mb-2">Seasons are shifting fast</h3>
          <p className="text-lg">
            Later freeze-up (↑) and earlier break-up (↓) stretch the open-water
            season every year.
          </p>
        </>
      ),
    }],
  },

  /* 5 ▸ outro ---------------------------------------------- */
  {
    key      : "beta-2",
    chart    : () => <div className="w-full h-full bg-slate-100" />,
    axesSel  : NO_MATCH,
    chartSide: "fullscreen",
    captions : [{
      boxClass:"ice-card pointer-events-auto",
      html: (
        <>
          <h2 className="text-3xl font-bold mb-4">🚧 End&nbsp;of&nbsp;Chapter 2</h2>
          <p className="text-lg max-w-prose mx-auto">
            Thanks for exploring! New datasets &amp; interactions coming soon.
          </p>
        </>
      ),
    }],
  },
];

/* default export keeps legacy imports working */
export default scenes2;
