/* ============================================================================
   components/IntroHero.tsx – idle shimmer ➜ melt ➜ text morph ➜ full-screen chart
   (v3) — uses ScrollTrigger **snap-to-labels** for smooth, full‑page scrollTo
   jumps between major beats (after the melt, Sentence 1, Sentence 2, etc.).
   "Scrub" still lets the user scrub the animation while the trigger is active,
   but the moment they release the wheel/trackpad the view animates to the next
   label using the built‑in ScrollToPlugin. Best‑practice, minimal code.
============================================================================ */
"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { useGSAP } from "@gsap/react";
import { motion } from "framer-motion";
import { Bebas_Neue } from "next/font/google";

/* ─────────────────────────────────────────────────────────────────────────── */
/*  dynamic import (client‑only) – Recharts version is light & responsive      */

/*  web font (display)  */
const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin"] });

/*  register GSAP plugins  */
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

/* =========================================================================== */
export default function IntroHero() {
  /* ─── element refs ──────────────────────────────────────────────────────── */
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

  /* SVG‑filter refs */
  const idleTurb = useRef<SVGFETurbulenceElement>(null);
  const idleDisp = useRef<SVGFEDisplacementMapElement>(null);
  const meltTurb = useRef<SVGFETurbulenceElement>(null);
  const meltDisp = useRef<SVGFEDisplacementMapElement>(null);

  

  /* ─── GSAP timeline ─────────────────────────────────────────────────────── */
  useGSAP(() => {
    const ctx = gsap.context(() => {
      /* idle shimmer – loops until scroll starts */
      const idle = gsap.timeline({ repeat: -1, yoyo: true });
      idle
        .to(idleTurb.current, { attr: { baseFrequency: 0.0225 }, duration: 18, ease: "sine.inOut" }, 0)
        .to(idleDisp.current, { attr: { scale: 6 },             duration: 18, ease: "sine.inOut" }, 0);

      /* main scroll‑driven sequence */
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrap.current,
          start: "top top",
          end: "+=500%",           // 5× viewport height
          scrub: true,
          pin: true,
          onUpdate: self => { if (self.progress > 0 && idle.isActive()) idle.kill(); },
          /* snap to labelled beats – uses ScrollToPlugin under the hood */
          snap: {
            snapTo: "labelsDirectional", // next/prev label depending on scroll direction
            duration: 0.6,
            ease: "power2.inOut"
          }
        }
      });

      /* ── labels make snap points ──────────────────────────────────────── */
      tl.addLabel("start", 0.0);   // 0

      /* fade arrow + subtitle */
      tl.to([arrow.current, subtitle.current], { opacity: 0, duration: 0.15, ease: "none" }, "start");

      /* lift title block */
      tl.to(block.current, { yPercent: 30, scale: 1.05, duration: 0.25, ease: "none" }, "start");

      /* darken photo / overlay / title colour  (0.25 s later) */
      tl.to(photo.current,   { opacity: 0, scale: 1.08, duration: 0.15, ease: "none" }, "+=0.25")
        .to(title.current,   { color: "white",           duration: 0.15, ease: "none" }, "<")
        .to(overlay.current, { opacity: 1,               duration: 0.15, ease: "none" }, "<");

      /* melt effect (0.40 → 1.40) */
      tl.to(meltTurb.current, { attr: { baseFrequency: 0.025 }, duration: 1.0, ease: "none" }, "+=0.15")
        .to(meltDisp.current, { attr: { scale: 150 },           duration: 1.0, ease: "none" }, "<")
        .to(title.current,    { filter: "url(#scrollMelt)", scale: 1.5, duration: 1.0, ease: "none" }, "<")
        .addLabel("meltDone");

      /* fade out title */
      tl.to(title.current, { opacity: 0, duration: 0.25, ease: "none" }, "+=0.15");

      /* ── Sentence 1 ────────────────────────────────────────────────────── */
      tl.fromTo(line1.current,
        { opacity: 0, y: 20, filter: "blur(4px)" },
        { opacity: 1, y: -170, filter: "blur(0px)", duration: 0.30, ease: "power2.out" })
        .addLabel("sent1");

      /* short dwell (keeps label centred for a moment) */
      tl.to({}, { duration: 0.35, ease: "none" });

      /* ── Sentence swap to Sentence 2 ──────────────────────────────────── */
      tl.to(line1.current,  { opacity: 0, y: -300, filter: "blur(4px)", duration: 0.20, ease: "power2.out" })
        .fromTo(line2.current,
          { opacity: 0, y: 20, filter: "blur(4px)" },
          { opacity: 1, y: -210, filter: "blur(0px)", duration: 0.30, ease: "power2.out" }, "<")
        .addLabel("sent2");

      /* dwell on sentence 2 */
      tl.to({}, { duration: 0.35, ease: "none" });

      /* fade sentence 2 away */
      tl.to(line2.current, { opacity: 0, y: -300, filter: "blur(4px)", duration: 0.20, ease: "power2.out" });

      tl.addLabel("end");

      /* chart fade‑in (behind copy) */
      tl.to(chartRef.current, { opacity: 1, duration: 0.6, ease: "none" }, "sent2+=0.35");
    }, wrap);

    return () => ctx.revert();
  }, []);

  /* ─── JSX ─────────────────────────────────────────────────────────────── */
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
      <div ref={block} className="relative z-10 flex flex-col items-center pt-5 pointer-events-none">
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
          A data‑driven story of sea‑ice decline by Lukas Kreibig
        </motion.h2>

        {/* morphing sentences */}
        <motion.h2 ref={line1} className={`${bebasNeue.className} text-center text-6xl opacity-0 text-white`}>
          The Arctic is Warming Four Times Faster Than the Global Average
        </motion.h2>
        <motion.h2 ref={line2} className={`${bebasNeue.className} text-center text-6xl opacity-0 text-white`}>
          In the Fast‑Warming Arctic, Sea Ice Melt Is Now a Constant Reality
        </motion.h2>
      </div>


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

      {/* SVG filters – idle shimmer + scroll‑time melt */}
      <svg className="pointer-events-none absolute h-0 w-0">
        {/* idle shimmer */}
        <filter id="idleShimmer">
          <feTurbulence ref={idleTurb} type="turbulence" baseFrequency="0.00015" numOctaves="3" seed="2" />
          <feDisplacementMap ref={idleDisp} in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/* melt distortion (larger bbox so blur extends beyond) */}
        <filter id="scrollMelt" x="-50%" y="-50%" width="200%" height="200%" filterUnits="objectBoundingBox">
          <feTurbulence ref={meltTurb} type="turbulence" baseFrequency="0.0001" numOctaves="3" seed="7" result="turb" />
          <feDisplacementMap ref={meltDisp} in="SourceGraphic" in2="turb" scale="0" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
    </section>
  );
}
