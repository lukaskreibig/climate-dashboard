"use client";

/* ------------------------------------------------------------------
   ChartScene (v12.6-shiftIntro + progress-attrs)
------------------------------------------------------------------
   • Captions still begin one viewport earlier (v12.4 logic).
   • On first entrance the chart renders *centered*, then slides to
     its computed “left / right / center” position (v12.5).
   • ✨ NEW:  Every <section> now carries
       - data-scene  = cfg.key        ←  used by the progress rail
       - data-title  = first caption  ←  optional tooltip fallback
------------------------------------------------------------------ */

import React, { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

/* ===== transition knobs ===================================== */
const EXIT_STYLE: "fade" | "slide" = "fade";
const EXIT_START = "bottom 130%";
const EXIT_END   = "bottom 90%";
/* ============================================================ */

export interface CaptionCfg {
  html: React.ReactNode;
  captionSide?: "left" | "right";
  at?: number;
  out?: number;
  axesInIdx?: number;
  axesOutIdx?: number;
  helperInIdx?: number;
  helperOutIdx?: number;
}
export interface SceneCfg {
  key: string;
  chart: (d: any, api: React.MutableRefObject<any>) => JSX.Element;
  axesSel: string;
  helperSel?: string;
  captions: CaptionCfg[];
  chartSide?: "left" | "right" | "center" | "fullscreen";
  axesInIdx?: number;
  axesOutIdx?: number;
  helperInIdx?: number;
  helperOutIdx?: number;
  actions?: { captionIdx: number; call: (api?: any) => void }[];
}
export const NO_MATCH = "*:not(*)";

/* tiny util -------------------------------------------------- */
const waitFor = (root: HTMLElement, sel: string) =>
  new Promise<void>((res) => {
    if (sel === NO_MATCH) return res();
    const poll = () =>
      root.querySelector(sel) ? res() : requestAnimationFrame(poll);
    poll();
  });

/* ============================================================ */
export default function ChartScene({
  cfg,
  globalData,
}: {
  cfg: SceneCfg;
  globalData: any;
}) {
  const sec  = useRef<HTMLElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const box  = useRef<HTMLDivElement>(null);
  const api  = useRef<any>(null);
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    if (!sec.current || !wrap.current || !box.current) return;

    const ctx = gsap.context(() => {
      /* ---------- hide other chart layers ------------------- */
      const hideOthers = () =>
        document
          .querySelectorAll<HTMLDivElement>(".chart-layer")
          .forEach((el) => {
            if (el !== wrap.current) el.style.visibility = "hidden";
          });

      /* ---------- initial wrapper state --------------------- */
      gsap.set(wrap.current, { opacity: 1, xPercent: 0, visibility: "hidden" });

      /* ---------- life-cycle visibility --------------------- */
      ScrollTrigger.create({
        trigger: sec.current,
        start : "top bottom",
        end   : "bottom 90%",
        onEnter:     () => { hideOthers(); setMounted(true);  wrap.current!.style.visibility = "visible"; },
        onEnterBack: () => { hideOthers(); wrap.current!.style.visibility = "visible"; },
        onLeave:     () => { wrap.current!.style.visibility = "hidden"; },
        onLeaveBack: () => { wrap.current!.style.visibility = "hidden"; },
      });

      /* ---------- exit tween -------------------------------- */
      gsap.to(wrap.current, {
        ...(EXIT_STYLE === "fade"
          ? { opacity: 0 }
          : { opacity: 0, xPercent: -20 }),
        ease: "none",
        scrollTrigger: {
          trigger: sec.current,
          start : EXIT_START,
          end   : EXIT_END,
          scrub : true,
        },
      });

      /* ---------- helper / axes fades ----------------------- */
      (async () => {
        await waitFor(wrap.current!, cfg.axesSel);
        if (cfg.helperSel) await waitFor(wrap.current!, cfg.helperSel);
        if (cfg.axesSel !== NO_MATCH) gsap.set(cfg.axesSel, { opacity: 0 });
        if (cfg.helperSel)           gsap.set(cfg.helperSel, { opacity: 0 });

        const N   = cfg.captions.length,
              cap = (i:number)=>sec.current!.querySelector<HTMLElement>(`[data-cap-idx="${i}"] .caption-box`)!,
              clamp=(n:number)=>Math.max(0,Math.min(N-1,n));

        const axesIn  = clamp(cfg.axesInIdx   ?? 1);
        const axesOut = cfg.axesOutIdx  ?? N;
        const helpIn  = clamp(cfg.helperInIdx ?? axesIn);
        const helpOut = cfg.helperOutIdx ?? axesOut;

        const fade=(sel:string,v:number)=>gsap.to(sel,{opacity:v,duration:0.4,paused:true});
        const bind=(sel:string,iIn:number,iOut:number)=>{
          ScrollTrigger.create({ trigger: cap(iIn), start:"top 80%", animation: fade(sel,1), toggleActions:"play none none none" });
          if(iOut>=0&&iOut<N){
            ScrollTrigger.create({ trigger: cap(iOut), start:"bottom top", animation: fade(sel,0), toggleActions:"play none reverse none" });
          }
        };
        if(cfg.axesSel!==NO_MATCH) bind(cfg.axesSel, axesIn, axesOut);
        if(cfg.helperSel)          bind(cfg.helperSel, helpIn, helpOut);

        cfg.actions?.forEach(a=>{
          const trg=cap(clamp(a.captionIdx));
          ScrollTrigger.create({
            trigger: trg,
            start: "top 90%",
            onEnter:     ()=>a.call(api.current),
            onEnterBack: ()=>a.call(api.current),
          });
        });
      })();

      /* ---------- chart x-shift helpers --------------------- */
      const CAPTION_MARGIN = 24,
            SHIFT_FACTOR   = 0.6;

      const pxShift = (side: "left" | "right" | "center") => {
        if (!wrap.current || !box.current || side === "center") return 0;
        const wrapW  = wrap.current.clientWidth;
        const boxW   = box.current.clientWidth;
        const gap    = (wrapW - boxW) / 2;
        const capEl  = sec.current?.querySelector<HTMLElement>(".caption-box");
        const capW   = capEl ? capEl.clientWidth : 320;
        const shift  = Math.max(gap * SHIFT_FACTOR, capW / 2 + CAPTION_MARGIN);
        return side === "left" ? -shift : shift;
      };

      /* determine first wanted side -------------------------- */
      const firstSide = cfg.captions.find(c => c.captionSide);
      const explicit  = cfg.chartSide && cfg.chartSide !== "fullscreen"
                          ? cfg.chartSide : undefined;
      let current: "left" | "right" | "center" =
        explicit ??
        (firstSide?.captionSide === "left"
          ? "right"
          : firstSide?.captionSide === "right"
          ? "left"
          : "center");

      /* ---------- intro slide-in (center → side) ------------ */
      gsap.set(box.current, { x: 0 });
      const firstShift = pxShift(current);
      if (firstShift !== 0) {
        gsap.to(box.current, {
          x: firstShift,
          duration: 0.6,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sec.current,
            start: "top 10%",
            once: true,
          },
        });
      }

      /* ---------- subsequent side changes ------------------ */
      cfg.captions.forEach((c, i) => {
        if (!c.captionSide || explicit) return;
        const desired = c.captionSide === "left" ? "right" : "left";
        if (desired === current) return;
        const trg = sec.current!.querySelector<HTMLElement>(`[data-cap-idx="${i}"] .caption-box`)!;
        ScrollTrigger.create({
          trigger: trg,
          start: "top 92%",
          onEnter: () => {
            current = desired;
            gsap.to(box.current, { x: pxShift(desired), duration: 0.5, ease: "power2.out" });
          },
          onLeaveBack: () => {
            current = desired;
            gsap.to(box.current, { x: pxShift(desired), duration: 0.5, ease: "power2.out" });
          },
        });
      });

      /* ---------- caption slide-ins ------------------------- */
      cfg.captions.forEach((c, i) => {
        const el = sec.current!.querySelector<HTMLElement>(`[data-cap-idx="${i}"] .caption-box`);
        if (!el) return;

        const fromX =
          c.captionSide === "left"  ? "-4rem" :
          c.captionSide === "right" ?  "4rem" : "0";

        const fracIn  = (c.at  ?? i * 0.05) - 1;
        const fracOut = (c.out ?? 1.01)     - 1;

        gsap.fromTo(
          el,
          { opacity: 0, x: fromX, y: "4rem" },
          {
            opacity: 1,
            x: 0,
            y: 0,
            ease: "power2.out",
            scrollTrigger: {
              trigger: sec.current,
              start: () => `top+=${window.innerHeight * fracIn} bottom`,
              end:   () => `top+=${window.innerHeight * fracOut} top`,
              scrub: 0.3,
            },
          }
        );
      });
    }, sec);

    return () => ctx.revert();
  }, [cfg]);

  /* ---------- layout helpers -------------------------------- */
  const chartW =
    cfg.chartSide === "fullscreen"
      ? "w-full max-w-none"
      : "w-[90%] sm:w-4/5 md:w-3/5 lg:w-2/3 max-w-[900px]";

  const capFlex = (s?: "left" | "right") =>
    s === "left"
      ? "items-end justify-start pl-10 sm:pl-16 pr-6"
      : s === "right"
      ? "items-end justify-end pr-24 sm:pr-24 pl-6"
      : "items-center justify-center px-6";

  const capText = (s?: "left" | "right") => (s ? "text-left" : "text-center");

  /* ---------- render ---------------------------------------- */
  return (
    <section
      ref={sec}
      className="relative"
      data-scene={cfg.key}
      data-title={
        (cfg.captions[0]?.html as any)?.props?.children?.[0]?.props?.children ??
        cfg.key
      }
    >
      {/* fixed chart layer */}
      <div
        ref={wrap}
        className="chart-layer fixed inset-0 flex items-center justify-center z-10"
      >
        <div ref={box} className={chartW}>
          {mounted ? cfg.chart(globalData, api) : <div className="w-full h-full" />}
        </div>
      </div>

      {/* captions */}
      {cfg.captions.map((c, i) => (
        <div
          key={i}
          data-cap-idx={i}
          className={`relative h-screen flex ${capFlex(c.captionSide)} pointer-events-none z-20`}
        >
          <div
            className={`caption-box max-w-md p-6 bg-white/90 rounded-lg shadow-lg ${capText(
              c.captionSide
            )} text-slate-900`}
          >
            {c.html}
          </div>
        </div>
      ))}

      {/* spacer after last caption */}
      <div className="relative h-screen" />
    </section>
  );
}
