/* ------------------------------------------------------------------
   scenesConfig2.tsx · Chapter 2 — "How the Ice is Vanishing"
   JOURNALISTIC STORYTELLING STRUCTURE
   Clean red thread: Place → People → Problem → Science → Evidence → Impact
------------------------------------------------------------------ */
"use client";

import dynamic from "next/dynamic";
import { NO_MATCH } from "@/components/scenes/ChartScene";
import type { SceneCfg } from "@/components/scenes/ChartScene";

/* ─── Core components ─── */
const HeroFade = dynamic(() => import("@/components/HeroFade"), { ssr: false });

// Direct imports for remaining components  
import PhotoStory from "@/components/PhotoStory";
import HumanImpactStory from "@/components/HumanImpactStory";

/* ─── Chart components ─── */
const MeanSpringAnomalyChart = dynamic(() => import("@/components/Rechart/MeanSpringAnomalyChart"), { ssr: false });
const EarlyLateSeasonChart = dynamic(() => import("@/components/Rechart/EarlyLateSeasonChart"), { ssr: false });
const MeanIceFractionChart = dynamic(() => import("@/components/Rechart/MeanIceFractionChart"), { ssr: false });
const FreezeBreakTimelineChart = dynamic(() => import("@/components/Rechart/FreezeBreakTimelineChart"), { ssr: false });
const AllYearsSeasonChart = dynamic(() => import("@/components/Rechart/AllYearsSeasonChart"), { ssr: false });


import NextChapterButton from "../NextChapterButton";

/* lazy-loaded charts ------------------------------------------ */
const SeasonalChart = dynamic(()=>import("@/components/Rechart/SeasonalLinesChartRecharts"),{ ssr:false });
const AnnualChart   = dynamic(()=>import("@/components/Rechart/AnnualAnomalyBarChartRecharts"),{ ssr:false });
const IQRChart      = dynamic(()=>import("@/components/Rechart/IQRChartRecharts"),{ ssr:false });
const DailyChart    = dynamic(()=>import("@/components/Rechart/DailyAnomalyChartRecharts"),{ ssr:false });
const MultiChart    = dynamic(()=>import("@/components/Rechart/MultiLineRecharts"),{ ssr:false });
const ZScoreChart   = dynamic(()=>import("@/components/Rechart/ZScoreChartRecharts"),{ ssr:false });
const Bar24Chart    = dynamic(()=>import("@/components/Rechart/BarChart2024Recharts"),{ ssr:false });
const ScatterChart  = dynamic(()=>import("@/components/Rechart/ScatterChartRecharts"),{ ssr:false });

/* NEW: Why Arctic explainer component */
const WhyArcticExplainer = dynamic(()=>import("@/components/WhyArcticExplainer"),{ ssr:false });

/* helper ------------------------------------------------------- */
const AXES = ".chart-grid, .chart-axis";

interface DataBundle{
  dailySeaIce   : any[];
  annualAnomaly : any[];
  iqrStats      : any;
  annual        : any[];
}


/* ─── Data bundle interface ─── */
interface DataBundle {
  spring: any[];
  season: any[];
  frac: any[];
  freeze: any[];
  daily: any[];
}

/* ───────────────────────────────────────────────────────────── */
/* CHAPTER 2: JOURNALISTIC STORYTELLING STRUCTURE                */
/* ───────────────────────────────────────────────────────────── */

