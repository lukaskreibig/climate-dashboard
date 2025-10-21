/* ------------------------------------------------------------------
   scenesConfig.tsx – Chapter 1 — "The Arctic: Our Planet's Canary"
   Restructured for compelling data journalism
------------------------------------------------------------------- */
import dynamic      from "next/dynamic";
import { SceneCfg } from "./ChartScene";
import { NO_MATCH } from "./ChartScene";
import PhotoStory from "../PhotoStory";
import MapFlyScene from "../MapFlyScene";
import SatelliteScene from "@/components/SatelliteScene";
import { useTranslation } from 'react-i18next';
import { CaptionWithLearnMore } from "../CaptionsWithLearnMore";

// const MapFlyScene   = dynamic(() => import("../MapFlyScene"), { ssr: false });


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

// const SatelliteScene = dynamic(()=>import("@/components/SatelliteScene"),{ssr:false});


/* ─── Chart components ─── */
const MeanSpringAnomalyChart = dynamic(() => import("@/components/Rechart/MeanSpringAnomalyChart"), { ssr: false });
const EarlyLateSeasonChart = dynamic(() => import("@/components/Rechart/EarlyLateSeasonChart"), { ssr: false });
const MeanIceFractionChart = dynamic(() => import("@/components/Rechart/MeanIceFractionChart"), { ssr: false });
const FreezeBreakTimelineChart = dynamic(() => import("@/components/Rechart/FreezeBreakTimelineChart"), { ssr: false });
const AllYearsSeasonChart = dynamic(() => import("@/components/Rechart/AllYearsSeasonChart"), { ssr: false });

export const dynamicModules = [
  SeasonalChart,
  AnnualChart,
  IQRChart,
  DailyChart,
  MultiChart,
  ZScoreChart,
  Bar24Chart,
  ScatterChart,
  MeanSpringAnomalyChart,
  EarlyLateSeasonChart,
  MeanIceFractionChart,
  FreezeBreakTimelineChart,
  AllYearsSeasonChart,
  WhyArcticExplainer,
  MapFlyScene,
  SatelliteScene,
  PhotoStory,           // forwardRef-komponente, aber preloadbar
];


/* helper ------------------------------------------------------- */
const AXES = ".chart-grid, .chart-axis";

interface DataBundle{
  dailySeaIce   : any[];
  annualAnomaly : any[];
  iqrStats      : any;
  annual        : any[];
}


