/* ============================================================================
   components/IntroHero.tsx  – idle shimmer ➜ melt ➜ text morph ➜ full-screen chart
   The headline “THE BIG MELT” liquifies, then reforms as two sentences:
   1. “The Arctic is Warming Four Times Faster Than the Global Average”
   2. “In the Fast-Warming Arctic, Sea Ice Melt Is Now a Constant Reality”
   Finally, a *full-width* Seasonal Sea-Ice Lines chart fades in and pins
   behind the copy.

   All imports intact – ready for Next.js 13/14 (app router, “use client”).
============================================================================ */
"use client";

import { useRef, useState, useEffect } from "react";
import dynamic              from "next/dynamic";
import { gsap }             from "gsap";
import { ScrollTrigger }    from "gsap/ScrollTrigger";
import { useGSAP }          from "@gsap/react";
import { motion }           from "framer-motion";
import { Bebas_Neue }       from "next/font/google";

/* ────────────────────────────────────────────────────────────────────────── */
/*  dynamic import (client-only) – Recharts version is light & responsive    */
const SeasonalLinesChart = dynamic(
  () => import("@/components/Rechart/SeasonalLinesChartRecharts"),
  { ssr: false }
);

/*  web font (display)  */
const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin"] });

/*  register GSAP plugin  */
gsap.registerPlugin(ScrollTrigger);

