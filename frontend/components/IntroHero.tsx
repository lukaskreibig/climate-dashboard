"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { useGSAP } from "@gsap/react";
import { motion } from "framer-motion";
import { Bebas_Neue } from "next/font/google";
import { useTranslation } from 'react-i18next';

/* ───────────  font  ─────────── */
const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin"] });

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

/* ===================================================================== */
export default function IntroHero() {
  const { t } = useTranslation();
  /* ─── DOM refs ─────────────────────────────────────────────────────── */
  const wrap     = useRef<HTMLDivElement>(null);
  const photo    = useRef<HTMLImageElement>(null);
  const overlay  = useRef<HTMLDivElement>(null);
  const bgFade   = useRef<HTMLDivElement>(null);   /* NEW */
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

  /* ─── GSAP ─────────────────────────────────────────────────────────── */
  useGSAP(() => {
    if (
      !wrap.current ||
      !photo.current ||
      !overlay.current ||
      !bgFade.current ||
      !block.current ||
      !title.current ||
      !subtitle.current ||
      !line1.current ||
      !line2.current ||
      !arrow.current ||
      !idleTurb.current ||
      !idleDisp.current ||
      !meltTurb.current ||
      !meltDisp.current
    ) {
      return;
    }

    const ctx = gsap.context(() => {
      /* idle shimmer (unchanged) */
      const idle = gsap.timeline({ repeat: -1, yoyo: true });
      idle
        .to(idleTurb.current, { attr: { baseFrequency: 0.125 }, duration: 18, ease: "sine.inOut" }, 0)
        .to(idleDisp.current, { attr: { scale: 6 },             duration: 18, ease: "sine.inOut" }, 0);

      /* main, scroll-driven TL */
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger : wrap.current,
          start   : "top top",
          end     : "+=500%",           // 5 × viewport
          scrub   : true,
          pin     : true,
          onUpdate: self => {                 // NEU: pause / resume
                              if (self.progress > 0.02) {
                                idle.pause();                   // während des Scrollens anhalten
                              } else {
                                idle.resume();                  // ganz oben wieder abspielen
                              }
                            },
          snap    : { snapTo: "labelsDirectional", duration: .6, ease: "power2.inOut" }
        }
      });

      /* ── INTRO BEATS (unchanged) ─────────────────────────── */
      tl.addLabel("start");
      tl.to([arrow.current, subtitle.current], { opacity: 0, duration: .15, ease: "none" }, "start");
      tl.to(block.current, { yPercent: 50, scale: 1.05, duration: .25, ease: "none" }, "start");
     tl.to(photo.current,   { opacity: 0, scale: 1.08, duration: .15, ease: "none" }, "+=.25")
        .to(title.current,   { color: "white",           duration: .15, ease: "none" }, "<")
        .to(overlay.current, { opacity: 1,               duration: .15, ease: "none" }, "<");

      tl.to(meltTurb.current, { attr: { baseFrequency: .025 }, duration: 1, ease: "none " }, "+=.15")
        .to(meltDisp.current, { attr: { scale: 150 },          duration: 1, ease: "none" }, "<")
        .to(title.current,    { filter: "url(#scrollMelt)", scale: 1.5, duration: 1, ease: "none" }, "<")
        .addLabel("meltDone");

      tl.to(title.current, { opacity: 0, duration: .25, ease: "none" }, "+=.15");

      tl.fromTo(line1.current,
        { opacity: 0, y: 20, filter: "blur(4px)" },
        { opacity: 1, y: -170, filter: "blur(0)", duration: .30, ease: "power2.out" })
        .addLabel("sent1");
      tl.to({}, { duration: .35 });
      tl.to(line1.current, { opacity: 0, y: -300, filter: "blur(4px)", duration: .20, ease: "power2.out" })
        .fromTo(line2.current,
          { opacity: 0, y: 20, filter: "blur(4px)" },
          { opacity: 1, y: -210, filter: "blur(0)", duration: .30, ease: "power2.out" }, "<")
        .addLabel("sent2");
      tl.to({}, { duration: .35 });
      tl.to(line2.current, { opacity: 0, y: -300, filter: "blur(4px)", duration: .20, ease: "power2.out" });

      /* snap point just before leaving */
      tl.addLabel("end");

      /* ─── NEW CROSS-FADE TO SCENE GRADIENT ───────────────── */
      tl.to(overlay.current, { opacity: 0, duration: .45, ease: "none" }, "end")
        .to(bgFade.current,   { opacity: 1, duration: .45, ease: "none" }, "end");

      /* chart fade-in behind copy (unchanged) */
      tl.to(chartRef.current, { opacity: 1, duration: .6, ease: "none" }, "sent2+=.35");
    }, wrap);

    return () => ctx.revert();
  }, []);

  /* ─── JSX ────────────────────────────────────────────────── */
  return (
    <section ref={wrap} className="relative h-screen overflow-hidden text-snow-50">
      {/* background photo */}
      <motion.img
        ref={photo}
        src="/images/heartofaseal-28.jpg"
        alt="Arctic panorama"
        className="absolute inset-0 w-full h-full object-cover"
        initial={{ opacity: 1 }}
      />

      {/* dark overlay that appears during intro */}
      <div ref={overlay} className="absolute inset-0 bg-slate-500 opacity-0" />

      {/* NEW – gradient layer that fades IN as overlay fades OUT */}
      <div
        ref={bgFade}
        className="absolute inset-0 bg-neutral-950 opacity-0"

      />

      {/* headline block, sentences, arrow (unchanged) */}
      <div ref={block} className="relative z-10 flex flex-col items-center pt-5 pointer-events-none">
        <motion.h1
          ref={title}
          style={{ filter: "url(#idleShimmer)" }}
          className={`${bebasNeue.className} text-[clamp(6rem,10vw,12rem)] text-slate-400`}
        >
          {t('arctic.heroTitle')}
        </motion.h1>

        <motion.h2
          ref={subtitle}
          className="text-xl font-medium text-slate-400 -translate-y-14"
        >
          {t('arctic.heroSubtitle')}
        </motion.h2>

        <motion.h2 ref={line1} className={`${bebasNeue.className} text-center text-6xl opacity-0 text-white`}>
          {t('arctic.heroLine1')}
        </motion.h2>
        <motion.h2 ref={line2} className={`${bebasNeue.className} text-center text-6xl opacity-0 pb-4 text-white`}>
          {t('arctic.heroLine2')}
        </motion.h2>
      </div>

      {/* blinking arrow */}
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

      {/* SVG filters (unchanged) */}
      <svg className="pointer-events-none absolute h-0 w-0">
        <filter id="idleShimmer">
          <feTurbulence ref={idleTurb} result="noise" type="turbulence" baseFrequency="0.00015" numOctaves="3" seed="2" />
          <feDisplacementMap ref={idleDisp} in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        <filter id="scrollMelt" x="-50%" y="-50%" width="200%" height="200%" filterUnits="objectBoundingBox">
          <feTurbulence ref={meltTurb} type="turbulence" baseFrequency="0.0001" numOctaves="3" seed="7" result="turb" />
          <feDisplacementMap ref={meltDisp} in="SourceGraphic" in2="turb" scale="0" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
    </section>
  );
}