export const scenes2: SceneCfg[] = [

  /* ═══════════════════════════════════════════════════════════ */
  /* ACT I: ESTABLISHING THE PLACE                               */
  /* ═══════════════════════════════════════════════════════════ */

  // /* ═══ SCENE 1: WHERE ARE WE? ═══ */
  // {
  //   key: "geographic-journey",
  //   chartSide: "fullscreen",
  //   parallax: false,
  //   chart: (_d, api) => (
  //     <MapFlyScene
  //       ref={api}
  //       waypoints={[
  //         { lng: 0, lat: 90, zoom: 1.3, pitch: 0 },          // Global Arctic
  //         { lng: -42, lat: 72, zoom: 3.3, pitch: 0 },        // Greenland
  //         { lng: -52.14, lat: 71, zoom: 7.0, pitch: 30 },    // Uummannaq Bay
  //         { lng: -52.27, lat: 70.67, zoom: 10, pitch: 60, bearing: 30 },
  //          { lng: -52.27, lat: 70.69, zoom: 10, pitch: 0, bearing: 0 },

  //       ]}
  //     />
  //   ),
  //   axesSel: NO_MATCH,

  //   captions: [
  //     {
  //       captionSide: "center",
  //       boxClass: "ice-card",
  //       html: (
  //         <>
  //           <h2 className="text-4xl font-bold mb-5">
  //             Chapter&nbsp;2<br />How the Ice is Vanishing
  //           </h2>
  //           <p className="text-lg max-w-prose mx-auto">
  //             In the Arctic, entire communities depend on sea ice for survival. 
  //             But what happens when that ice starts disappearing faster than ever before?
  //           </p>
  //         </>
  //       ),
  //     },
  //     {
  //       captionSide: "left",
  //       html: (
  //         <>
  //           <h3 className="text-2xl font-display mb-2">Greenland</h3>
  //           <p className="text-lg max-w-sm">
  //             The world's largest island. 80% ice sheet, 20% rugged coastline. 
  //             Along this coast, deep fjords carve hundreds of kilometers inland, 
  //             creating sheltered harbors where Arctic communities have thrived for millennia.
  //           </p>
  //         </>
  //       ),
  //     },
  //     {
  //       captionSide: "right",
  //       html: (
  //         <>
  //           <h3 className="text-2xl font-display mb-2">Uummannaq Bay</h3>
  //           <p className="text-lg max-w-sm">
  //             600 kilometers north of the Arctic Circle, this bay opens into one of 
  //             Greenland's most dramatic fjord systems. For most of the year, 
  //             sea ice turns these waters into frozen highways.
  //           </p>
  //         </>
  //       ),
  //     },
  //     {
  //       captionSide: "left",
  //       html: (
  //         <>
  //           <h3 className="text-2xl font-display mb-2">Uummannaq Island</h3>
  //           <p className="text-lg max-w-lg">
  //             Home to 1,300 people living beneath a distinctive heart-shaped mountain. 
  //             This community represents thousands of Arctic settlements whose existence 
  //             depends entirely on predictable sea ice patterns.
  //             <br/><br/>
  //             <span className="text-blue-400 font-semibold">But those patterns are changing...</span>
  //           </p>
  //         </>
  //       ),
  //     },
  //   ],

  //   actions: [
  //     { captionIdx: 0, call: api => api?.go?.(0) }, // Global Arctic
  //     { captionIdx: 1, call: api => api?.go?.(1) }, // Greenland
  //     { captionIdx: 2, call: api => api?.go?.(2) }, // Uummannaq Bay
  //     { captionIdx: 3, call: api => api?.go?.(3) }, // Uummannaq Island
  //     { captionIdx: 4, call: api => api?.go?.(4) }, // Uummannaq Island
  //   ],
  // },

  /* ═══ SCENE 2: WHO LIVES HERE? ═══ */
{
  key: "community-introduction",
  chartSide: "fullscreen",
  parallax: false,
  chart: (_d, api) => {
    // Simplified data structure - only images
    const images = [
      {
        image: "/images/community-elder.jpg",
        alt: "Community Elder in Uummannaq"
      },
      {
        image: "/images/community-bonds.jpg", 
        alt: "Community gathering in Uummannaq"
      },
      {
        image: "/images/storm.jpg",
        alt: "Young hunter in changing Arctic conditions"
      }
    ];

    return (
      <HumanImpactStory
        ref={api}
        images={images}
        transition="fade"
      />
    );
  },
  axesSel: NO_MATCH,

  captions: [
    {
      captionSide: "center", 
      boxClass: "ice-card",
      html: (
        <>
          <h2 className="text-3xl font-bold mb-4">Voices from the Community</h2>
          <p className="text-lg text-center max-w-2xl mx-auto">
            The people of Uummannaq have lived with Arctic ice for generations. 
            Their observations, passed down through families, now tell a story 
            of unprecedented change.
          </p>
        </>
      ),
    },
    {
      captionSide: "right",
      html: (
        <>
          <h3 className="text-2xl font-display mb-2">The Elder's Memory</h3>
          <p className="text-lg max-w-sm mb-4">
            <span className="text-gray-400 text-sm">Community Elder, 67 • Uummannaq, 2018</span>
          </p>
          <blockquote className="text-lg italic mb-4 border-l-4 border-blue-400 pl-4">
            "When I was a child, the ice was gone in June and July, now it is gone in April and May."
          </blockquote>
          <p className="text-red-400 font-medium">
            Impact: A childhood memory becomes climate data
          </p>
        </>
      ),
    },
    {
      captionSide: "left", 
      html: (
        <>
          <h3 className="text-2xl font-display mb-2">Community Bonds</h3>
          <p className="text-lg max-w-sm mb-4">
            <span className="text-gray-400 text-sm">Community Elder • Uummannaq, 2018</span>
          </p>
          <blockquote className="text-lg italic mb-4 border-l-4 border-blue-400 pl-4">
            "Our ancestors were strong people, because they worked together to solve problems and helped each other. People became individualists and stopped helping others."
          </blockquote>
          <p className="text-red-400 font-medium">
            Impact: Social fabric changes with the environment
          </p>
        </>
      ),
    },
    {
      captionSide: "right",
      html: (
        <>
          <h3 className="text-2xl font-display mb-2">The Young Hunter</h3>
          <p className="text-lg max-w-sm mb-4">
            <span className="text-gray-400 text-sm">Hunter, 28 • Uummannaq, 2018</span>
          </p>
          <blockquote className="text-lg italic mb-4 border-l-4 border-blue-400 pl-4">
            "The most important change, is that the climate has become more instable now and the wind is more unpredictable and stronger."
          </blockquote>
          <p className="text-red-400 font-medium">
            Impact: Traditional knowledge becomes unreliable
          </p>
        </>
      ),
    },
  ],

  actions: [
    // No action for first caption (intro)
    { captionIdx: 1, call: api => api?.goToStory?.(0) }, // Show elder image
    { captionIdx: 2, call: api => api?.goToStory?.(1) }, // Show community image  
    { captionIdx: 3, call: api => api?.goToStory?.(2) }, // Show hunter image
  ],
},

/* ═══ SCENE 3: WHAT'S CHANGING? ═══ */
{
  key: "changes-witnessed",
  chartSide: "fullscreen",
  parallax: false, 
  chart: (_d, api) => {
    const images = [
      {
        image: "/images/motorsledge.jpg",
        alt: "Motor sledge replacing traditional dog sleds"
      },
      {
        image: "/images/narwhal.jpg", 
        alt: "Narwhal hunting traditions under pressure"
      },
      {
        image: "/images/kiddog.jpg",
        alt: "Young person with sled dogs in modern Arctic"
      }
    ];

    return (
      <HumanImpactStory
        ref={api}
        images={images}
        transition="slide"
      />
    );
  },
  axesSel: NO_MATCH,

  captions: [
    {
      captionSide: "center",
      boxClass: "ice-card", 
      html: (
        <>
          <h2 className="text-3xl font-bold mb-4">Change in Real Time</h2>
          <p className="text-lg text-center max-w-2xl mx-auto">
            These aren't abstract statistics. These are real people adapting 
            to environmental changes happening faster than their communities 
            can adjust.
          </p>
        </>
      ),
    },
    {
      captionSide: "left",
      html: (
        <>
          <h3 className="text-2xl font-display mb-2">Traditions Under Pressure</h3>
          <p className="text-lg max-w-sm mb-4">
            <span className="text-gray-400 text-sm">Hunter • Uummannaq, 2018</span>
          </p>
          <blockquote className="text-lg italic mb-4 border-l-4 border-blue-400 pl-4">
            "A lot of hunters prefer the motorsledge over dogsledding, because the winters are too short, the snowmobiles are faster to transport the catch."
          </blockquote>
          <p className="text-red-400 font-medium">
            Impact: 4,000 years of culture adapts in a decade
          </p>
        </>
      ),
    },
    {
      captionSide: "right", 
      html: (
        <>
          <h3 className="text-2xl font-display mb-2">Cultural Identity at Risk</h3>
          <p className="text-lg max-w-sm mb-4">
            <span className="text-gray-400 text-sm">Experienced Hunter • Uummannaq, 2018</span>
          </p>
          <blockquote className="text-lg italic mb-4 border-l-4 border-blue-400 pl-4">
            "Narwhal hunting has changed a lot, because they decreased the quotas. That's why I think young people don't want to become hunters."
          </blockquote>
          <p className="text-red-400 font-medium">
            Impact: Knowledge dies with the elders
          </p>
        </>
      ),
    },
    {
      captionSide: "left",
      html: (
        <>
          <h3 className="text-2xl font-display mb-2">A New Generation</h3>
          <p className="text-lg max-w-sm mb-4">
            <span className="text-gray-400 text-sm">Student, 12 • Uummannaq, 2018</span>
          </p>
          <p className="text-lg mb-4">
            For this child, unpredictable ice isn't a crisis—it's normal. They've never known the reliable seasons their grandparents describe.
          </p>
          <p className="text-red-400 font-medium">
            Impact: Climate change becomes the baseline
          </p>
        </>
      ),
    },
    {
      captionSide: "center",
      boxClass: "ice-card",
      html: (
        <>
          <p className="text-lg text-center max-w-2xl mx-auto">
            But how do we measure what they're experiencing?
            <br/><br/>
            <span className="text-purple-400 font-semibold">
              That's where satellites come in...
            </span>
          </p>
        </>
      ),
    },
  ],

  actions: [
    // No action for first caption (intro)
    { captionIdx: 1, call: api => api?.goToStory?.(0) }, // Show motorsledge
    { captionIdx: 2, call: api => api?.goToStory?.(1) }, // Show narwhal hunting
    { captionIdx: 3, call: api => api?.goToStory?.(2) }, // Show young person
    // No action for last caption (transition)
  ],
},
  /* ═══════════════════════════════════════════════════════════ */
  /* ACT III: THE SCIENCE                                        */
  /* ═══════════════════════════════════════════════════════════ */

  /* ═══ SCENE 4: HOW WE MEASURE CHANGE ═══ */
  {
    key: "measuring-change",
    chart: (_d, api) => (
      <HeroFade
        ref={api}
        rawSrc="/images/satellite.png"
        overlaySrc="/images/overlay.png"
      />
    ),
    axesSel: NO_MATCH,

    captions: [
      {
        captionSide: "left",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">Human Observations</h3>
            <p className="text-lg max-w-sm">
              The residents of Uummannaq see and feel changes every day. 
              Their knowledge spans generations. But to understand the full scope 
              of what's happening, we need a different perspective.
            </p>
          </>
        ),
      },
      {
        captionSide: "left",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">Satellite Precision</h3>
            <p className="text-lg max-w-sm">
              Every day, Sentinel-2 photographs Uummannaq from 786 km above. 
              A neural network classifies each pixel: open water 🟦, thin ice 🟩, 
              thick ice ⬛, land 🟫. Human stories become scientific data.
            </p>
          </>
        ),
      },
    ],

    actions: [
      { captionIdx: 0, call: api => api?.setOverlayShown?.(false) },
      { captionIdx: 1, call: api => api?.setOverlayShown?.(true) },
    ],
  },

  /* ═══ SCENE 5: FROM PIXELS TO PATTERNS ═══ */
  {
    key: "pixels-to-patterns",
    chart: (_d, api) => (
      <HeroFade
        ref={api}
        rawSrc="/images/panel.png"
        overlaySrc="/images/pipeline.png"
      />
    ),
    axesSel: NO_MATCH,

    captions: [
      {
        captionSide: "right",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">Daily Monitoring</h3>
            <p className="text-lg max-w-sm">
              Millions of pixels become a single daily measurement: 
              the percentage of Uummannaq Fjord covered by ice. 
              Simple, precise, objective.
            </p>
          </>
        ),
      },
      {
        captionSide: "right",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">10 Years of Truth</h3>
            <p className="text-lg max-w-sm">
              We've compiled a decade of these daily measurements. 
              The patterns that emerge confirm what the community has been saying—
              and reveal the full extent of the changes.
            </p>
          </>
        ),
      },
    ],

    actions: [
      { captionIdx: 0, call: api => api?.setOverlayShown?.(false) },
      { captionIdx: 1, call: api => api?.setOverlayShown?.(true) },
    ],
  },

  /* ═══════════════════════════════════════════════════════════ */
  /* ACT IV: THE EVIDENCE                                        */
  /* ═══════════════════════════════════════════════════════════ */

  /* ═══ SCENE 6: THE VISUAL PROOF ═══ */
  {
    key: "visual-proof",
    chart: (d: DataBundle, api) => <AllYearsSeasonChart data={d.daily} apiRef={api} />,
    axesSel: AXES,

    captions: [
      {
        captionSide: "right",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">A Decade of Seasons</h3>
            <p className="text-lg">
              Each small chart shows one year from February to June. 
              The early years (blue) still followed relatively predictable patterns. 
              The recent years (red) tell a different story entirely.
            </p>
          </>
        ),
      },
      {
        captionSide: "right",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">The Numbers Don't Lie</h3>
            <p className="text-lg">
              When we overlay all the years, the trend becomes undeniable: 
              <span className="text-red-400 font-bold">45.2% less ice</span> since 2017.
              <br/><br/>
              The elder's memory—"when I was a child, the ice was gone in June and July, 
              now it is gone in April and May"—is precisely correct.
            </p>
          </>
        ),
      },
    ],

    actions: [
      { captionIdx: 1, call: api => api?.nextStage?.() },
    ],
  },

  /* ═══ SCENE 7: SPRING DISAPPEARING ═══ */
  {
    key: "spring-disappearing",
    chart: (d: DataBundle) => <MeanSpringAnomalyChart data={d.spring} />,
    axesSel: AXES,

    captions: [
      {
        captionSide: "right",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">The Spring That Vanished</h3>
            <p className="text-lg max-w-lg">
              Spring in the Arctic—March through May—was traditionally when 
              communities prepared for the hunting season. Stable ice provided 
              safe travel and reliable access to resources.
              <br/><br/>
              Today: <span className="text-red-500 font-bold text-xl">60% less ice</span> 
              during these crucial months. The season their grandparents knew has simply disappeared.
            </p>
          </>
        ),
      },
    ],
  },

  /* ═══ SCENE 8: THE NEW ABNORMAL ═══ */
  {
    key: "new-abnormal",
    chart: (d: DataBundle, api) => <EarlyLateSeasonChart data={d.season} apiRef={api} />,
    axesSel: AXES,
    axesInIdx: 0,

    captions: [
      {
        captionSide: "right",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">When "Normal" Shifts</h3>
            <p className="text-lg">
              The blue line shows 2017-2020: what was considered normal just four years ago. 
              The light blue band represents typical seasonal variation.
            </p>
          </>
        ),
      },
      {
        captionSide: "right",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">Living Outside the Lines</h3>
            <p className="text-lg">
              The red line shows 2021-2025: the new reality. 
              <span className="text-red-400 font-bold">11.9% less ice coverage</span> means 
              the community now lives permanently outside what was once normal variation.
              <br/><br/>
              Hence: motorsleds replacing dog teams, boats replacing ice roads.
            </p>
          </>
        ),
      },
    ],

    actions: [
      { captionIdx: 1, call: api => api?.nextStep?.() },
    ],
  },

  /* ═══════════════════════════════════════════════════════════ */
  /* ACT V: THE TRENDS                                           */
  /* ═══════════════════════════════════════════════════════════ */

  /* ═══ SCENE 9: THE TRAJECTORY ═══ */
  {
    key: "trajectory",
    chart: (d: DataBundle) => <MeanIceFractionChart data={d.frac} />,
    axesSel: AXES,

    captions: [
      {
        captionSide: "left",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">Where This Is Heading</h3>
            <p className="text-lg max-w-lg">
              Today, on an average day, half of Uummannaq Fjord is open water. 
              A decade ago, 70% stayed frozen year-round.
              <br/><br/>
              Current rate of change: <span className="text-red-500 font-bold">3% loss per year.</span>
              <br/><br/>
              If this continues, the children we met will experience completely ice-free conditions 
              within 15 years. The Arctic their grandparents knew will exist only in memory.
            </p>
          </>
        ),
      },
    ],
  },

  /* ═══ SCENE 10: SEASONS OUT OF SYNC ═══ */
  {
    key: "seasons-out-of-sync",
    chart: (d: DataBundle) => <FreezeBreakTimelineChart data={d.freeze} />,
    axesSel: AXES,

    captions: [
      {
        captionSide: "right",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">When Nature Loses Its Rhythm</h3>
            <p className="text-lg max-w-lg">
              <span className="text-blue-400">Ice formation (blue)</span> starts later each year. 
              <span className="text-pink-400">Ice breakup (pink)</span> happens earlier.
              <br/><br/>
              The 4,000-year-old seasonal cycle that governed Arctic life is breaking down. 
              Traditional calendars become obsolete. Planning becomes impossible.
              <br/><br/>
              As one hunter told us: "the winters are too short."
            </p>
          </>
        ),
      },
    ],
  },

  /* ═══════════════════════════════════════════════════════════ */
  /* ACT VI: BACK TO THE PEOPLE                                  */
  /* ═══════════════════════════════════════════════════════════ */

  /* ═══ SCENE 11: THEN AND NOW ═══ */
  {
    key: "then-and-now",
    chartSide: "fullscreen",
    parallax: false,
    chart: (_d, api) => {
      const photos = [
        {
          src: "/images/heart-of-seal/traditional-life-2017.jpg",
          alt: "Traditional Arctic life, Uummannaq 2017",
          year: "2017",
          location: "Uummannaq",
          caption: "2017: Traditional hunting methods, reliable ice patterns, community cooperation"
        },
        {
          src: "/images/heart-of-seal/changed-reality-2024.jpg",
          alt: "Adapted reality, Uummannaq 2024",
          year: "2024",
          location: "Uummannaq",
          caption: "2024: Technological adaptation, unpredictable conditions, individual solutions"
        }
      ];

      return (
        <PhotoStory
          ref={api}
          variant="comparison"
          photos={photos}
          showNavigation={true}
        />
      );
    },
    axesSel: NO_MATCH,

    captions: [
      {
        captionSide: "center",
        boxClass: "ice-card",
        html: (
          <>
            <h2 className="text-3xl font-bold mb-4">Seven Years of Adaptation</h2>
            <p className="text-lg max-w-prose mx-auto">
              The data tells one story: 45% ice loss, accelerating trends, shifting seasons. 
              But behind every statistic is a human reality.
              <br/><br/>
              Left: How things worked when ice was predictable. 
              Right: How people adapt when nothing is certain.
              <br/><br/>
              The community survives, but something essential has been lost—
              a connection to the natural world that sustained their culture for millennia.
            </p>
          </>
        ),
      },
    ],
  },

  /* ═══ SCENE 12: WHAT THIS MEANS ═══ */
  {
    key: "what-this-means",
    chart: () => (
      <div className="w-full h-full bg-gradient-to-br from-blue-900 via-gray-900 to-black flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 text-center max-w-4xl px-8">
          <h2 className="text-5xl font-bold mb-8 text-white">The Bigger Picture</h2>
          
          <div className="grid md:grid-cols-2 gap-8 text-left mb-8">
            <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6 border border-gray-600">
              <h4 className="text-xl font-bold mb-3 text-red-400">What We Documented</h4>
              <ul className="text-gray-200 space-y-2">
                <li>• Community observations spanning generations</li>
                <li>• 10 years of precise satellite measurements</li>
                <li>• 45% ice loss in just 7 years</li>
                <li>• Seasonal patterns shifting by months</li>
                <li>• Cultural traditions adapting or disappearing</li>
              </ul>
            </div>
            
            <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6 border border-gray-600">
              <h4 className="text-xl font-bold mb-3 text-blue-400">What It Represents</h4>
              <ul className="text-gray-200 space-y-2">
                <li>• Arctic amplification in action</li>
                <li>• Climate change at the human scale</li>
                <li>• Traditional knowledge validated by science</li>
                <li>• Adaptation at the speed of survival</li>
                <li>• A preview of global patterns</li>
              </ul>
            </div>
          </div>

          <div className="bg-blue-600/20 border border-blue-400/30 rounded-lg p-6">
            <p className="text-lg text-blue-100 leading-relaxed">
              Uummannaq isn't unique. Across the Arctic, communities are experiencing 
              similar transformations. The question isn't whether change is happening—
              it's how fast, and what it means for the future.
            </p>
          </div>
        </div>
      </div>
    ),
    chartSide: "fullscreen",
    axesSel: NO_MATCH,

    captions: [
      {
        captionSide: "center",
        boxClass: "ice-card pointer-events-auto",
        html: (
          <>
            <h2 className="text-3xl font-bold mb-4">End of Chapter 2</h2>
            <p className="text-lg max-w-prose mx-auto mb-6">
              We've heard from a community, measured their experiences with science, 
              and documented the reality of Arctic change. Uummannaq's story is both 
              deeply local and globally significant.
              <br/><br/>
              But is this pattern universal? How does Uummannaq compare to other Arctic regions?
            </p>
            <p className="text-xl font-semibold text-blue-400 mb-6">
              Chapter 3: We'll compare Uummannaq with four other Arctic fjords 
              and identify which climate factors best predict ice loss worldwide.
            </p>
            <div className="text-sm text-gray-400 space-y-1">
              <p>Community documentation: "Heart of a Seal"</p>
              <p>Research collaboration: "Life on thin ice" - Baztan et al.</p>
              <p>Satellite analysis: Sentinel-2 / Neural network classification</p>
            </div>
          </>
        ),
      },
    ],
  },
   // /* 0 — Project introduction (enhanced storytelling) ---------- */
  // {
  //   key   : "intro",  
  //   wide  : true,            
  //   chart : () => null,
  //   axesSel: NO_MATCH,
  //   plainCaptions: true,

  //   captions: [
  //     {
  //       boxClass:"ice-card",
  //       html: (
  //         <>
  //           <h2 className="text-4xl font-bold mb-5">
  //             Chapter 1<br/>
  //             The Arctic: Our Planet's Canary
  //           </h2>
  //           <p className="text-lg max-w-prose mx-auto">
  //             Deep in a Greenlandic fjord, I watched ancient ice disappear into dark water. 
  //             What I witnessed with my own eyes, satellites have been documenting for decades.
  //             <br /><br />
  //             This is the story the data tells—and why it matters to all of us.
  //             <br /><br />
  //             <em>Scroll at your own pace. The charts ahead will guide you through one of the planet's most dramatic transformations.</em>
  //           </p>
  //         </>
  //       ),
  //     },
  //   ],
  // },

  {
  key: "witness-journey",
  chartSide: "fullscreen", 
  chart: (_d, api) => {
    // Test mit Placeholder-Bildern
    const photos = [
      {
        src: "/images/motorsledge.jpg", // Arctic landscape
        alt: "Arctic panorama",
        caption: "The vast Arctic landscape that drew me to document this story",
      },
      {
        src: "/images/narwhal.jpg", // Ice formations
        alt: "Ice formations",
        caption: "Ancient ice formations, now melting rapidly",
      },
      {
        src: "/images/kiddog.jpg", // Melting ice
        alt: "Melting moment", 
        caption: "Watching thousand-year-old ice disappear",
      }
    ];

    return (
      <PhotoStory
        ref={api}
        photos={photos}
        parallaxIntensity={0.5}
        variant="scroll-story" // Dein Original-Design!
        mainCaption="When I was a child, the ice was gone in June and July, now it is gone in April and May."
        author="Uummannaq Resident"
        // authorSubtitle="Climate scientist and National Geographic Explorer"
        className="w-full h-full" // Wichtig für ChartScene
      />
    );
  },
  axesSel: NO_MATCH,
  plainCaptions: true,
  parallax: false,
  captions: [
    {
      html: <></>, // Leere Caption für ChartScene scroll trigger
    }
  ],
},

