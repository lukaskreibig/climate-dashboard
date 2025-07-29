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
  const line4    = useRef<HTMLHeadingElement>(null);
  const line5    = useRef<HTMLHeadingElement>(null);
  const line6    = useRef<HTMLHeadingElement>(null);
  const arrow    = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  /* SVG-filter refs */
  const idleTurb = useRef<SVGFETurbulenceElement>(null);
  const idleDisp = useRef<SVGFEDisplacementMapElement>(null);
  const meltTurb = useRef<SVGFETurbulenceElement>(null);
  const meltDisp = useRef<SVGFEDisplacementMapElement>(null);

  /* ─── GSAP ─────────────────────────────────────────────────────────── */
  useGSAP(() => {
    const ctx = gsap.context(() => {
      /* idle shimmer (unchanged) */
      const idle = gsap.timeline({ repeat: -1, yoyo: true });
      idle
        .to(idleTurb.current, { attr: { baseFrequency: 0.125 }, duration: 18, ease: "sine.inOut" }, 0)
        .to(idleDisp.current, { attr: { scale: 6 },             duration: 18, ease: "sine.inOut" }, 0);

      /* main, scroll-driven TL */
      const tl2 = gsap.timeline({
        scrollTrigger: {
          trigger : wrap.current,
          start   : "top top",
          end     : "+=500%",           // 5 × viewport
          scrub   : 0.5,
          pin     : true,
          onUpdate: self => { if (self.progress > 0 && idle.isActive()) idle.kill(); },
        }
      });

      /* ── INTRO BEATS (unchanged) ─────────────────────────── */
      tl2.addLabel("start");
    //   tl2.to([arrow.current, subtitle.current], { opacity: 0, duration: .15, ease: "none" }, "start");
      tl2.to(block.current, {scale: 1.05, duration: .25, ease: "none" }, "start");
      tl2.to(overlay.current, { opacity: 1,               duration: .15, ease: "none" }, "<");
      tl2.to(title.current,   { color: "white",           duration: .15, ease: "none" }, "<")
      tl2.to(meltTurb.current, { attr: { baseFrequency: .025 }, duration: 1, ease: "none" }, "+=.15")
        .to(meltDisp.current, { attr: { scale: 150 },          duration: 1, ease: "none" }, "<")
        .to(title.current,    { filter: "url(#scrollMelt)", scale: 1.5, duration: 1, ease: "none" }, "<")
        .addLabel("meltDone");

    //   tl2.to(title.current, { opacity: 0, duration: .25, ease: "none" }, "+=.15");

      tl2.fromTo(line4.current,
        { opacity: 0, y: 500 },
        { opacity: 1, y: 280})
        .addLabel("sent1");
      tl2.to({}, { duration: .35 });
      tl2.to(line4.current, { opacity: 0, y: -300, filter: "blur(4px)", duration: .20, ease: "power2.out" })
        .fromTo(line5.current,
          { opacity: 0, y: 500 },
          { opacity: 1, y: 220}, "<")
        .addLabel("sent2");
      tl2.to({}, { duration: .35 });
      tl2.to(photo.current,   { opacity: 1, scale: 1.08, duration: .15, ease: "none" }, "+=.25")
      tl2.to(overlay.current, { opacity: 0,               duration: .15, ease: "none" }, "<").to(line5.current, {color: "black", duration: .30, ease: "none"}, "<")
      tl2.to(line5.current, { opacity: 0, y: -300, filter: "blur(4px)", duration: .20, ease: "power2.out" })
        .fromTo(line6.current,
          { opacity: 0, y: 500 },
          { opacity: 1, y: 160 }, "<")
        .addLabel("sent2");

    

      /* snap point just before leaving */
      tl2.addLabel("end");

      /* ─── NEW CROSS-FADE TO SCENE GRADIENT ───────────────── */
    //   tl2.to(overlay.current, { opacity: 0, duration: .45, ease: "none" }, "end")
    //     .to(bgFade.current,   { opacity: 1, duration: .45, ease: "none" }, "end");

      /* chart fade-in behind copy (unchanged) */
    //   tl2.to(chartRef.current, { opacity: 1, duration: .6, ease: "none" }, "sent2+=.35");
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
        initial={{ opacity: 0 }}
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
       
        <motion.h2 ref={line4} className={`${bebasNeue.className} text-center text-6xl opacity-0 text-white`}>
            {t('arctic.heroLine3')}
        </motion.h2>
        <motion.h2 ref={line5} className={`${bebasNeue.className} text-center text-6xl opacity-0 pb-4 text-white`}>
             {t('arctic.heroLine4')}
        </motion.h2>
        <motion.h2 ref={line6} className={`${bebasNeue.className} text-center text-6xl opacity-0 pb-4 text-black`}>
             {t('arctic.heroLine5')}
        </motion.h2>
      </div>

      {/* SVG filters (unchanged) */}
      <svg className="pointer-events-none absolute h-0 w-0">
        <filter id="idleShimmer">
          <feTurbulence ref={idleTurb} type="turbulence" baseFrequency="0.00015" numOctaves="3" seed="2" />
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