/*  types we need for the daily series  */
/* ======================================================================= */
export default function IntroHero() {
  /* ───── fetch only the daily data needed for the first chart ────────── */

  /* ───── element refs ────────────────────────────────────────────────── */
  const wrap     = useRef<HTMLDivElement>(null);
  const photo    = useRef<HTMLImageElement>(null);
  const overlay  = useRef<HTMLDivElement>(null);
  const block    = useRef<HTMLDivElement>(null);
  const title    = useRef<HTMLHeadingElement>(null);
  const subtitle = useRef<HTMLHeadingElement>(null);
  const line1    = useRef<HTMLHeadingElement>(null);
  const line2    = useRef<HTMLHeadingElement>(null);
  const arrow    = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  /* SVG-filter refs */
  const idleTurb = useRef<SVGFETurbulenceElement>(null);
  const idleDisp = useRef<SVGFEDisplacementMapElement>(null);
  const meltTurb = useRef<SVGFETurbulenceElement>(null);
  const meltDisp = useRef<SVGFEDisplacementMapElement>(null);

  /* ───── GSAP timeline ──────────────────────────────────────────────── */
  useGSAP(() => {
    const ctx = gsap.context(() => {
      /* idle shimmer – loops until scroll starts */
      const idle = gsap.timeline({ repeat: -1, yoyo: true });
      idle
        .to(idleTurb.current, { attr: { baseFrequency: 0.0225 }, duration: 18, ease: "sine.inOut" }, 0)
        .to(idleDisp.current, { attr: { scale: 6 },             duration: 18, ease: "sine.inOut" }, 0);

      /* main scroll-driven sequence */
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrap.current,
          start:   "top top",
          end:     "+=500%",      // 5× viewport height
          scrub:   true,
          pin:     true,
          onUpdate: self => { if (self.progress > 0 && idle.isActive()) idle.kill(); }
        }
      });

      /* phases – expressed in seconds for clarity */
      /* fade arrow + subtitle (0 → 1) */
      tl.to([arrow.current, subtitle.current], { opacity: 0, duration: 0.15, ease: "none" }, 0);

      /* lift title block (0 → 1) */
      tl.to(block.current, { yPercent: 30, scale: 1.05, duration: 0.25, ease: "none" }, 0);

      /* darken photo, show overlay, swap title colour */
      tl.to(photo.current,  { opacity: 0, scale: 1.08, duration: 0.15, ease: "none" }, 0.25)
        .to(title.current,  { color: "white",            duration: 0.15, ease: "none" }, 0.25)
        .to(overlay.current,{ opacity: 1,                duration: 0.15, ease: "none" }, 0.25);

      /* melt effect (0.4 → 1.4) */
      tl.to(meltTurb.current, { attr: { baseFrequency: 0.025 }, duration: 1.0, ease: "none" }, 0.4)
        .to(meltDisp.current, { attr: { scale: 150 },           duration: 1.0, ease: "none" }, 0.4)
        .to(title.current,    { filter: "url(#scrollMelt)", scale: 1.5, duration: 1.0, ease: "none" }, 0.4);

      /* fade out title */
      tl.to(title.current, { opacity: 0, duration: 0.25, ease: "none" }, 0.8);

      /* reveal sentence 1 (0.95 → 1.25) */
      tl.fromTo(line1.current,
        { opacity: 0, y: 20, filter: "blur(4px)" },
        { opacity: 1, y: -170, filter: "blur(0px)", duration: 0.30, ease: "power2.out" },
        0.95);

      /* swap to sentence 2 (1.45 → 1.65) */
      tl.to(line1.current,
        { opacity: 0, y: -300, filter: "blur(4px)", duration: 0.20, ease: "power2.out" },
        1.45)
        .fromTo(line2.current,
          { opacity: 0, y: 20, filter: "blur(4px)" },
          { opacity: 1, y: -210, filter: "blur(0px)", duration: 0.30, ease: "power2.out" },
          1.45)
        .to(line2.current,
          { opacity: 0, y: -300, filter: "blur(4px)", duration: 0.20, ease: "power2.out" },
          1.65)

    }, wrap);

    return () => ctx.revert();
  }, []);

  /* ───── JSX ─────────────────────────────────────────────────────────── */
  return (
    <section ref={wrap} className="relative h-screen overflow-hidden text-snow-50">

      {/* background photo */}
      <motion.img
        ref={photo}
        src="/heartofaseal-28.jpg"
        alt="Arctic panorama"
        className="absolute inset-0 h-full w-full object-cover"
        initial={{ opacity: 1 }}
      />

      {/* dark overlay */}
      <div ref={overlay} className="absolute inset-0 bg-slate-400 opacity-0" />

      {/* headline block */}
      <div
        ref={block}
        className="relative z-10 flex flex-col items-center pt-5 pointer-events-none"
      >
        {/* shimmering headline */}
        <motion.h1
          ref={title}
          style={{ filter: "url(#idleShimmer)" }}
          className={`${bebasNeue.className} text-[clamp(6rem,10vw,12rem)] text-slate-400`}
        >
          THE BIG MELT
        </motion.h1>

        {/* subtitle */}
        <motion.h2
          ref={subtitle}
          className="text-xl font-medium text-slate-400 -translate-y-14"
        >
          A data-driven story of sea-ice decline by Lukas Kreibig
        </motion.h2>

        {/* morphing sentences */}
        <motion.h2
          ref={line1}
          className={`${bebasNeue.className} text-center text-6xl opacity-0 text-white`}
        >
          The Arctic is Warming Four Times Faster Than the Global Average
        </motion.h2>

        <motion.h2
          ref={line2}
          className={`${bebasNeue.className} text-center text-6xl opacity-0 text-white`}
        >
          In the Fast-Warming Arctic, Sea Ice Melt Is Now a Constant Reality
        </motion.h2>
      </div>

      {/* full-width chart (pinned under copy) */}

      {/* blinking scroll indicator */}
      <motion.div
        ref={arrow}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-700"
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 16.5 5 9.5h14z" />
        </svg>
      </motion.div>

      {/* SVG filters – idle shimmer + scroll-time melt */}
      <svg className="pointer-events-none absolute h-0 w-0">
        {/* idle shimmer */}
        <filter id="idleShimmer">
          <feTurbulence
            ref={idleTurb}
            type="turbulence"
            baseFrequency="0.00015"
            numOctaves="3"
            seed="2"
          />
          <feDisplacementMap
            ref={idleDisp}
            in="SourceGraphic"
            in2="noise"
            scale="4"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* melt distortion (larger bbox so the blur extends beyond) */}
        <filter
          id="scrollMelt"
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
          filterUnits="objectBoundingBox"
        >
          <feTurbulence
            ref={meltTurb}
            type="turbulence"
            baseFrequency="0.0001"
            numOctaves="3"
            seed="7"
            result="turb"
          />
          <feDisplacementMap
            ref={meltDisp}
            in="SourceGraphic"
            in2="turb"
            scale="0"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>
    </section>
  );
}