// Test-Versionen mit unterschiedlicher Bildanzahl:

// 1 Bild - Side-by-Side Layout
{
  key: "single-photo-test",
  chartSide: "fullscreen",
  scrollScreens: 2,
  chart: (_d, api) => {
    const photos = [
      {
        src: "/images/narwhal.jpg",
        alt: "Arctic panorama",
        caption: "A single powerful image",
      }
    ];

    return (
      <PhotoStory
        ref={api}
        photos={photos}
        variant="scroll-story"
        parallaxIntensity={0.5}
        mainCaption="In this remote Greenlandic fjord, satellites have documented decades of change. What took millennia to form is disappearing in decades."
        author="JONAS BÖHM"
        authorSubtitle="Documentary Photographer"
        className="w-full h-full"
      />
    );
  },
  axesSel: NO_MATCH,
  captions: [{ html: <></> }],
},

// 2 Bilder
{
  key: "dual-photo-test",
  chartSide: "fullscreen",
  scrollScreens: 2,
  chart: (_d, api) => {
    const photos = [
      {
        src: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop",
        alt: "Morning ice",
      },
      {
        src: "https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=800&h=600&fit=crop",
        alt: "Evening ice",
      }
    ];

    return (
      <PhotoStory
        ref={api}
        photos={photos}
        parallaxIntensity={0.5}
        variant="scroll-story"
        mainCaption="24 hours on the ice sheet. The same glacier, transformed by light and shadow."
        author="FIELD TEAM"
        authorSubtitle="Arctic Research Station"
        className="w-full h-full"
      />
    );
  },
  axesSel: NO_MATCH,
  captions: [{ html: <></> }],
},


