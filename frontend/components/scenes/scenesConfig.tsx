/* ------------------------------------------------------------------
   scenesConfig.tsx – Chapter 1 — "The Arctic: Our Planet's Canary"
   Restructured for compelling data journalism
------------------------------------------------------------------- */
import dynamic      from "next/dynamic";
import { SceneCfg } from "./ChartScene";
import { NO_MATCH } from "./ChartScene";
import PhotoStory from "../PhotoStory";

const MapFlyScene   = dynamic(() => import("../MapFlyScene"), { ssr: false });


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

const SatelliteScene = dynamic(()=>import("@/components/SatelliteScene"),{ssr:false});

/* ─── Chart components ─── */
const MeanSpringAnomalyChart = dynamic(() => import("@/components/Rechart/MeanSpringAnomalyChart"), { ssr: false });
const EarlyLateSeasonChart = dynamic(() => import("@/components/Rechart/EarlyLateSeasonChart"), { ssr: false });
const MeanIceFractionChart = dynamic(() => import("@/components/Rechart/MeanIceFractionChart"), { ssr: false });
const FreezeBreakTimelineChart = dynamic(() => import("@/components/Rechart/FreezeBreakTimelineChart"), { ssr: false });
const AllYearsSeasonChart = dynamic(() => import("@/components/Rechart/AllYearsSeasonChart"), { ssr: false });




/* helper ------------------------------------------------------- */
const AXES = ".chart-grid, .chart-axis";

interface DataBundle{
  dailySeaIce   : any[];
  annualAnomaly : any[];
  iqrStats      : any;
  annual        : any[];
}

