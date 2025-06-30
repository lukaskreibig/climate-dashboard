/* ------------------------------------------------------------------
   scenesConfig2.tsx · Chapter 2 — “How the ice is vanishing”
   Each scene = one sticky section orchestrated by ChartScene.tsx
------------------------------------------------------------------ */
"use client";

import dynamic            from "next/dynamic";
import { NO_MATCH }       from "@/components/scenes/ChartScene";
import type { SceneCfg }  from "@/components/scenes/ChartScene";


/* ⬇️  NEW: lightweight Mapbox hero             */
const MapFlyScene = dynamic(()=>import("@/components/MapFlyScene"),{ ssr:false });


/* ─── lazy-load visual blocks exactly as they live on disk ─── */
const HeroFade = dynamic(()=>import("@/components/HeroFade"),               { ssr:false });

const MeanSpringAnomalyChart   = dynamic(()=>import("@/components/Rechart/MeanSpringAnomalyChart"),   { ssr:false });
const EarlyLateSeasonChart     = dynamic(()=>import("@/components/Rechart/EarlyLateSeasonChart"),     { ssr:false });
const MeanIceFractionChart     = dynamic(()=>import("@/components/Rechart/MeanIceFractionChart"),     { ssr:false });
const FreezeBreakTimelineChart = dynamic(()=>import("@/components/Rechart/FreezeBreakTimelineChart"),  { ssr:false });
const AllYearsSeasonChart = dynamic(
  ()=>import("@/components/Rechart/AllYearsSeasonChart"), { ssr:false });

/* ─── simple placeholder so build never fails while assets arrive ─── */
const Placeholder = () => (
  <div className="w-full h-full flex items-center justify-center bg-gray-200">
    <span className="text-gray-600 text-sm">[graphic coming soon]</span>
  </div>
);

/* ─── data bundle shape from page.tsx ─── */
interface DataBundle{
  spring : any[];
  season : any[];
  frac   : any[];
  freeze : any[];
}

const AXES = ".chart-grid, .chart-axis";