// {
//   /* ─── Your photo essay, now scrolling like a caption ─── */
//   key        : "witness-journey",

//   /* no chart at all – this scene is 100 % caption content */
//   chart      : () => null,
//   chartSide  : "center",  // irrelevant when chart == null
//   axesSel    : NO_MATCH,
//   plainCaptions : true,   // minimal box styling

//   captions : [
//     {
//       /* the entire PhotoStory component lives inside one caption-box
//          → slides in like any other caption, then scrolls with page  */
//       captionSide : "center",
//       boxClass    : "w-full max-w-none",      // full-width caption
//       html : (
//         <PhotoStory
//           photos={[
//             {
//               src : "/heartofaseal-28.jpg",
//               alt : "Arctic panorama",
//               caption : "The vast Arctic landscape that drew me to document this story",
//               location: "Greenland",
//               year    : "2017-2024"
//             },
//             {
//               src : "/heartofaseal-15.jpg",
//               alt : "Ice formations",
//               caption : "Ancient ice formations, now melting rapidly",
//               location: "Uummannaq Fjord",
//               year    : "2022"
//             },
//             {
//               src : "/heartofaseal-07.jpg",
//               alt : "Melting moment",
//               caption : "Watching thousand-year-old ice disappear",
//               location: "Greenlandic fjord",
//               year    : "2023"
//             }
//           ]}
//           /* this variant already shows:  
//                ① big quote + author  
//                ② images drift in gentle parallax while scrolling */
//           variant="scroll-story"
//           showNavigation={true}
//           mainCaption={`The snow that falls on tropical Andean peaks comes from water that has evaporated from the leaves of trees in the Amazon. The winds carry it west until the clouds make it to the Andes and the water falls as snow, and that snow melts and flows back to the Amazon.`}
//           author="TOM MATTHEWS"
//           authorSubtitle="Climate scientist and National Geographic Explorer"
//           className="w-full"   /* let it use the caption’s width */
//         />
//       )
//     }
//   ]
// },

