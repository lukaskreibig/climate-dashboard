/* ============================================================================
   components/IntroHero.tsx  – idle shimmer, classic melt, **text‑morph finale**
   The headline “THE BIG MELT” liquifies, then reforms as two sentences:
   “The Arctic is Warming Four Times Faster Than the Global Average”
   “In the Fast‑Warming Arctic, Sea Ice Melt Is Now a Constant Reality”
   Finally, a split layout (1∕3 text • 2∕3 chart) fades in, showing the
   Seasonal Sea‑Ice Lines chart that visualises the decline.
   No imports or props removed – full component code.
============================================================================ */
"use client";

import { useRef, useState, useEffect } from "react";
import dynamic               from "next/dynamic";
import { gsap }               from "gsap";
import { ScrollTrigger }      from "gsap/ScrollTrigger";
import { useGSAP }            from "@gsap/react";
import { motion }             from "framer-motion";
import { Bebas_Neue }         from "next/font/google";

/* dynamic chart import (client‑only) ------------------------------------- */
const SeasonalLinesChartD3 = dynamic(() => import("@/components/d3/SeasonalLinesChart"), { ssr:false });

/* web‑font (display) ----------------------------------------------------- */
const bebasNeue = Bebas_Neue({ weight:"400", subsets:["latin"] });

/* register plugin -------------------------------------------------------- */
gsap.registerPlugin(ScrollTrigger);

/* -------------------------------------------------------------------------
   Types for fetched data (only the part we need here)                      */
interface DailyRow  { Year:number; DayOfYear:number; Extent:number|null }
interface DataJSON  { dailySeaIce:DailyRow[] }