/* ───────────────────────────────────────────────────────────── */
export const scenes2: SceneCfg[] = [

  {
  key      : "map-fly-intro",
  chartSide: "fullscreen",
  chart    : (_d, api) => (
    <MapFlyScene
      ref={api}
      waypoints={[
        { lng:   0, lat:  90, zoom: 1.3, pitch:0 },
        /* 0 — global view (Qausuittuq = ~north pole to centre the globe) */
        /* 1 — “hold” step: caption appears, map stays put */
      { noop: true } as any,            // no-op waypoint

        /* 1 — Greenland overview */
        { lng:-42, lat:  72, zoom: 3.3 },

        /* 2 — Uummannaq Fjord */
        { lng:-52.14, lat: 71, zoom: 7.0, pitch:45 },

        /* 3 — Final tilt toward town / iconic mountain */
        { lng:-52.14, lat: 70.67, zoom: 10, pitch:60, bearing: 30 },
      ]}
    />
  ),
  axesSel  : NO_MATCH,

  captions : [
    {
      boxClass  :"ice-card",
      html:(
        <>
          <h2 className="text-4xl font-bold mb-5">
            Chapter&nbsp;2<br/>How the Ice Is Vanishing
          </h2>
          <p className="text-lg max-w-prose mx-auto">
            Welcome to <strong>Uummannaq Fjord</strong>, Greenland.  
            We’ll start with raw satellite pixels and end with charts that
            reveal a season in free-fall.  
            <br/><br/>
            Scroll at your own pace.  When you see an <em>info icon</em> later,
            you can dive into extra methodology—otherwise, just follow the story.
          </p>
        </>
      )
    },
    {
      captionSide:"center",
      html:(
        <>
          <h2 className="text-3xl font-display mb-3">Where on Earth is Uummannaq?</h2>
          <p className="text-lg max-w-xl">
            Let’s start wide. From orbit the Arctic looks like a frozen crown
            atop the planet. Watch as we glide toward Greenland…
          </p>
        </>
      ),
    },
    {
      captionSide:"left",
      html:(
        <>
          <h3 className="text-2xl font-display mb-2">Greenland—the world’s largest island</h3>
          <p className="text-lg max-w-sm">
            80 % ice sheet, 20 % rugged coast, and home to fjords that carve
            hundreds of kilometres inland. Our story zooms into one of them.
          </p>
        </>
      ),
    },
    {
      captionSide:"right",
      html:(
        <>
          <h3 className="text-2xl font-display mb-2">Uummannaq Fjord</h3>
          <p className="text-lg max-w-sm">
            600 km north of the Arctic Circle an island hugs a heart-shaped
            mountain.  Sea-ice once sealed the fjord for eight months; now it’s
            vanishing twice as fast as global averages.
          </p>
        </>
      ),
    },
    {
      captionSide:"left",
      html:(
        <>
          <h3 className="text-2xl font-display mb-2">Ready for a closer look?</h3>
          <p className="text-lg max-w-lg">
            Hold tight—we’ll swoop down to eye-level, then show how satellites
            turn breathtaking scenery into hard data.
          </p>
        </>
      ),
    },
  ],

  /* trigger fly-to moves exactly when each caption appears --------------- */
  actions : [
    { captionIdx: 0, call: api => api?.go?.(0) },  // global
    { captionIdx: 1, call: api => api?.go?.(1) },  // Greenland
    { captionIdx: 2, call: api => api?.go?.(2) },  // fjord
    { captionIdx: 3, call: api => api?.go?.(3) },  // dramatic close-up
    { captionIdx: 4, call: api => api?.go?.(4) },  // final tilt  ← NEW
  ],
},

  /* 1 ▸ Hero image: raw RGB → machine overlay --------------------------- */
  {
    key      : "satellite-overlay",
    chart    : (_d, api)=>(
      <HeroFade
        ref={api}
        rawSrc     ="/images/satellite.png"      // swap for full-res later
        overlaySrc ="/images/overlay.png"
      />
    ),
    axesSel : NO_MATCH,

    captions:[
      /* idx 0 — raw frame */
      {
        captionSide:"left",
        html:(
          <>
            <h3 className="text-2xl font-display mb-2">A snapshot from space</h3>
            <p className="text-lg max-w-sm">
              Sentinel-2 revisits Uummannaq every few days.  
              Nice picture—until you try to measure anything:
              thin ice, clouds, and snow all share the same RGB shades.
            </p>
          </>
        )
      },
      /* idx 1 — overlay revealed */
      {
        captionSide:"left",
        html:(
          <>
            <h3 className="text-2xl font-display mb-2">Pixels get passports</h3>
            <p className="text-lg max-w-sm">
              A neural net classifies <strong>every pixel</strong>:  
              open water 🟦, thin ice 🟩, thick ice ⬛, land 🟫.  
              These daily masks feed the charts you’ll meet next.
            </p>
          </>
        )
      }
    ],

    actions:[
      { captionIdx:0, call: api=>api?.setOverlayShown?.(false) },
      { captionIdx:1, call: api=>api?.setOverlayShown?.(true)  },
    ]
  },
  /* 1 ▸ Hero image: raw RGB → machine overlay --------------------------- */
  {
    key      : "panel-overlay",
    chart    : (_d, api)=>(
      <HeroFade
        ref={api}
        rawSrc     ="/images/panel.png"      // swap for full-res later
        overlaySrc ="/images/pipeline.png"
      />
    ),
    axesSel : NO_MATCH,

    captions:[
      /* idx 0 — raw frame */
      {
        captionSide:"right",
        html:(
          <>
            <h3 className="text-2xl font-display mb-2">A snapshot from space</h3>
            <p className="text-lg max-w-sm">
              Sentinel-2 revisits Uummannaq every few days.  
              Nice picture—until you try to measure anything:
              thin ice, clouds, and snow all share the same RGB shades.
            </p>
          </>
        )
      },
      /* idx 1 — overlay revealed */
      {
        captionSide:"right",
        html:(
          <>
            <h3 className="text-2xl font-display mb-2">Pixels get passports</h3>
            <p className="text-lg max-w-sm">
              A neural net classifies <strong>every pixel</strong>:  
              open water 🟦, thin ice 🟩, thick ice ⬛, land 🟫.  
              These daily masks feed the charts you’ll meet next.
            </p>
          </>
        )
      }
    ],

    actions:[
      { captionIdx:0, call: api=>api?.setOverlayShown?.(false) },
      { captionIdx:1, call: api=>api?.setOverlayShown?.(true)  },
    ]
  },

  /* 2 ▸ Optional swipe/zoom tile — placeholder for now ----------------- */
  {
    key     : "tile-swipe",
    chart   : () => <Placeholder/>,
    axesSel : NO_MATCH,
    captions:[{
      captionSide:"center",
      wide:true,
      html:(
        <>
          <h3 className="text-2xl font-display mb-2">Zoom-in preview</h3>
          <p className="text-lg max-w-xl mx-auto">
            Coming soon: drag to compare raw RGB versus spectral indices on a
            500 × 500 m tile—your gut-check that the model isn’t hallucinating.
          </p>
        </>
      )
    }]
  },

  /* 3 ▸ Spring anomaly bar/line --------------------------------------- */
  {
    key    : "spring-anomaly",
    chart  : (d:DataBundle) => <MeanSpringAnomalyChart data={d.spring}/>,
    axesSel: ".chart-grid, .chart-axis",

    captions:[{
      captionSide:"right",
      html:(
        <>
          <h3 className="text-2xl font-display mb-2">Spring isn’t coming back</h3>
          <p className="text-lg">
            March–May ice cover now sits <strong>~ 60 % below</strong> the
            2017-20 normal.  Locals feel it when sled routes turn to slush—
            our masks saw it first.
          </p>
        </>
      )
    }]
  },

  /* 4½ ▸ Every year comparison ---------------------------------------- */
{
  key   : "all-years",
  chart : (d:DataBundle,api)=>
            <AllYearsSeasonChart data={d.daily} apiRef={api}/>,
  axesSel : ".chart-grid, .chart-axis",
  captions:[
    {
      captionSide:"right",
      html:(
        <>
          <h3 className="text-2xl font-display mb-2">Ten seasons, ten stories</h3>
          <p className="text-lg">
            Each mini-chart = one February–June.  Hover to spot the outliers.
          </p>
        </>
      )
    },
    {
      captionSide:"right",
      html:(
        <>
          <h3 className="text-2xl font-display mb-2">Overlay them all</h3>
          <p className="text-lg">
            Lines pile up and the envelope shrinks –
            a visual cliff as ice retreats.
          </p>
        </>
      )
    },
  ],
  actions:[
    { captionIdx:1, call:api=>api?.nextStage?.() },   // mini-grid → overlay
  ],
},

  /* 4 ▸ Early vs late season (4-step interactive) ---------------------- */
  {
    key   : "early-late",
    chart : (d:DataBundle, api) =>
              <EarlyLateSeasonChart data={d.season} apiRef={api} />,
    axesSel : AXES,
    axesInIdx   : 0,
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
    ],
    actions: [
      { captionIdx: 1, call: api => api?.nextStep?.() },
    ],
  },


  /* 5 ▸ Year-average ice fraction ------------------------------------- */
  {
    key    : "annual-fraction",
    chart  : (d:DataBundle) => <MeanIceFractionChart data={d.frac}/>,
    axesSel: ".chart-grid, .chart-axis",

    captions:[{
      captionSide:"left",
      html:(
        <>
          <h3 className="text-2xl font-display mb-2">
            On an “average” day, half the fjord is water
          </h3>
          <p className="text-lg max-w-sm">
            Ten years ago ~70 % stayed frozen.  
            The trend erodes another <strong>3 % per year</strong>.
          </p>
        </>
      )
    }]
  },

  /* 7 ▸ Chapter outro -------------------------------------------------- */
  {
    key      : "chapter-end",
    chart    : () => <Placeholder/>,     // swap for CTA banner later
    chartSide: "fullscreen",
    axesSel  : NO_MATCH,

    captions:[{
      captionSide:"center",
      boxClass:"ice-card pointer-events-auto",
      html:(
        <>
          <h2 className="text-3xl font-bold mb-4">End of Chapter 2</h2>
          <p className="text-lg max-w-prose mx-auto">
            Next we’ll pit Uummannaq against four other fjords
            and test which climate indices best predict the melt.  
            Ready to keep exploring?
          </p>
        </>
      )
    }]
  },
];

/* keep legacy imports working ---------------------------------------- */
export default scenes2;