// /* ------------------------------------------------------------------
//    scenesConfig.tsx – replace the previous “witness-journey” entry
// ------------------------------------------------------------------- */
// {
//   key       : "witness-journey",

//   /* no fixed chart layer – we scroll everything as captions */
//   chart     : () => null,
//   chartSide : "center",
//   axesSel   : NO_MATCH,
//   plainCaptions : true,

//   captions : [
//     /* ── 1 / 2  — QUOTE + AUTHOR (comes first) ─────────────── */
//     {
//       captionSide : "center",
//       html : (
//         <>
//           <p className="text-3xl md:text-4xl leading-relaxed font-light max-w-4xl mx-auto">
//             “The snow that falls on tropical Andean peaks comes from water that has
//             evaporated from the leaves of trees in the Amazon. The winds carry it west
//             until the clouds make it to the Andes and the water falls as snow, and that
//             snow melts and flows back to the Amazon.”
//           </p>

//           <div className="mt-10 text-center">
//             <p className="font-semibold text-lg tracking-wider">
//               TOM MATTHEWS
//             </p>
//             <p className="text-slate-600">
//               Climate scientist and National Geographic Explorer
//             </p>
//           </div>
//         </>
//       )
//     },

//     /* ── 2 / 2  — PICTURE STRIP WITH PARALLAX ──────────────── */
//     {
//       captionSide : "center",
//       /* no padding / shadow so the photos can span freely */
//       boxClass    : "w-full max-w-none p-0 bg-transparent shadow-none",