export const useScenesWithTranslation = () => {
  const { t } = useTranslation();
  
  const scenes: SceneCfg[] = [

   {
      key: "geographic-journey",
      chartSide: "fullscreen",
      progressPoint: true,
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
          boxClass: "ice-card",
          html: (
            <>
              <h2 className="text-4xl font-bold mb-5">
                {t('scenes.geographic.title')}
              </h2>
              <p className="text-lg max-w-prose mx-auto">
                {t('scenes.geographic.intro')}
              </p>
            </>
          ),
        },
        {
          captionSide: "left",
          html: (
            <>
              <h3 className="text-2xl font-display mb-2">{t('scenes.geographic.greenland.title')}</h3>
              <p className="text-lg max-w-sm">
                {t('scenes.geographic.greenland.description')}
              </p>
            </>
          ),
        },
        {
          captionSide: "right",
          html: (
            <>
              <h3 className="text-2xl font-display mb-2">{t('scenes.geographic.uummannaqBay.title')}</h3>
              <p className="text-lg max-w-sm">
                {t('scenes.geographic.uummannaqBay.description')}
              </p>
            </>
          ),
        },
        {
          captionSide: "left",
          html: (
            <>
              <h3 className="text-2xl font-display mb-2">{t('scenes.geographic.uummannaqIsland.title')}</h3>
              <p className="text-lg max-w-lg">
                {t('scenes.geographic.uummannaqIsland.description')}
                <br/><br/>
                <span className="text-blue-400 font-semibold">{t('scenes.geographic.uummannaqIsland.changing')}</span>
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
  progressPoint: true, 
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
              <h3 className="text-2xl font-display mb-2">{t('scenes.heartOfSeal.title')}</h3>
              <p className="text-lg max-w-sm">
                {t('scenes.heartOfSeal.description')}
              </p>
            </>
          ), },     
     ],
},
    {
  key: "Winter Months",
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
              <p className="text-lg max-w-sm">
                {t('scenes.winterMonths.description')}
              </p>
            </>
          ), }],
},
    {
  key: "Fishing Town",
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
              <p className="text-lg max-w-sm">
                {t('scenes.fishing.description')}
              </p>
            </>
          ), }],
},
 {
  key: "ummannaqview",
  progressPoint: true, 
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
            <CaptionWithLearnMore
              learnMore={{
                title: t('scenes.voices.learnMoreTitle'),
                content: t('scenes.voices.learnMoreContent'),
                linkTitle: t('scenes.voices.learnMoreLink'),
                linkUrl: t('scenes.voices.learnMoreLinkUrl'),
              }}
            >
              <h2 className="text-3xl font-bold mb-3">{t('scenes.voices.title')}</h2>
<p className="text-lg text-center max-w-2xl mx-auto">
  {t('scenes.voices.description')}
</p>
            </CaptionWithLearnMore>
          ),



      
      
    },
],
},
    {
  key: "Ice Disappears",
  chartSide: "fullscreen",
  fadeIn: true,
  fadeOut: true,
  parallax: false,
  chart: (_d, api) => (
    <PhotoStory
      ref={api}
      photos={[{ src: "/images/heartofaseal_website11.jpg", alt: "Pushing a sled" }]}
      variant="fullscreen"
      mainCaption={t('scenes.quotes.iceDisappears')}
      author={t('scenes.quotes.participant')}
      authorSubtitle={t('scenes.quotes.source')}
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
  key: "Unstable Climate",
  chartSide: "fullscreen",
  fadeIn: true,
  fadeOut: true,
  parallax: false,
  chart: (_d, api) => (
    <PhotoStory
      ref={api}
      photos={[{ src: "/images/heartofaseal_wind.jpg", alt: "Heavy Snowstorm" }]}
      variant="fullscreen-split"
      mainCaption={t('scenes.quotes.unstableClimate')}
      author={t('scenes.quotes.participant')}
      authorSubtitle={t('scenes.quotes.source')}
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
  key: "Motorsledge",
  chartSide: "fullscreen",
  fadeIn: true,
  parallax: false,
  chart: (_d, api) => (
    <PhotoStory
      ref={api}
      photos={[{ src: "/images/motorsledge.jpg", alt: "Motorsledge" }]}
      variant="fullscreen"
      mainCaption={t('scenes.quotes.motorsledge')}
      author={t('scenes.quotes.participant')}
      authorSubtitle={t('scenes.quotes.source')}
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
  progressPoint: true, 
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
      rawImg ="/images/satellite.jpg"
      maskImg="/images/overlay.jpg"
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
        <h2 className="text-3xl font-bold mb-3">{t('scenes.measurement.title')}</h2>
        <p className="text-lg text-center max-w-2xl mx-auto">
          {t('scenes.measurement.intro')}
        </p>
      </>
    },
    {
      captionSide:"left",
      html:<p className="text-lg max-w-sm">
        {t('scenes.measurement.step1')}
      </p>
    },
    {
      captionSide:"left",
      html:<p className="text-lg max-w-sm">
        {t('scenes.measurement.step2')}
      </p>
    },
    {
      captionSide:"left",
      html:<p className="text-lg max-w-sm">
        {t('scenes.measurement.step3')}
      </p>
    },
    {
      captionSide:"left",
      html: <CaptionWithLearnMore
              learnMore={{
                title: t('scenes.measurement.learnMoreTitle'),
                content: t('scenes.measurement.learnMoreContent'),
                linkTitle: t('scenes.measurement.learnMoreLink'),
                image: "/images/pipeline.png",  
              }}
            >
             <p className="text-lg max-w-sm">
        {t('scenes.measurement.step4')}
      </p>
            </CaptionWithLearnMore>
    },
     {
      captionSide:"left",
      html:<p className="text-lg max-w-sm">
        {t('scenes.measurement.step5')}
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
    progressPoint: true,
    plainCaptions: true,
    axesSel: AXES,

    captions: [
      {
        captionSide: "right",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">{t('scenes.visualProof.title')}</h3>
            <p className="text-lg">
              {t('scenes.visualProof.description')}
            </p>
          </>
        ),
      },
      {
        captionSide: "right",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">{t('scenes.visualProof.numbersTitle')}</h3>
            <p className="text-lg">
              {t('scenes.visualProof.numbersDescription')}
              <br/><br/>
              <span className="text-red-400 font-bold">{t('scenes.visualProof.trend')}</span>
              <br/><br/>
              {t('scenes.visualProof.conclusion')}
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
    chart: (d: DataBundle, api) => <EarlyLateSeasonChart data={d.season} apiRef={api} lossPct={d.seasonLossPct} />,
    axesSel: AXES,
    plainCaptions: true,
    axesInIdx: 0,

    captions: [
      {
        captionSide: "left",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">{t('scenes.newAbnormal.title')}</h3>
            <p className="text-lg">
             {t('scenes.newAbnormal.description')}
            </p>
          </>
        ),
      },
      {
        captionSide: "left",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">{t('scenes.newAbnormal.title')}</h3>
            <p className="text-lg">
              {t('scenes.newAbnormal.earlyPeriod')}
            </p>
          </>
        ),
      },
      {
        captionSide: "left",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">{t('scenes.newAbnormal.livingOutsideTitle')}</h3>
            <p className="text-lg">
              {t('scenes.newAbnormal.livingOutside')}
              <span className="text-red-400 font-bold">{t('scenes.newAbnormal.percentage')}</span> {t('scenes.newAbnormal.consequence')}
              <br/><br/>
              {t('scenes.newAbnormal.result')}
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
    plainCaptions: true,
    axesSel: AXES,

    captions: [
      {
        captionSide: "right",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">{t('scenes.trajectory.title')}</h3>
            <p className="text-lg max-w-lg">
              {t('scenes.trajectory.rate')}
            </p>
          </>
        ),
      },
    ],
  },
  {
  key: "Downwards Trend",
  progressPoint: true, 
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
      mainCaption={t('scenes.future.trend')}
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
  key: "Only a Memory",
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
      mainCaption={t('scenes.future.memory')}
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
      mainCaption={t('scenes.future.traditions')}
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
  progressPoint: true, 
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
            <CaptionWithLearnMore
              learnMore={{
                title: t('scenes.toArctic.learnMoreTitle'),
                content: t('scenes.toArctic.learnMoreContent'),
                linkTitle: t('scenes.toArctic.learnMoreLink'),
              }}
            >
         <h2 className="text-3xl font-bold mb-3">{t('scenes.toArctic.title')}</h2>
<p className="text-lg text-center max-w-2xl mx-auto">
  {t('scenes.toArctic.description')}</p>
            </CaptionWithLearnMore>)
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
          <h3 className="text-2xl font-display mb-2">{t('scenes.seasonal.title')}</h3>
          <p className="text-lg">
            {t('scenes.seasonal.description')}
          </p>
        </>
      ),
    },
    // --- NEW CAPTION ❶ – early half ---
    {
      captionSide: "right",
      html: (
        <>
          <h3 className="text-2xl font-display mb-2">{t('scenes.seasonal.early.title')}</h3>
          <p className="text-lg">
            {t('scenes.seasonal.early.description')}
          </p>
        </>
      ),
    },
    // --- NEW CAPTION ❷ – late half ---
    {
      captionSide: "right",
      html: (
        <>
          <h3 className="text-2xl font-display mb-2">{t('scenes.seasonal.late.title')}</h3>
          <p className="text-lg">
            {t('scenes.seasonal.late.description')}
          </p>
        </>
      ),
    },
    // --- NEW CAPTION ❸ – current year ---
    {
      captionSide: "right",
      html: (
        <>
          <h3 className="text-2xl font-display mb-2">{t('scenes.seasonal.current.title')}</h3>
          <p className="text-lg">
            {t('scenes.seasonal.current.description')}
          </p>
        </>
      ),
    },
    {
      captionSide: "right",
      html: (
        <>
          <h3 className="text-2xl font-display mb-2">{t('scenes.seasonal.breaking.title')}</h3>
          <p className="text-lg">
            {t('scenes.seasonal.breaking.description')}
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
    progressPoint: true,
    plainCaptions: true,
    chart : (d:DataBundle, api) =>
            <DailyChart data={(d as any).decadalAnomaly} apiRef={api} />,
    axesSel   : AXES,
    axesInIdx : 0,

    captions : [
      {
        captionSide:"left",
        html:(<>
          <h3 className="text-2xl font-display mb-2">{t('scenes.decades.title')}</h3>
          <p className="text-lg">
            {t('scenes.decades.description')}
          </p>
        </>)
      },
      {
        captionSide:"left",
        html:(<>
          <h3 className="text-2xl font-display mb-2">{t('scenes.decades.1980s.title')}</h3>
          <p className="text-lg">
            {t('scenes.decades.1980s.description')}
          </p>
        </>)
      },
      {
        captionSide:"left",
        html:(<>
          <h3 className="text-2xl font-display mb-2">{t('scenes.decades.1990s.title')}</h3>
          <p className="text-lg">
            {t('scenes.decades.1990s.description')}
          </p>
        </>)
      },
            {
        captionSide:"left",
        html:(<>
          <h3 className="text-2xl font-display mb-2">{t('scenes.decades.2000s.title')}</h3>
          <p className="text-lg">
            {t('scenes.decades.2000s.description')}
          </p>
        </>)
      },
      {
        captionSide:"left",
        html:(<>
          <h3 className="text-2xl font-display mb-2">{t('scenes.decades.2010s.title')}</h3>
          <p className="text-lg">
            {t('scenes.decades.2010s.description')}
          </p>
        </>)
      },
      {
        captionSide:"left",
        html:(<>
          <h3 className="text-2xl font-display mb-2">{t('scenes.decades.2020s.title')}</h3>
          <p className="text-lg">
            {t('scenes.decades.2020s.description')}
            <br/><br/>
            {t('scenes.decades.2020s.acceleration')}
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
  /* ─────  BRIDGE · "Decades → Annual Extremes"  ───── */
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
      mainCaption={t('scenes.bridge.decades')}
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
          <h3 className="text-2xl font-display mb-2">{t('scenes.annual.title')}</h3>
          <p className="text-lg">
            {t('scenes.annual.description')}
            <br/><br/>
            {t('scenes.annual.analysis')}
            <br/><br/>
            {t('scenes.annual.conclusion')}
          </p>
        </>)
      }
    ]
  },

  /* ─────  BRIDGE · "Anomalies → Drivers"  ───── */
{
  key: "Climate Change Drivers",
  progressPoint: true, 
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
      mainCaption={t('scenes.drivers.intro')}
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
          <h3 className="text-2xl font-display mb-2">{t('scenes.connections.title')}</h3>
          <p className="text-lg">
            {t('scenes.connections.description')}
            <br/><br/>
            {t('scenes.connections.causation')}
            <br/><br/>
            {t('scenes.connections.conclusion')}
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
          <h3 className="text-2xl font-display mb-2">{t('scenes.zscore.title')}</h3>
          <p className="text-lg">
            {t('scenes.zscore.description')}
            <br/><br/>
            {t('scenes.zscore.method')}
          </p>
        </>)
      },
      {
        captionSide:"left",
        at:0.55, out:0.85,
        html:(<>
          <h3 className="text-2xl font-display mb-2">{t('scenes.zscore.mirror.title')}</h3>
          <p className="text-lg">
            {t('scenes.zscore.mirror.description')}
            <br/><br/>
            {t('scenes.zscore.mirror.conclusion')}
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
    progressPoint: true,
    chart    : (d:DataBundle)=> <Bar24Chart data={d.annual}/>,
    axesSel  : AXES,
    plainCaptions: true,
    captions : [
      {
        captionSide:"right",
        at:0.15, out:1,
        html:(<>
          <h3 className="text-2xl font-display mb-2">{t('scenes.2024.title')}</h3>
          <p className="text-lg">
            {t('scenes.2024.description')}
            <br/><br/>
            {t('scenes.2024.warning')}
            <br/><br/>
            {t('scenes.2024.conclusion')}
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

  return scenes;
};