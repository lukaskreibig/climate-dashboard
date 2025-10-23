/*  ──────────────────────────────────────────────────────────
    Outro “Will we listen?” hero – melts background on scroll
    (keeps everything else exactly as in your last snippet)
    ────────────────────────────────────────────────────────── */
"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { useGSAP } from "@gsap/react";
import { motion } from "framer-motion";
import { Bebas_Neue } from "next/font/google";
import { useTranslation } from "react-i18next";

const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin"] });
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

export default function IntroHero() {
  const { t } = useTranslation();

  /* ─── refs ─────────────────────────────────────────────── */
  const wrap     = useRef<HTMLDivElement>(null);
  const photo    = useRef<HTMLImageElement>(null);
  const overlay  = useRef<HTMLDivElement>(null);
  const bgFade   = useRef<HTMLDivElement>(null);
  const block    = useRef<HTMLDivElement>(null);
  const line4    = useRef<HTMLHeadingElement>(null);
  const line5    = useRef<HTMLHeadingElement>(null);
  const line6    = useRef<HTMLHeadingElement>(null);

  /* SVG-filter refs */
  const meltTurb = useRef<SVGFETurbulenceElement>(null);
  const meltDisp = useRef<SVGFEDisplacementMapElement>(null);

  /* ─── GSAP ─────────────────────────────────────────────── */
  useGSAP(() => {
    if (
      !wrap.current ||
      !photo.current ||
      !overlay.current ||
      !bgFade.current ||
      !block.current ||
      !line4.current ||
      !line5.current ||
      !line6.current
    ) {
      return;
    }

    const ctx = gsap.context(() => {
      /* 1️⃣  Main copy timeline (unchanged) */
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger : wrap.current,
          start   : "top top",
          end     : "+=500%",
          scrub   : 0.5,
          pin     : true,
        },
      });

      tl.addLabel("start")
        .to(block.current,   { scale: 1.05, duration: .25, ease: "none" }, "start")
        .to(overlay.current, { opacity: 1,   duration: .15, ease: "none" }, "<")
        /* …rest of your headline anims… */
        .fromTo(line4.current, { opacity: 0, y: 500 }, { opacity: 1, y: 280 })
        .addLabel("sent1")
        .to({}, { duration: .35 })
        .to(line4.current, { opacity: 0, y: -300, filter: "blur(4px)", duration: .20, ease: "power2.out" })
        .fromTo(line5.current, { opacity: 0, y: 500 }, { opacity: 1, y: 220 }, "<")
        .addLabel("sent2")
        .to({}, { duration: .35 })
        .to(photo.current,   { opacity: 1, duration: .15, ease: "none" }, "+=.25")
        .to(overlay.current, { opacity: 0, duration: .15, ease: "none" }, "<")
        .to(line5.current,   { color: "black", duration: .30, ease: "none" }, "<")
        .to(line5.current,   { opacity: 0, y: -300, filter: "blur(4px)", duration: .20, ease: "power2.out" })
        .fromTo(line6.current, { opacity: 0, y: 500 }, { opacity: 1, y: 160 }, "<");


      /* 3️⃣  Giant “Will we listen?” */
      tl.to(line6.current, {
        color: "#000",
        scale: 300,
        y: 3800,
        x: 4000,
        duration: 4,
        ease: "power2.inOut",
        transformOrigin: "center center",
      }) 
      .to(photo.current,
      { scale: 15, duration: 4, ease: "power2.inOut" },
      "<");

      tl.add(() => {
        if (typeof document !== "undefined") {
          gsap.set(document.body, { overflow: "hidden" });
        }
        const outro = document.getElementById("outro");
 if (outro) {
   // Klicks zulassen + sichtbar schalten
   outro.classList.remove("pointer-events-none", "invisible", "opacity-0");
   gsap.fromTo(
     outro,
     { opacity: 0 },
     { opacity: 1, duration: 0.6, ease: "power2.out" }
   );
 }
      });
    }, wrap);

    return () => ctx.revert();
  }, []);

  /* ─── JSX ──────────────────────────────────────────────── */
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

      <div ref={overlay} className="absolute inset-0 bg-slate-500 opacity-0" />
      <div ref={bgFade}  className="absolute inset-0 bg-neutral-950 opacity-0" />

      <div ref={block} className="relative z-10 flex flex-col items-center pt-5 pointer-events-none">
        <motion.h2 ref={line4} className={`${bebasNeue.className} text-6xl opacity-0 text-white`}>
          {t("arctic.heroLine3")}
        </motion.h2>
        <motion.h2 ref={line5} className={`${bebasNeue.className} text-6xl opacity-0 pb-4 text-white`}>
          {t("arctic.heroLine4")}
        </motion.h2>
        <motion.h2 ref={line6} className={`${bebasNeue.className} text-6xl opacity-0 pb-4 text-black`}>
          {t("arctic.heroLine5")}
        </motion.h2>
      </div>

      {/* SVG melt filter – starts pristine */}
      <svg className="pointer-events-none absolute h-0 w-0">
        <filter id="scrollMelt" x="-50%" y="-50%" width="200%" height="200%" filterUnits="objectBoundingBox">
          <feTurbulence
            ref={meltTurb}
            type="turbulence"
            baseFrequency="0"      /* ← no noise initially */
            numOctaves="3"
            seed="7"
            result="turb"
          />
          <feDisplacementMap
            ref={meltDisp}
            in="SourceGraphic"
            in2="turb"
            scale="0"              /* ← zero displacement initially */
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>
    </section>
  );
}