//       html : (
//         <PhotoStory
//           photos={[
//             {
//               src : "/heartofaseal-28.jpg",
//               alt : "Arctic panorama",
//               caption : "The vast Arctic landscape that drew me to document this story",
//               location: "Greenland",
//               year    : "2017-2024"
//             },
//             {
//               src : "/heartofaseal-15.jpg",
//               alt : "Ice formations",
//               caption : "Ancient ice formations, now melting rapidly",
//               location: "Uummannaq Fjord",
//               year    : "2022"
//             },
//             {
//               src : "/heartofaseal-07.jpg",
//               alt : "Melting moment",
//               caption : "Watching thousand-year-old ice disappear",
//               location: "Greenlandic fjord",
//               year    : "2023"
//             }
//           ]}

//           /* show only the images here – the quote is already above */
//           variant="scroll-story"
//           mainCaption=""            /* hide internal quote */
//           author=""                 /* -> no duplicate author line   */
//           authorSubtitle=""

//           showNavigation={true}
//           className="w-full"
//         />
//       )
//     }
//   ]
// },


  

  /* 1 — NEW: Why the Arctic matters --------------------------- */
  {
    key      : "why-arctic",
    chart: (_d, api) => <WhyArcticExplainer apiRef={api} />,
            plainCaptions: true,

    chartSide: "fullscreen",
    parallax: false,
    axesSel  : NO_MATCH,

    captions: [
      {
        captionSide: "left",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">Why the Arctic?</h3>
            <p className="text-lg max-w-sm">
              The Arctic isn't just cold and remote—it's the planet's air conditioner. 
              When it breaks down, we all feel the heat.
            </p>
          </>
        ),
      },
      {
        captionSide: "left", 
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">The Albedo Effect</h3>
            <p className="text-lg max-w-sm">
              White ice reflects sunlight back to space. Dark water absorbs it. 
              As ice melts, the planet traps more heat—accelerating the melt.
            </p>
          </>
        ),
      },
      {
        captionSide: "left",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">Arctic Amplification</h3>
            <p className="text-lg max-w-sm">
              This feedback loop means the Arctic warms <strong>twice as fast</strong> as 
              the global average. It's not just changing—it's racing ahead.
            </p>
          </>
        ),
      },
    ],

        actions: [
      { captionIdx: 1, call: api => api?.showStage?.(2) },
      { captionIdx: 2, call: api => api?.showStage?.(3) },
    ],
  },

  /* 2 — Seasonal lines (improved storytelling) --------------- */
  {
    key       : "seasonal",
    chart     : (d:DataBundle)=> <SeasonalChart data={d.dailySeaIce}/>,
    axesSel   : AXES,
            plainCaptions: true,

    helperSel : ".chart-ref",
    axesInIdx   : 1,
    helperInIdx : 2,

    captions : [
      {
        captionSide: "right",
        html:(<>
          <h3 className="text-2xl font-display mb-2">A Spaghetti Bowl of Bad News</h3>
          <p className="text-lg">
            Each line traces a year of Arctic sea ice from minimum to maximum and back again. 
            Blue lines show earlier years, the more red the more recent years. 
            <br/><br/>
            The pattern is unmistakable: recent years cluster far below historical averages.
          </p>
        </>)
      },
      {
        captionSide: "right",
        html:(<>
          <h3 className="text-2xl font-display mb-2">The New Reality</h3>
          <p className="text-lg">
            These red lines aren't outliers—they're the new normal. 
            The thick gray band shows the historical average, but recent years 
            consistently finish below it.
            <br/><br/>
            We're not just losing ice. We're redefining what "normal" means.
          </p>
        </>)
      },
      {
        captionSide: "right",
        html:(<>
          <h3 className="text-2xl font-display mb-2">Breaking Through the Floor</h3>
          <p className="text-lg">
            The dashed lines mark historical record highs and lows. 
            Notice how recent years frequently punch through the old record lows, 
            setting new extremes.
            <br/><br/>
            This isn't natural variation—it's a system in free fall.
          </p>
        </>)
      }
    ]
  },

    /* 5 — Multi-decade view (enhanced drama) ------------------- */
  {
    key       : "multi-decade",
    plainCaptions: true,
    chart : (d:DataBundle, api) =>
            <DailyChart data={d.dailySeaIce} apiRef={api} />,
    axesSel   : AXES,
    axesInIdx : 0,

    captions : [
      {
        captionSide:"right",
        html:(<>
          <h3 className="text-2xl font-display mb-2">Six Decades, One Direction</h3>
          <p className="text-lg">
            Each colored band represents a decade of Arctic ice measurements. 
            Watch as we reveal them one by one—and notice the unmistakable 
            staircase downward.
          </p>
        </>)
      },
      {
        captionSide:"right",
        html:(<>
          <h3 className="text-2xl font-display mb-2">The 1980s: The Old Normal</h3>
          <p className="text-lg">
            This light blue band shows what Arctic ice looked like when many of us were born. 
            Values around zero million km² were typical for late summer.
          </p>
        </>)
      },
      {
        captionSide:"right",
        html:(<>
          <h3 className="text-2xl font-display mb-2">The 1990s: First Cracks</h3>
          <p className="text-lg">
            Each new decade settles slightly lower than the last. 
            The changes seem gradual, but they're building momentum.
          </p>
        </>)
      },
            {
        captionSide:"right",
        html:(<>
          <h3 className="text-2xl font-display mb-2">The 2000s: Going Down</h3>
          <p className="text-lg">
            The downward spiral holding on. (replace)
          </p>
        </>)
      },
      {
        captionSide:"right",
        html:(<>
          <h3 className="text-2xl font-display mb-2">The 2010s: Acceleration</h3>
          <p className="text-lg">
            The decline steepens. Values around -0.6 million km² become common—
            territory that was unthinkable just decades earlier.
          </p>
        </>)
      },
      {
        captionSide:"right",
        html:(<>
          <h3 className="text-2xl font-display mb-2">The 2020s: Free Fall</h3>
          <p className="text-lg">
            The current decade sits at the bottom of the stack. 
            Values around -0.9 million km² show how quickly the "new normal" 
            keeps shifting downward.
            <br/><br/>
            We're not just losing ice—we're accelerating into unknown territory.
          </p>
        </>)
      },
    ],

    actions : [
      { captionIdx:0, call: api=>api?.showLevel?.(1) },
      { captionIdx:1, call: api=>api?.showLevel?.(2) },
      { captionIdx:2, call: api=>api?.showLevel?.(3) },
      { captionIdx:3, call: api=>api?.showLevel?.(4) },
      { captionIdx:4, call: api=>api?.showLevel?.(5) },
      { captionIdx:5, call: api=>api?.showLevel?.(6) }
    ]
  },

  /* 3 — Annual anomalies (better context) -------------------- */
  {
    key       : "annual",
        plainCaptions: true,

    chart     : (d:DataBundle)=> <AnnualChart data={d.annualAnomaly}/>,
    axesSel   : AXES,
    axesInIdx : 0,

    captions : [
      {
        captionSide:"right",
        html:(<>
          <h3 className="text-2xl font-display mb-2">The Tipping Point</h3>
          <p className="text-lg">
            Each bar shows how much above (blue) or below (red) the long-term average 
            that year finished. Think of zero as the "normal" line.
            <br/><br/>
            The 1980s and 90s danced around normal. The 2000s leaned negative. 
            The 2010s and 2020s? <strong>Almost entirely red.</strong>
            <br/><br/>
            We've crossed a threshold, and there's no going back.
          </p>
        </>)
      }
    ]
  },

  /* 4 — IQR envelope (simplified explanation) ---------------- */
  {
    key       : "iqr",
    chart     : (d:DataBundle)=> <IQRChart data={d.dailySeaIce} stats={d.iqrStats}/>,
    axesSel   : AXES,
    axesInIdx : 0,
    plainCaptions: true,

    captions : [
      {
        captionSide:"left",
        html:(<>
          <h3 className="text-2xl font-display mb-2">What Does "Normal" Even Mean?</h3>
          <p className="text-lg">
            The blue envelope shows what scientists call the "comfort zone"—
            the middle 50% of all historical measurements. 
            <br/><br/>
            If ice levels stay within this band, it's business as usual. 
            Drop below it, and we're in uncharted territory.
          </p>
        </>)
      },
      {
        captionSide:"left",
        at:0.15, out:0.85,
        html:(<>
          <h3 className="text-2xl font-display mb-2">2024: Living Below the Line</h3>
          <p className="text-lg">
            In 2024, ice levels spent most of the year below the comfort zone. 
            These aren't brief dips—they're sustained periods in unknown territory.
            <br/><br/>
            What was once considered "extreme" is becoming routine.
          </p>
        </>)
      }
    ]
  },

  /* 6 — Multi-line connections (clearer narrative) ----------- */
  {
    key      : "connections",
    chart    : (d:DataBundle)=> <MultiChart data={d.annual}/>,
    axesSel  : AXES,
    axesInIdx : 0,
    plainCaptions: true,
    captions : [
      {
        captionSide:"right",
        at:0.15, out:0.85,
        html:(<>
          <h3 className="text-2xl font-display mb-2">The Smoking Gun</h3>
          <p className="text-lg">
            Three lines, one story: atmospheric CO₂ (green), global temperature (blue), 
            and Arctic temperature (red) have marched in lockstep for decades.
            <br/><br/>
            This isn't correlation—it's causation. More CO₂ traps more heat, 
            and the Arctic feels it first and fastest.
            <br/><br/>
            The connection is undeniable.
          </p>
        </>)
      }
    ]
  },

  /* 7 — Z-score normalization (better explanation) ----------- */
  {
    key       : "zscore",
    chart     : (d:DataBundle,api)=> <ZScoreChart data={d.annual} apiRef={api}/>,
    axesSel   : AXES,
    axesInIdx : 0,

    captions : [
      {
        captionSide:"left",
        at:0.15, out:0.55,
        html:(<>
          <h3 className="text-2xl font-display mb-2">Apples to Apples</h3>
          <p className="text-lg">
            How do you compare CO₂ levels (measured in parts per million) 
            with temperature (degrees) and ice extent (square kilometers)?
            <br/><br/>
            By converting everything to the same scale: how many standard deviations 
            each measurement is from its historical average. Now we can see 
            the patterns clearly.
          </p>
        </>)
      },
      {
        captionSide:"left",
        at:0.55, out:0.85,
        html:(<>
          <h3 className="text-2xl font-display mb-2">The Mirror Image</h3>
          <p className="text-lg">
            When we flip the ice loss data upside down, something remarkable appears: 
            the rise in CO₂ and temperature perfectly mirrors the loss of ice.
            <br/><br/>
            Three different measurements, one unified story. 
            This is what climate change looks like in data.
          </p>
        </>)
      }
    ],

    actions : [
      { captionIdx:0, call: api=>api?.toggleInvert?.(false) },
      { captionIdx:1, call: api=>api?.toggleInvert?.(true)  }
    ]
  },

  /* 8 — 2024 emphasis (current relevance) -------------------- */
  {
    key      : "2024-focus",
    chart    : (d:DataBundle)=> <Bar24Chart data={d.annual}/>,
    axesSel  : AXES,
    plainCaptions: true,
    captions : [
      {
        captionSide:"right",
        at:0.15, out:1,
        html:(<>
          <h3 className="text-2xl font-display mb-2">2024: The Exclamation Point</h3>
          <p className="text-lg">
            While global temperatures broke records in 2024, Arctic temperatures 
            soared even higher—rising at roughly twice the global rate.
            <br/><br/>
            That towering red bar isn't just data—it's a warning. 
            Climate impacts don't spread evenly across our planet. 
            They hit the Arctic first, and they hit it hardest.
            <br/><br/>
            What happens in the Arctic doesn't stay in the Arctic.
          </p>
        </>)
      }
    ]
  },

  /* 9 — Scatter relationship (crystal clear causation) ------- */
  {
    key      : "relationship",
    chart    : (d:DataBundle)=> <ScatterChart data={d.annual}/>,
    axesSel  : AXES,

    captions : [
      {
        at:0.05, out:0.99,
        html:(<>
          <h3 className="text-2xl font-display mb-2">More Heat, Less Ice</h3>
          <p className="text-lg">
            Every dot represents one year. The relationship couldn't be clearer: 
            warmer Arctic temperatures (rightward) mean less sea ice (downward).
            <br/><br/>
            This isn't a political opinion or a theoretical model. 
            It's physics, playing out in real time across our planet's most 
            vulnerable region.
            <br/><br/>
            The question isn't whether this relationship exists—it's what we do about it.
          </p>
        </>)
      }
    ]
  },