export const scenes: SceneCfg[] = [

   {
      key: "geographic-journey",
      chartSide: "fullscreen",
      parallax: false,
      slideIn: false,
      fadeOut: true,
      snow: false,
      chart: (_d, api) => (
          <MapFlyScene
            ref={api}
            waypoints={[
              { lng: 0, lat: 90, zoom: 1.3, pitch: 0 },          // Global Arctic
              { lng: -42, lat: 72, zoom: 3.3, pitch: 0 },        // Greenland
              { lng: -52.14, lat: 71, zoom: 7.0, pitch: 30 },    // Uummannaq Bay
              { lng: -52.27, lat: 70.67, zoom: 10, pitch: 60, bearing: 30 },
              //  { lng: -52.27, lat: 70.69, zoom: 10, pitch: 0, bearing: 0 },
            ]}
          />

      ),
      axesSel: NO_MATCH,
  
      captions: [
        {
          captionSide: "center",
          boxClass: "ice-card",
          html: (
            <>
              <h2 className="text-4xl font-bold mb-5">
                Chapter&nbsp;1<br />How the Ice is Vanishing
              </h2>
              <p className="text-lg max-w-prose mx-auto">
                In the Arctic, entire communities depend on sea ice for survival. 
                But what happens when that ice starts disappearing faster than ever before?
              </p>
            </>
          ),
        },
        {
          captionSide: "left",
          html: (
            <>
              <h3 className="text-2xl font-display mb-2">Greenland</h3>
              <p className="text-lg max-w-sm">
                The world's largest island. 80% ice sheet, 20% rugged coastline. 
                Along this coast, deep fjords carve hundreds of kilometers inland, 
                creating sheltered harbors where Arctic communities have thrived for millennia.
              </p>
            </>
          ),
        },
        {
          captionSide: "right",
          html: (
            <>
              <h3 className="text-2xl font-display mb-2">Uummannaq Bay</h3>
              <p className="text-lg max-w-sm">
                600 kilometers north of the Arctic Circle, this bay opens into one of 
                Greenland's most dramatic fjord systems. For most of the year, 
                sea ice turns these waters into frozen highways.
              </p>
            </>
          ),
        },
        {
          captionSide: "left",
          html: (
            <>
              <h3 className="text-2xl font-display mb-2">Uummannaq Island</h3>
              <p className="text-lg max-w-lg">
                Home to 1,300 people living beneath a distinctive heart-shaped mountain. 
                This community represents hundreds of Arctic settlements whose existence 
                depends entirely on predictable sea ice patterns.
                <br/><br/>
                <span className="text-blue-400 font-semibold">But those patterns are changing...</span>
              </p>
            </>
          ),
        },
      ],
  
      actions: [
        { captionIdx: 0, call: api => api?.go?.(0) }, // Global Arctic
        { captionIdx: 1, call: api => api?.go?.(1) }, // Greenland
        { captionIdx: 2, call: api => api?.go?.(2) }, // Uummannaq Bay
        { captionIdx: 3, call: api => api?.go?.(3) }, // Uummannaq Bay
      ],
    },

    // Fullscreen With Caption

    {
  key: "changeclimate",
  chartSide: "fullscreen",
  fadeIn: true,
  parallax: false,
  chart: (_d, api) => (
    <PhotoStory
      ref={api}
      photos={[{ src: "/images/heartofaseal_town.jpg", alt: "Uummannaq View" }]}
      variant="fullscreen"
      // mainCaption="When I was a child, the ice was gone in June and July…"
      // author="Uummannaq Resident"
      fullscreenImageFit="cover"    
      fullscreenQuoteOpts={{
        bgParallax: 0.02,          // background fixed
        bgZoom: 0.05,
        quoteParallax: 0.3,    // gentle drift on the quote
        quoteOffsetVH: 27,      // vertically centred-ish
        fadeInAt: .03,
        fadeOutAt: .90,
      }}
    />
  ),
  axesSel: NO_MATCH,
  captions: [{ 
    captionSide: "left",
    html: (
            <>
              <h3 className="text-2xl font-display mb-2">Heart of a Seal</h3>
              <p className="text-lg max-w-sm">
                The Arctic island of Uummannaq is named after its iconic mountain that is shaped like the Heart of a Seal. Beneath it lies the town with the same name: Uummannaq.
              </p>
            </>
          ), },     
     ],
},
    {
  key: "motorsledge",
  chartSide: "fullscreen",
  fadeIn: true,
  parallax: false,
  chart: (_d, api) => (
    <PhotoStory
      ref={api}
      photos={[{ src: "/images/motorsledge.jpg", alt: "Uummannaq View" }]}
      variant="fullscreen"
      // mainCaption="When I was a child, the ice was gone in June and July…"
      // author="Uummannaq Resident"
      fullscreenImageFit="contain"    
      fullscreenQuoteOpts={{
        bgParallax: 0.02,          // background fixed
        bgZoom: 0.05,
        quoteParallax: 0.3,    // gentle drift on the quote
        quoteOffsetVH: 27,      // vertically centred-ish
        fadeInAt: .03,
        fadeOutAt: .90,
      }}
    />
  ),
  axesSel: NO_MATCH,
  captions: [{ 
    captionSide: "right",
    html: (
            <>
              <h3 className="text-2xl font-display mb-2">Heart of a Seal</h3>
              <p className="text-lg max-w-sm">
                In the winter months, the sea ice around Uummannaq starts to freeze and connects it to the mainland. Inhabitants can travel freely around and are not restricted to the island anymore. 
              </p>
            </>
          ), }],
},
    {
  key: "fishing",
  chartSide: "fullscreen",
  fadeIn: true,
  parallax: false,
  chart: (_d, api) => (
    <PhotoStory
      ref={api}
      photos={[{ src: "/images/heartofaseal_fishing.jpg", alt: "Uummannaq View" }]}
      variant="fullscreen"
      // mainCaption="When I was a child, the ice was gone in June and July…"
      // author="Uummannaq Resident"
      fullscreenImageFit="contain"    
      fullscreenQuoteOpts={{
        bgParallax: 0.02,          // background fixed
        bgZoom: 0.05,
        quoteParallax: 0.3,    // gentle drift on the quote
        quoteOffsetVH: 27,      // vertically centred-ish
        fadeInAt: .03,
        fadeOutAt: .90,
      }}
    />
  ),
  axesSel: NO_MATCH,
  captions: [{ 
    captionSide: "left",
    html: (
            <>
              <h3 className="text-2xl font-display mb-2">Heart of a Seal</h3>
              <p className="text-lg max-w-sm">
                Fishing is a crucial part of this town, most people live from this industry. Traditionally fisherman go ice-fishing on the sea ice. But all of this is in danger...
              </p>
            </>
          ), }],
},
 {
  key: "ummannaqview",
  chartSide: "fullscreen",
  fadeIn: true,
  fadeOut: true,
  parallax: false,
  wide: true,
  chart: (_d, api) => (
    <PhotoStory
      ref={api}
      photos={[{ src: "/images/heartofaseal_voices.jpg", alt: "Uummannaq View" }]}
      variant="fullscreen"
      // mainCaption="When I was a child, the ice was gone in June and July…"
      // author="Uummannaq Resident"
      fullscreenImageFit="contain"
      textColor="white"
      backgroundColor="#192018"    
      fullscreenQuoteOpts={{
        bgParallax: 0.02,          // background fixed
        bgZoom: 0.05,
        quoteParallax: 0.3,    // gentle drift on the quote
        quoteOffsetVH: 27,      // vertically centred-ish
        fadeInAt: .03,
        fadeOutAt: .90,
      }}
    />
  ),
  axesSel: NO_MATCH,
  captions: [     {
      html: (
        <>
         <h2 className="text-3xl font-bold mb-3">Voices from the Community</h2>
<p className="text-lg text-center max-w-2xl mx-auto">
  In interviews gathered for the <em>Life on Thin Ice</em> study, Uummannaq residents explain how fast-shrinking winter ice is altering travel, hunting and tradition. Lets listen to their problems.
  <br/>
  “Learn more Button”
</p>
        </>
      ),
    },
],
},
    {
  key: "icegone",
  chartSide: "fullscreen",
  fadeIn: true,
  fadeOut: true,
  parallax: false,
  chart: (_d, api) => (
    <PhotoStory
      ref={api}
      photos={[{ src: "/heartofaseal_website11.jpg", alt: "Pushing a sled" }]}
      variant="fullscreen"
      mainCaption="When I was a child, the ice was gone in June and July, now it is gone in April and May."
      author="Interview participant, Uummannaq"
      authorSubtitle="Baztan et al. 2017"
      fullscreenImageFit="cover"    
      fullscreenQuoteOpts={{
        bgParallax: 0.00,          // background fixed
        bgZoom: 0.02,
        quoteParallax: 0.3,    // gentle drift on the quote
        quoteOffsetVH: 27,      // vertically centred-ish
        fadeInAt: .03,
        fadeOutAt: .90,
      }}
    />
  ),
  axesSel: NO_MATCH,
  captions: [{ html: <></> }],
},

{
  key: "storms",
  chartSide: "fullscreen",
  fadeIn: true,
  fadeOut: true,
  parallax: false,
  chart: (_d, api) => (
    <PhotoStory
      ref={api}
      photos={[{ src: "/images/heartofaseal_wind.jpg", alt: "Heavy Snowstorm" }]}
      variant="fullscreen-split"
      mainCaption="The most important change, is that the climate has become more instable now and the wind is more unpredictable and stronger."
      author="Interview participant, Uummannaq"
      authorSubtitle="Baztan et al. 2017"
      fullscreenImageFit="contain" 
      imageSide="right" 
      backgroundColor="#90a9bf"
      textColor="white"
      fullscreenQuoteOpts={{
        bgParallax: 0.00,          // background fixed
        bgZoom: 0.02,
        quoteParallax: 0.3,    // gentle drift on the quote
        quoteOffsetVH: 10,      // vertically centred-ish
        fadeInAt: .01,
        fadeOutAt: .90,
        bgXAlign: -22,
        
      }}
    />
  ),
  axesSel: NO_MATCH,
  captions: [{ html: <></> }],
},

    {
  key: "Motorsledgeee",
  chartSide: "fullscreen",
  fadeIn: true,
  parallax: false,
  chart: (_d, api) => (
    <PhotoStory
      ref={api}
      photos={[{ src: "/images/motorsledge.jpg", alt: "Motorsledge" }]}
      variant="fullscreen"
      mainCaption="A lot of hunters prefer the motorsledge over dogsledding, because the winters are too short, the snowmobiles are faster to transport the catch."
      author="Interview participant, Uummannaq"
      authorSubtitle="Baztan et al. 2017"
      fullscreenImageFit="cover"    
      fullscreenQuoteOpts={{
        bgParallax: 0.00,          // background fixed
        bgZoom: 0.02,
        quoteParallax: 0.3,    // gentle drift on the quote
        quoteOffsetVH: 27,      // vertically centred-ish
        fadeInAt: .03,
        fadeOutAt: .90,
      }}
    />
  ),
  axesSel: NO_MATCH,
  captions: [{ html: <></> }],
},
{
  key: "introcharts",
  chartSide: "fullscreen",
  wide: true,
  fadeIn: true,
  fadeOut: true,
  snow: false,
  parallax: false,

  chart: (_d, api) => (
    <SatelliteScene
      ref={api}
      waypoints={[
        { lng:-52.27, lat:70.67, zoom:10, pitch:60, bearing:0 },
        { lng:-52.22, lat:70.70, zoom:9.5, pitch:0,  bearing:4.7 },
        { lng:-52.22, lat:70.70, zoom:9.5, pitch:0, bearing:4.7},
        { lng: -52.22, lat: 70.70, zoom: 10.5, pitch: 70, bearing: 4.7},
        { lng:-52.22, lat:70.70, zoom:9.5, pitch:0, bearing:4.7},
      ]}
      rawImg ="/images/satellite.png"
      maskImg="/images/overlay.png"
      coords={[
        [-52.333915, 70.798511], // ↖
        [-51.905163, 70.787129], // ↗
        [-51.948045, 70.617879], // ↘
        [-52.373222, 70.629154], // ↙
      ]}
    />
  ),

  axesSel: NO_MATCH,

  captions: [
    {
      html: <>
        <h2 className="text-3xl font-bold mb-3">How to measure ice?</h2>
        <p className="text-lg text-center max-w-2xl mx-auto">
          But how can we measure this feeling of the Uummannaq residents? The answer lies in space: Satellite photos can provide us with reliable information.
        </p>
      </>
    },
    {
      captionSide:"left",
      html:<p className="text-lg max-w-sm">
        First, here’s the top-down view our satellite sees.
      </p>
    },
    {
      captionSide:"left",
      html:<p className="text-lg max-w-sm">
        Now the raw winter image we analyse. One of those for every day.
      </p>
    },
    {
      captionSide:"left",
      html:<p className="text-lg max-w-sm">
        One picture a day since 2017. Thats a LOT of pictures. So how do we automatize that and make the images into? 
      </p>
    },
    {
      captionSide:"left",
      html:<p className="text-lg max-w-sm">
        The answer AI: A self built Computer Vision pipeline that detects Clouds, Land and calculates how much Ice is in a picture.
      </p>
    },
     {
      captionSide:"left",
      html:<p className="text-lg max-w-sm">
        This is how the results look like. After computer-vision processing, ice (yellow and turquoise) pops out. Now if we do this for every day we have data for we can look at almost a decade of data. Shall we?
      </p>
    },
  ],

  /* Camera + layer reveal (both directions) */
   actions : [
  /* 0 — title card, oblique view, no overlay                */
  { captionIdx: 0, call: api => { api?.go?.(0); api?.showStage?.(0); } },

  /* 1 — camera pitches to a true top-down view               */
  { captionIdx: 1, call: api => { api?.go?.(1); api?.showStage?.(0); } },

  /* 2 — fade-in the raw Sentinel-2 tile                      */
  { captionIdx: 2, call: api =>  { api?.go?.(2); api?.showStage?.(1)} },

  /* 3 — add the computer-vision mask on top                  */
  { captionIdx: 3, call: api => {api?.go?.(3); api?.showStage?.(1)} },
   /* 3 — add the computer-vision mask on top                  */
  { captionIdx: 4, call: api => {api?.go?.(4); api?.showStage?.(1)} },

  /* 3 — add the computer-vision mask on top                  */
  { captionIdx: 5, call: api => api?.showStage?.(2) },
],
},
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
              Here our results:
              Each small chart shows one season of sea ice from February to June. 
            </p>
          </>
        ),
      },
      {
        captionSide: "right",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">The Numbers Don&apos;t Lie</h3>
            <p className="text-lg">
              When we look at all the years, we can already see a trend here: 
              <br/><br/>
              <span className="text-red-400 font-bold">Shorter Sea Ice Winters</span>
              <br/><br/>
              The statement: &quot;When I was a child, the ice was gone in June and July, 
              now it is gone in April and May&quot; is precisely correct.
            </p>
          </>
        ),
      },
    ],

    actions: [
      { captionIdx: 1, call: api => api?.nextStage?.() },
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
             Lets compress our collected data into two comparable timeframes: Before 2021 and after. We look here at the average (mean) of 2017 to 2020 and 2021 to 2025.
            </p>
          </>
        ),
      },
      {
        captionSide: "right",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">When "Normal" Shifts</h3>
            <p className="text-lg">
              The blue line shows the 2017-2020 mean: what was considered normal just four years ago. 
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
              The red line shows 2021-2025 mean: the new reality. 
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
            /*   0 – intro: show both epochs clearly            */
      { captionIdx: 0, call: api => api?.highlight?.("both") },

      /*   1 – talking about the BLUE (early) line        */
      { captionIdx: 1, call: api => api?.highlight?.("early") },

      /*   2 – talking about the RED (late) line          */
      { captionIdx: 2, call: api => {
          api?.highlight?.("late");
          api?.nextStep?.();           // keep the old behaviour
        } },
    ],
  },
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
              Current rate of change: <span className="text-red-500 font-bold">3% loss per year.</span>
            </p>
          </>
        ),
      },
    ],
  },
  {
  key: "ice free",
  chartSide: "fullscreen",
  fadeIn: true,
  fadeOut: true,
  parallax: false,
  chart: (_d, api) => (
    <PhotoStory
      ref={api}
      photos={[{ src: "/images/heartofaseal_iceberg.jpg", alt: "Heavy Snowstorm" }]}
      variant="fullscreen-split"
      fullscreenImageFit="contain" 
      imageSide="left" 
      backgroundColor="#4b677a"
      mainCaption="If this trend continues, the people in Uuummannaq will experience completely ice-free conditions 
              within 15 years."
      quote={false}
      textColor="white"
      fullscreenQuoteOpts={{
        bgParallax: 0.00,          // background fixed
        bgZoom: 0.02,
        quoteParallax: 0.3,    // gentle drift on the quote
        quoteOffsetVH: 10,      // vertically centred-ish
        fadeInAt: .01,
        fadeOutAt: .90,
        bgXAlign: -22,
        
      }}
    />
  ),
  axesSel: NO_MATCH,
  captions: [{
        captionSide: "right",
        html: (
          <>
          </>
        ),
      },],
},
{
  key: "Kids",
  chartSide: "fullscreen",
  fadeIn: true,
  fadeOut: true,
  parallax: false,
  chart: (_d, api) => (
    <PhotoStory
      ref={api}
      photos={[{ src: "/images/kids_drumdance.jpg", alt: "Kids" }]}
      variant="fullscreen-split"
      fullscreenImageFit="contain" 
      imageSide="right" 
      backgroundColor="#90a9bf"
      mainCaption="The Arctic their grandparents knew will exist only in memory."
      quote={false}
      textColor="white"
      fullscreenQuoteOpts={{
        bgParallax: 0.00,          // background fixed
        bgZoom: 0.02,
        quoteParallax: 0.3,    // gentle drift on the quote
        quoteOffsetVH: 10,      // vertically centred-ish
        fadeInAt: .01,
        fadeOutAt: .90,
        bgXAlign: -22,
        
      }}
    />
  ),
  axesSel: NO_MATCH,
  captions: [{
        captionSide: "left",
        html: (
          <>
          </>
        ),
      },],
},
{
  key: "No More Dogs",
  chartSide: "fullscreen",
  fadeIn: true,
  fadeOut: true,
  parallax: false,
  chart: (_d, api) => (
    <PhotoStory
      ref={api}
      photos={[{ src: "/images/dogs.jpg", alt: "Dogs in a Snowstorm" }]}
      variant="fullscreen-split"
      fullscreenImageFit="contain" 
      imageSide="left" 
      backgroundColor="#fcfcfa"
      mainCaption="Century old traditions like Dogsledding will only be stories of the past. Greenland Dogs will have no use anymore."
      quote={false}
      fullscreenQuoteOpts={{
        bgParallax: 0.00,          // background fixed
        bgZoom: 0.02,
        quoteParallax: 0.3,    // gentle drift on the quote
        quoteOffsetVH: 10,      // vertically centred-ish
        fadeInAt: .01,
        fadeOutAt: .90,
        bgXAlign: -22,
        
      }}
    />
  ),
  axesSel: NO_MATCH,
  captions: [{
        captionSide: "left",
        html: (
          <>
          </>
        ),
      },],
},
 {
  key: "Arctic Sea Ice",
  chartSide: "fullscreen",
  fadeIn: true,
  fadeOut: true,
  parallax: false,
  wide: true,
  snow: false,
  chart: (_d, api) => (
    <PhotoStory
      ref={api}
      photos={[{ src: "/images/seaice_greenland.jpg", alt: "Greenland Sea Ice" }]}
      variant="fullscreen"
      // mainCaption="When I was a child, the ice was gone in June and July…"
      // author="Uummannaq Resident"
      fullscreenImageFit="cover"
      textColor="white"
      backgroundColor="#192018"    
      fullscreenQuoteOpts={{
        bgParallax: 0.50,          // background fixed
        bgZoom: 0.30,
        quoteParallax: 0.3,    // gentle drift on the quote
        quoteOffsetVH: 27,      // vertically centred-ish
        fadeInAt: .03,
        fadeOutAt: .90,
      }}
    />
  ),
  axesSel: NO_MATCH,
  captions: [     {
      html: (
        <>
         <h2 className="text-3xl font-bold mb-3">From Uummannaq to Arctic</h2>
<p className="text-lg text-center max-w-2xl mx-auto">
  The Data showed us Sea Ice loss in Uummannaq is imminent. But what about the arctic in general? Lets look at some more comprehend data that
  explains the whole arctic situation.
  <br/>
  “Learn more Button”
</p>
        </>
      ),
    },
    
],
},
{
  key: "seasonal", // remains the same
  chart: (d, api) => (
    // pass apiRef so the chart exposes highlight() to ScrollTrigger
    <SeasonalChart data={d.dailySeaIce} apiRef={api} />
  ),
  axesSel: AXES,
  plainCaptions: true,
  // helperSel: ".chart-ref",
  helperSel: ".chart-grid",
  // helperInIdx: 1,
  axesInIdx: 0,
  // helperInIdx: 2,
  captions: [
    // --- original three captions preserved ---
    {
      captionSide: "right",
      html: (
        <>
          <h3 className="text-2xl font-display mb-2">A Spaghetti Bowl of Bad News</h3>
          <p className="text-lg">
            Each line traces a year of Arctic sea ice from minimum to maximum and back
            again. Blue lines show colder years, red lines show warmer years.
          </p>
        </>
      ),
    },
    // --- NEW CAPTION ❶ – early half ---
    {
      captionSide: "right",
      html: (
        <>
          <h3 className="text-2xl font-display mb-2">1979 - 2000: The Cold(er) Half</h3>
          <p className="text-lg">
            Let's focus on the first half of our record, from 1979 to 2000. Hover and notice how much higher the blue lines sit.
          </p>
        </>
      ),
    },
    // --- NEW CAPTION ❷ – late half ---
    {
      captionSide: "right",
      html: (
        <>
          <h3 className="text-2xl font-display mb-2">2000 - 2025: The Hot Half</h3>
          <p className="text-lg">
            Now the most recent century takes the centre‑stage. The red lines cluster lower
            and lower.
          </p>
        </>
      ),
    },
    // --- NEW CAPTION ❸ – current year ---
    {
      captionSide: "right",
      html: (
        <>
          <h3 className="text-2xl font-display mb-2">This Year, Right Now</h3>
          <p className="text-lg">
            Finally, isolate the current year. Where does it sit? Spoiler: below the
            historical average once again.
          </p>
        </>
      ),
    },
    {
      captionSide: "right",
      html: (
        <>
          <h3 className="text-2xl font-display mb-2">Breaking Through the Floor</h3>
          <p className="text-lg">
            This isn't natural variation, it's a system in free fall.
          </p>
        </>
      ),
    },
  ],
  actions: [
    // original actions (if any) stay untouched – appends new ones
    { captionIdx: 0, call: api => api?.highlight?.("all") },
    { captionIdx: 1, call: (api) => api?.highlight?.("first") }, // after 1st new caption
    { captionIdx: 2, call: (api) => api?.highlight?.("second") }, // after 2nd new caption
    { captionIdx: 3, call: (api) => api?.highlight?.("current") }, // after 3rd new caption
    { captionIdx: 4, call: api => api?.highlight?.("all") },

  ],
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
            staircase downward. We start with the 1970s.
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
  /* ─────  BRIDGE · “Decades → Annual Extremes”  ───── */
  {
  key: "Fisherboat in Harbor",
  chartSide: "fullscreen",
  parallax: false,
  fadeIn: true,
  chart: (_d, api) => (
    <PhotoStory
      ref={api}
      photos={[{ src: "/images/heartofaseal_fisherboat.jpg", alt: "Fisherboat in Harbor" }]}
      variant="fullscreen-split"
      imageSide="right" 
      backgroundColor=""
      mainCaption="Each new decade stepped lower. But how did single years behave inside those stair-steps?"
      quote={false}
      fullscreenQuoteOpts={{
        bgParallax: 0.00,          // background fixed
        bgZoom: 0.02,
        quoteParallax: 0.3,    // gentle drift on the quote
        quoteOffsetVH: 10,      // vertically centred-ish
        fadeInAt: .01,
        fadeOutAt: .90,
        bgXAlign: -22,
        
      }}
    />
  ),
  axesSel: NO_MATCH,
  captions: [{
        captionSide: "left",
        html: (
          <>
          </>
        ),
      },],
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

  /* ─────  BRIDGE · “Anomalies → Drivers”  ───── */
{
  key: "bridge-bars-to-drivers",
  chartSide: "fullscreen",
  fadeIn: true,
  fadeOut: true,
  parallax: false,

  chart: (_d, api) => (
    <PhotoStory
      ref={api}
      photos={[
        { src: "/images/community-bonds.jpg", alt: "Polar bear on fragile ice" }
      ]}
      variant="fullscreen-split"
      imageSide="right"
      quote={false}
      fullscreenImageFit="contain"
      backgroundColor="#0f1e2c"
      textColor="white"
      mainCaption="What's pushing the ice away? We’ve seen declining
            coverage and record anomalies. Next, we layer the drivers, CO₂, global
            and Arctic temperatures, on the same scale."
      fullscreenQuoteOpts={{ bgParallax: 0.02, quoteOffsetVH: 25 }}
    />
  ),
  axesSel: NO_MATCH,
  captions: [
    {
      captionSide: "right",
      html: (
        <>
        </>
      ),
    },
  ],
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
  /* ─────────────────────────  EPILOGUE  ───────────────────────── */


// {
//   key: "sea-ice-extent",
//   chartSide: "fullscreen",
//   fadeIn: true,
//   wide: true,
//   chart: (_d, api) => (
//     <SimpleSeaIceScene
//       ref={api}
//       waypoints={[
//         { lng: -40, lat: 77, zoom: 3.8, pitch: 0 },  // full Arctic basin
//         { lng: -50, lat: 70, zoom: 5.5, pitch: 0 },  // Uummannaq close-up
//       ]}
//     />
//   ),
//   axesSel: NO_MATCH,
//   captions:[
//     {
//       html: (<>
//         <h2 className="text-3xl font-bold mb-4">Arctic Sea Ice Extent</h2>
//         <p className="text-lg max-w-prose mx-auto">
//           Comparing early-spring ice coverage over recent years.
//         </p>
//       </>),
//     },
//     {
//       captionSide:"left",
//       html: (<><p className="text-lg max-w-sm">
//         <strong>1 Mar 2017</strong>: Solid ice coverage extending 
//         far south, providing traditional travel routes.
//       </p></>)
//     },
//     {
//       captionSide:"left", 
//       html: (<><p className="text-lg max-w-sm">
//         <strong>1 Mar 2021</strong>: Noticeable reduction in ice extent,
//         with breaks appearing in previously solid areas.
//       </p></>)
//     },
//     {
//       captionSide:"left",
//       html: (<><p className="text-lg max-w-sm">
//         <strong>1 Mar 2024</strong>: Dramatic ice loss visible,
//         forcing communities to adapt to new realities.
//       </p></>)
//     },
//   ],
//   actions:[
//     { captionIdx: 0, call: api => api?.show?.("none") },
//     { captionIdx: 1, call: api => api?.show?.(2017) },
//     { captionIdx: 2, call: api => api?.show?.(2021) },
//     { captionIdx: 3, call: api => api?.show?.(2024) },
//   ],
// }
  
]