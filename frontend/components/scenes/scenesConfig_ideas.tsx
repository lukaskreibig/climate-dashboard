/* ------------------------------------------------------------------
   scenesConfig_Chapter1.tsx · Chapter 1 — "The Big Melt"
   JOURNALISTIC STORYTELLING: Personal Journey to Uummannaq
   Clean narrative: Hook → Journey → People → Culture → Science
------------------------------------------------------------------ */
"use client";

import dynamic from "next/dynamic";
import { NO_MATCH } from "@/components/scenes/ChartScene";
import type { SceneCfg } from "@/components/scenes/ChartScene";

/* ─── Core components ─── */
const MapFlyScene = dynamic(() => import("@/components/MapFlyScene"), { ssr: false });
const HeroFade = dynamic(() => import("@/components/HeroFade"), { ssr: false });
const OpeningQuoteHero = dynamic(() => import("@/components/OpeningQuoteHero"), { ssr: false });

// Direct imports for remaining components  
import PhotoStory from "@/components/PhotoStory";
import HumanImpactStory from "@/components/HumanImpactStory";

export const scenesChapter1: SceneCfg[] = [

  /* ═══════════════════════════════════════════════════════════ */
  /* OPENING: THE HOOK                                           */
  /* ═══════════════════════════════════════════════════════════ */

  {
    key: "opening-quote-hero",
    chartSide: "fullscreen",
    parallax: false,
    chart: (_d, api) => (
      <OpeningQuoteHero
        ref={api}
        backgroundImage="/heartofaseal_website11.jpg"
        chapterTitle="The Big Melt"
        chapterSubtitle="A Story of Arctic Change"
        quote="When I was a child, the ice was gone in June and July, now it is gone in April and May."
        speaker="Community Elder, 67"
        location="Uummannaq"
        year="2018"
        autoPlay={true}
        typewriterSpeed={50}
      />
    ),
    axesSel: NO_MATCH,
    captions: [{ html: <></> }],
  },

  /* ═══════════════════════════════════════════════════════════ */
  /* ACT I: GEOGRAPHIC JOURNEY                                   */
  /* ═══════════════════════════════════════════════════════════ */

  {
    key: "geographic-journey",
    chartSide: "fullscreen",
    parallax: false,
    chart: (_d, api) => (
      <MapFlyScene
        ref={api}
        waypoints={[
          { lng: 0, lat: 90, zoom: 1.3, pitch: 0 },                    // Global Arctic
          { lng: -42, lat: 72, zoom: 3.3, pitch: 0 },                 // Greenland
          { lng: -52.14, lat: 71, zoom: 7.0, pitch: 30 },             // Uummannaq Bay
          { lng: -52.27, lat: 70.67, zoom: 10, pitch: 60, bearing: 30 }, // Approach
          { lng: -52.27, lat: 70.69, zoom: 11, pitch: 0, bearing: 0 },   // Uummannaq Island
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
              The Big Melt
            </h2>
            <p className="text-lg max-w-prose mx-auto">
              In the Arctic, entire communities have lived in harmony with sea ice 
              for 4,000 years. But what happens when that ice starts disappearing 
              faster than ever before?
            </p>
          </>
        ),
      },
      {
        captionSide: "left",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">The World's Largest Island</h3>
            <p className="text-lg max-w-sm">
              Greenland: 80% ice sheet, 20% rugged coastline. 
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
            <h3 className="text-2xl font-display mb-2">600km North of the Arctic Circle</h3>
            <p className="text-lg max-w-sm">
              Uummannaq Bay opens into one of Greenland's most dramatic fjord systems. 
              For most of the year, sea ice turns these waters into frozen highways 
              connecting isolated settlements.
            </p>
          </>
        ),
      },
      {
        captionSide: "left",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">Home to 1,300 Souls</h3>
            <p className="text-lg max-w-lg">
              Living beneath a distinctive heart-shaped mountain, this community 
              represents thousands of Arctic settlements whose existence depends 
              entirely on predictable sea ice patterns.
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
      { captionIdx: 3, call: api => api?.go?.(3) }, // Approach
      { captionIdx: 3, call: api => api?.go?.(4) }, // Uummannaq Island
    ],
  },

  /* ═══════════════════════════════════════════════════════════ */
  /* ACT II: PERSONAL DISCOVERY                                  */
  /* ═══════════════════════════════════════════════════════════ */

  {
    key: "personal-discovery",
    chartSide: "fullscreen",
    chart: (_d, api) => {
      const photos = [
        {
          src: "/images/heartofaseal_town.jpg",
          alt: "Uummannaq town overview",
          caption: "Uummannaq, where tradition meets rapid change",
        },
        {
          src: "/heartofaseal-15.jpg",
          alt: "Ice formations",
          caption: "Ancient ice, now unpredictable and dangerous",
        },
        {
          src: "/heartofaseal-28.jpg",
          alt: "Daily life in Uummannaq",
          caption: "A community adapting faster than ever before",
        }
      ];

      return (
        <PhotoStory
          ref={api}
          photos={photos}
          variant="scroll-story"
          parallaxIntensity={0.5}
          mainCaption="Once I saw the first glimpses of the mountain that Uummannaq centers around, I was instantly drawn to the beauty and rawness of this remote place."
          author="LUKAS KREIBIG"
          authorSubtitle="Documentary Photographer • Heart of a Seal"
          className="w-full h-full"
        />
      );
    },
    axesSel: NO_MATCH,
    plainCaptions: true,
    parallax: false,
    captions: [{ html: <></> }],
  },

  /* ═══════════════════════════════════════════════════════════ */
  /* ACT III: VOICES FROM THE COMMUNITY                          */
  /* ═══════════════════════════════════════════════════════════ */

  {
    key: "community-voices",
    chartSide: "fullscreen",
    parallax: false,
    chart: (_d, api) => {
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
          image: "/images/young-hunter.jpg",
          alt: "Young hunter in changing Arctic conditions"
        }
      ];

      return (
        <HumanImpactStory
          ref={api}
          images={images}
          transition="fade"
          captionSide="center"
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
            <h2 className="text-3xl font-bold mb-4">Listening to Uummannaq</h2>
            <p className="text-lg text-center max-w-2xl mx-auto">
              For generations, the people here have read the ice like a book. 
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
            <h3 className="text-2xl font-display mb-2">The Elder's Wisdom</h3>
            <p className="text-lg max-w-sm mb-4">
              <span className="text-gray-400 text-sm">Community Elder, 67 • Uummannaq, 2018</span>
            </p>
            <blockquote className="text-lg italic mb-4 border-l-4 border-blue-400 pl-4">
              "When I was a child, the ice was gone in June and July, now it is gone in April and May."
            </blockquote>
            <p className="text-red-400 font-medium">
              Impact: A lifetime of knowledge becoming obsolete
            </p>
          </>
        ),
      },
      {
        captionSide: "left", 
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">Community Bonds Breaking</h3>
            <p className="text-lg max-w-sm mb-4">
              <span className="text-gray-400 text-sm">Community Elder • Uummannaq, 2018</span>
            </p>
            <blockquote className="text-lg italic mb-4 border-l-4 border-blue-400 pl-4">
              "Our ancestors were strong people, because they worked together to solve problems. People became individualists and stopped helping others."
            </blockquote>
            <p className="text-red-400 font-medium">
              Impact: Environmental change driving social fragmentation
            </p>
          </>
        ),
      },
      {
        captionSide: "right",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">The Young Hunter's Reality</h3>
            <p className="text-lg max-w-sm mb-4">
              <span className="text-gray-400 text-sm">Hunter, 28 • Uummannaq, 2018</span>
            </p>
            <blockquote className="text-lg italic mb-4 border-l-4 border-blue-400 pl-4">
              "The climate has become more unstable. The wind is unpredictable and stronger."
            </blockquote>
            <p className="text-red-400 font-medium">
              Impact: Traditional weather patterns no longer reliable
            </p>
          </>
        ),
      },
    ],

    actions: [
      { captionIdx: 1, call: api => api?.goToStory?.(0) }, // Show elder
      { captionIdx: 2, call: api => api?.goToStory?.(1) }, // Show community
      { captionIdx: 3, call: api => api?.goToStory?.(2) }, // Show hunter
    ],
  },

  /* ═══════════════════════════════════════════════════════════ */
  /* ACT IV: CULTURAL TRANSFORMATION                             */
  /* ═══════════════════════════════════════════════════════════ */

  {
    key: "cultural-transformation",
    chartSide: "fullscreen",
    parallax: false,
    chart: (_d, api) => {
      const photos = [
        {
          src: "/images/traditional-2017.jpg",
          alt: "Traditional dog sleds on stable ice",
          year: "2017",
          caption: "Dog sleds on stable ice • Community hunts • Predictable seasons"
        },
        {
          src: "/images/modern-2024.jpg",
          alt: "Modern motorized transport",
          year: "2024",
          caption: "Motorized transport • Individual solutions • Constant uncertainty"
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
            <h2 className="text-3xl font-bold mb-4">Then and Now: Adapting to Survive</h2>
            <p className="text-lg max-w-prose mx-auto mb-6">
              "A lot of hunters prefer the motorsledge over dogsledding, 
              because the winters are too short."
            </p>
            <p className="text-xl font-semibold text-blue-400">
              4,000 years of culture adapting in a single decade
            </p>
          </>
        ),
      },
    ],
  },

  /* ═══════════════════════════════════════════════════════════ */
  /* ACT V: THE SCIENCE BEHIND THE STORIES                       */
  /* ═══════════════════════════════════════════════════════════ */

  {
    key: "science-behind-stories",
    chart: (_d, api) => (
      <HeroFade
        ref={api}
        rawSrc="/images/satellite-raw.jpg"
        overlaySrc="/images/satellite-classified.png"
      />
    ),
    axesSel: NO_MATCH,

    captions: [
      {
        captionSide: "left",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">What People See</h3>
            <p className="text-lg max-w-sm">
              Hunters notice thinner ice, earlier breakup, unpredictable conditions. 
              But individual observations can't capture the full scope of change.
            </p>
          </>
        ),
      },
      {
        captionSide: "left",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">What Satellites Measure</h3>
            <p className="text-lg max-w-sm">
              Every day, Sentinel-2 photographs Uummannaq from 786km above. 
              A neural network classifies each pixel: water 🟦, thin ice 🟩, 
              thick ice ⬛, land 🟫.
              <br/><br/>
              <span className="font-semibold">Human stories become quantifiable data.</span>
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
  /* ACT VI: THE DATA PIPELINE                                   */
  /* ═══════════════════════════════════════════════════════════ */

  {
    key: "data-pipeline",
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
              Millions of pixels become a single measurement: 
              the percentage of Uummannaq Fjord covered by ice. 
              Simple, precise, irrefutable.
            </p>
          </>
        ),
      },
      {
        captionSide: "right",
        html: (
          <>
            <h3 className="text-2xl font-display mb-2">A Decade of Evidence</h3>
            <p className="text-lg max-w-sm">
              We've compiled 10 years of daily measurements. 
              The patterns confirm what the community has been saying—
              and reveal the true extent of the crisis.
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
  /* CHAPTER TRANSITION                                          */
  /* ═══════════════════════════════════════════════════════════ */

  {
    key: "chapter1-end",
    chart: () => <div className="w-full h-full bg-gradient-to-b from-slate-900 to-black" />,
    axesSel: NO_MATCH,
    chartSide: "fullscreen",

    captions: [
      {
        captionSide: "center",
        boxClass: "ice-card pointer-events-auto",
        html: (
          <>
            <h2 className="text-3xl font-bold mb-4">From Stories to Data</h2>
            <p className="text-lg max-w-prose mx-auto">
              We've heard the voices. We've seen the changes through their eyes. 
              We understand how satellites turn observations into measurements.
              <br/><br/>
              Now it's time to see what a decade of data reveals about the true 
              scale of Arctic change.
              <br/><br/>
              <span className="text-xl font-semibold text-blue-400">
                Chapter 2: The Evidence Speaks
              </span>
            </p>
          </>
        ),
      }
    ],
  }
];

export default scenesChapter1;