/* ========================================================================= */
export default function IntroHero() {
  /* ---- data ------------------------------------------------------------ */
  const [daily, setDaily] = useState<DailyRow[]>([]);

  useEffect(() => {
    fetch("/api/data")
      .then(r => r.json())
      .then((j:DataJSON) => setDaily(j.dailySeaIce ?? []));
  }, []);

  /* ---- element refs ---------------------------------------------------- */
  const wrap      = useRef<HTMLDivElement>(null);
  const photo     = useRef<HTMLImageElement>(null);
  const overlay   = useRef<HTMLDivElement>(null);
  const block     = useRef<HTMLDivElement>(null);
  const title     = useRef<HTMLHeadingElement>(null);
  const subtitle  = useRef<HTMLHeadingElement>(null);
  const finalLine = useRef<HTMLHeadingElement>(null);
  const finalSecondLine = useRef<HTMLHeadingElement>(null);
  const arrow     = useRef<HTMLDivElement>(null);

  /* new refs for chart section ------------------------------------------ */
  const chartWrap   = useRef<HTMLDivElement>(null);

  /* ---- filter refs ----------------------------------------------------- */
  const idleTurb  = useRef<SVGFETurbulenceElement>(null);
  const idleDisp  = useRef<SVGFEDisplacementMapElement>(null);
  const meltTurb  = useRef<SVGFETurbulenceElement>(null);
  const meltDisp  = useRef<SVGFEDisplacementMapElement>(null);

  /* ---- GSAP ------------------------------------------------------------ */
  useGSAP(() => {
    const ctx = gsap.context(() => {

      /* idle shimmer (gentle loop) -------------------------------------- */
      const idle = gsap.timeline({ repeat:-1, yoyo:true });
      idle.to(idleTurb.current, { attr:{ baseFrequency:0.0225 }, duration:18, ease:"sine.inOut" }, 0)
          .to(idleDisp.current, { attr:{ scale:6 },             duration:18, ease:"sine.inOut" }, 0);

      /* scroll sequence -------------------------------------------------- */
      const main = gsap.timeline({
        scrollTrigger:{
          trigger:wrap.current,
          start:"top top",
          end:"+=400%",            // extended to accommodate chart fade‑in
          scrub:true,
          pin:true,
          onUpdate:self=>{ if(self.progress>0 && idle.isActive()) idle.kill(); }
        }
      });

      /* 0 – 0.15  fade arrow + subtitle --------------------------------- */
      main.to(arrow.current,    { opacity:0, duration:0.15, ease:"none" }, 0)
          .to(subtitle.current, { opacity:0, duration:0.15, ease:"none" }, 0);

      /* 0 – 0.25  lift block slightly ----------------------------------- */
      main.to(block.current, { yPercent:75, scale:1.05, ease:"none", duration:0.25 }, 0);

      /* 0.25 – 0.40  darken photo & show overlay ------------------------ */
      main.to(photo.current,  { opacity:0, scale:1.08, ease:"none", duration:0.15 }, 0.25)
          .to(title.current,  { color:"white",          ease:"none", duration:0.15 }, 0.25)
          .to(overlay.current,{ opacity:1,              ease:"none", duration:0.15 }, 0.25);

      /* 0.40 – 0.80  melt distortion ----------------------------------- */
      main.to(meltTurb.current, { attr:{ baseFrequency:0.025 }, duration:1.0, ease:"none" }, 0.40)
          .to(meltDisp.current, { attr:{ scale:150 },           duration:1.0, ease:"none" }, 0.40)
          .to(title.current,    { filter:"url(#scrollMelt)", scale:1.5, duration:1.0, ease:"none" }, 0.40);

      /* 0.80 – 0.95  headline fades out -------------------------------- */
      main.to(title.current, { opacity:0, duration:0.25, ease:"none" }, 0.80);

      /* 0.95 – 1.15  first sentence fades in --------------------------- */
      main.fromTo(finalLine.current,
        { opacity:0, y:20, filter:"blur(4px)" },
        { opacity:1, y:-170, filter:"blur(0px)", duration:0.30, ease:"power2.out" },
        0.95);

      /* 1.15 – 1.35  swap to second sentence --------------------------- */
      main.to(finalLine.current,
        { opacity:0, y:-300, filter:"blur(4px)", duration:0.20, ease:"power2.out" },
        1.45)
          .fromTo(finalSecondLine.current,
            { opacity:0, y:20, filter:"blur(4px)" },
            { opacity:1, y:-210, filter:"blur(0px)", duration:0.30, ease:"power2.out" },
            1.45);

      /* 1.45 – 1.65  fade in chart + explanatory text ------------------ */
      main.from(chartWrap.current,
        { opacity:0, y:60, duration:0.40, ease:"power2.out" },
        1.70);

    }, wrap);

    return () => ctx.revert();
  }, []);

  /* ---- JSX ------------------------------------------------------------- */
  return (
    <section ref={wrap} className="relative flex h-screen items-start justify-center overflow-hidden">

      {/* background photo ------------------------------------------------- */}
      <motion.img
        ref={photo}
        src="/images/heartofaseal-28.jpg"
        alt="Arctic panorama"
        className="absolute inset-0 h-full w-full object-cover"
        initial={{ opacity:1 }}
      />

      {/* dark overlay ----------------------------------------------------- */}
      <div ref={overlay} className="absolute inset-0 bg-slate-400 opacity-0" />

      {/* heading block ---------------------------------------------------- */}
      <div ref={block} className="relative z-10 mt-5 flex flex-col items-center">

        {/* main title – starts shimmering, then melts & disappears -------- */}
        <motion.h1
          ref={title}
          style={{ filter:"url(#idleShimmer)" }}
          className={`${bebasNeue.className} text-[clamp(6rem,10vw,12rem)] text-slate-400`}
        >
          THE BIG MELT
        </motion.h1>

        {/* subtitle – small credit line ---------------------------------- */}
        <motion.h2
          ref={subtitle}
          className="text-xl font-medium text-slate-400 -translate-y-14"
        >
          A data‑driven story of sea‑ice decline by Lukas Kreibig
        </motion.h2>

        {/* final sentences ------------------------------------------------ */}
        <motion.h2
          ref={finalLine}
          className={`${bebasNeue.className} text-center text-4xl opacity-0 text-white`}
        >
          The Arctic is Warming Four Times Faster Than the Global Average
        </motion.h2>

        <motion.h2
          ref={finalSecondLine}
          className={`${bebasNeue.className} text-center text-4xl opacity-0 text-white`}
        >
          In the Fast‑Warming Arctic, Sea Ice Melt Is Now a Constant Reality
        </motion.h2>

        {/* chart + explanatory text -------------------------------------- */}
        <div
          ref={chartWrap}
          className="mt-20 flex w-full max-w-7xl flex-row gap-10 opacity-0 px-4 lg:px-0"
        >
          {/* explanatory text (1/3) */}
          <div className="w-full lg:w-1/3 flex items-center">
            <p className="text-lg lg:text-xl leading-relaxed text-snow-50">
              Each year, Arctic sea ice follows a familiar cycle of freezing and melting.
              But the peaks are shrinking and the valleys are deepening. This chart shows
              how that rhythm has been losing its breath for decades.
            </p>
          </div>

          {/* chart (2/3) */}
          <div className="w-full lg:w-2/3">
            {daily.length > 0 && <SeasonalLinesChartD3 data={daily} />}
          </div>
        </div>
      </div>

      {/* blinking scroll indicator --------------------------------------- */}
      <motion.div
        ref={arrow}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-700"
        animate={{ opacity:[0.2,1,0.2] }}
        transition={{ duration:1.5, repeat:Infinity, ease:"easeInOut" }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 16.5 5 9.5h14z" />
        </svg>
      </motion.div>

      {/* SVG filters (idle shimmer + scroll‑time melt) -------------------- */}
      <svg className="pointer-events-none absolute h-0 w-0">
        {/* idle shimmer --------------------------------------------------- */}
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

        {/* melt filter with enlarged bbox -------------------------------- */}
        <filter id="scrollMelt" x="-50%" y="-50%" width="200%" height="200%" filterUnits="objectBoundingBox">
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