// Beispiele für alle PhotoStory Varianten in der sceneConfig

/* ─────────── ALLE VARIANTEN DER NEUEN PHOTOSTORY ─────────── */
/* 1) Single Left  (Bild links / Text rechts) ──────────────── */
{
  key: "ps-single-left",
  chartSide: "fullscreen",
  chart: (_d, api) => (
    <PhotoStory
      ref={api}
      photos={[
        {
          src: "/images/narwhal.jpg",
          alt: "Arctic wildlife",
        },
      ]}
      variant="single"
      imageSide="left"
      mainCaption="In the Arctic silence, narwhals surface through narrow leads in the ice, their tusks catching the midnight sun."
      author="JONAS BÖHM"
      authorSubtitle="Arctic Photographer"
    />
  ),
  axesSel: NO_MATCH,
  captions: [{ html: <></> }],
},

/* 2) Single Right (Text links / Bild rechts) ──────────────── */
{
  key: "ps-single-right",
  chartSide: "fullscreen",
  chart: (_d, api) => (
    <PhotoStory
      ref={api}
      photos={[
        {
          src: "/images/motorsledge.jpg",
          alt: "Arctic expedition",
        },
      ]}
      variant="single"
      imageSide="right"
      mainCaption="Crossing vast expanses of sea ice, we witness a landscape in rapid transformation."
      author="EXPEDITION TEAM"
      authorSubtitle="2024 Arctic Survey"
    />
  ),
  axesSel: NO_MATCH,
  captions: [{ html: <></> }],
},


{
    key: "chapter-end",
    chart: () => <div className="w-full h-full bg-gradient-to-b from-slate-100 to-blue-50" />,
    axesSel: NO_MATCH,
    chartSide: "fullscreen",

    captions: [
      {
        boxClass: "ice-card pointer-events-auto",
        html: (
          <>
            <h2 className="text-3xl font-bold mb-4">The Big Picture</h2>
            <p className="text-lg max-w-prose mx-auto">
              The Arctic is our planet's early warning system, and it's screaming. 
              Decades of data show an undeniable pattern: rising emissions, rising temperatures, 
              vanishing ice.
              <br/><br/>
              But numbers can feel abstract. In Chapter 2, we'll fly to a remote Greenlandic fjord 
              where satellites capture this transformation in stunning detail—and where the people 
              living through it can no longer deny what's happening.
              <br/><br/>
              Ready to see climate change up close?
            </p>
            <NextChapterButton />
          </>
        ),
      }
    ],
  },
  

];

export default scenes2;