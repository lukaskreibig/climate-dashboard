/* ------------------------------------------------------------------
   ChartScene  (v10.8) — Fix invalid hook call + responsive layout
------------------------------------------------------------------ */
"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

/* ---------- public types ------------------------------------ */
export interface CaptionCfg {
  html: React.ReactNode;
  axesInIdx?: number;
  axesOutIdx?: number;
  helperInIdx?: number;
  helperOutIdx?: number;
  captionSide?: "left" | "right";
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

  /* -----------------------------------------------------------
     1. Fade-in & mount
  ------------------------------------------------------------ */
  useLayoutEffect(() => {
    if (!sec.current || !wrap.current || !box.current) return;

    const ctx = gsap.context(() => {
      /* ---------- entry fade -------------------------------- */
      gsap.set(wrap.current, { opacity: 0, visibility: "hidden" });
      ScrollTrigger.create({
        trigger: sec.current,
        start: "top bottom",
        once: true,
        onEnter: () => {
          setMounted(true);
          gsap.to(wrap.current, {
            opacity: 1,
            visibility: "visible",
            duration: 0.4,
          });
        },
      });

      /* ---------- helper / axes ------------------------------ */
      (async () => {
        await waitFor(wrap.current!, cfg.axesSel);
        if (cfg.helperSel) await waitFor(wrap.current!, cfg.helperSel);

        if (cfg.axesSel !== NO_MATCH) gsap.set(cfg.axesSel, { opacity: 0 });
        if (cfg.helperSel)           gsap.set(cfg.helperSel, { opacity: 0 });

        const N  = cfg.captions.length,
              cl = (n: number) => Math.max(0, Math.min(N - 1, n));
        const ai = cl(cfg.axesInIdx ?? 1),
              ao = cfg.axesOutIdx ?? N,
              hi = cl(cfg.helperInIdx ?? ai),
              ho = cfg.helperOutIdx ?? ao;

        const capBox = (i: number) =>
          sec.current!.querySelector<HTMLElement>(
            `[data-cap-idx="${i}"] .caption-box`
          )!;
        const tw = (sel: string, v: number) =>
          gsap.to(sel, { opacity: v, duration: 0.4, paused: true });
        const IN  = "play none none none",
              OUT = "play none reverse none";

        const bind = (sel: string, iIn: number, iOut: number) => {
          ScrollTrigger.create({
            trigger: capBox(iIn),
            start: "top 80%",
            animation: tw(sel, 1),
            toggleActions: IN,
          });
          if (Number.isFinite(iOut) && iOut >= 0 && iOut < N) {
            ScrollTrigger.create({
              trigger: capBox(iOut),
              start: "bottom top",
              animation: tw(sel, 0),
              toggleActions: OUT,
            });
          }
        };
        if (cfg.axesSel !== NO_MATCH) bind(cfg.axesSel, ai, ao);
        if (cfg.helperSel)            bind(cfg.helperSel, hi, ho);

        

        cfg.actions?.forEach((a) => {
          const trg = capBox(cl(a.captionIdx));
          ScrollTrigger.create({
            trigger: trg,
            start: "top 80%",
            onEnter:     () => a.call(api.current),
            onEnterBack: () => a.call(api.current),
          });
        });
      })();

      /* ---------- auto chart-shift --------------------------- */
      const CAPTION_MARGIN = 24;   // px
      const SHIFT_FACTOR   = 0.6;  // old wide-screen behaviour

      const pxShift = (side: "left" | "right" | "center") => {
        if (!wrap.current || !box.current || side === "center") return 0;

        const wrapW  = wrap.current.clientWidth;
        const boxW   = box.current.clientWidth;
        const gap    = (wrapW - boxW) / 2;

        const captionEl = sec.current?.querySelector<HTMLElement>(".caption-box");
        const capW      = captionEl ? captionEl.clientWidth : 320;

        const baseShift = gap * SHIFT_FACTOR;
        const minShift  = capW / 2 + CAPTION_MARGIN;
        const shift     = Math.max(baseShift, minShift);

        return side === "left" ? -shift : shift;
      };

      const firstSide = cfg.captions.find((c) => c.captionSide);
      const explicit  =
        cfg.chartSide && cfg.chartSide !== "fullscreen" ? cfg.chartSide : undefined;

      let current: "left" | "right" | "center" =
        explicit ??
        (firstSide?.captionSide === "left"
          ? "right"
          : firstSide?.captionSide === "right"
          ? "left"
          : "center");

      gsap.set(box.current, { x: pxShift(current) });

      cfg.captions.forEach((c, i) => {
        if (!c.captionSide || explicit) return;
        const desired = c.captionSide === "left" ? "right" : "left";
        if (desired === current) return;

        const trg = sec.current!.querySelector<HTMLElement>(
          `[data-cap-idx="${i}"] .caption-box`
        )!;
        ScrollTrigger.create({
          trigger: trg,
          start: "top 92%",
          onEnter: () => {
            current = desired;
            gsap.to(box.current, {
              x: pxShift(desired),
              duration: 0.5,
              ease: "power2.out",
            });
          },
          onLeaveBack: () => {
            current = desired;
            gsap.to(box.current, {
              x: pxShift(desired),
              duration: 0.5,
              ease: "power2.out",
            });
          },
        });
      });

      /* ---------- caption slide-ins -------------------------- */
      cfg.captions.forEach((c, i) => {
        if (!c.captionSide) return;
        const el = sec.current!.querySelector<HTMLElement>(
          `[data-cap-idx="${i}"] .caption-box`
        );
        if (!el) return;
        const fromX = c.captionSide === "left" ? "-4rem" : "4rem";
        gsap.fromTo(
          el,
          { opacity: 0, x: fromX, y: "4rem" },
          {
            opacity: 1,
            x: 0,
            y: 0,
            duration: 0.6,
            ease: "power2.out",
            scrollTrigger: {
              trigger: el,
              start: "top 92%",
              toggleActions: "play none none reverse",
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
      ? "items-end justify-end pr-10 sm:pr-16 pl-6"
      : "items-center justify-center px-6";
  const capText = (s?: "left" | "right") => (s ? "text-left" : "text-center");

  /* ---------- render ---------------------------------------- */
  return (
    <section ref={sec} className="relative">
      {/* sticky chart block */}
      <div
        ref={wrap}
        className="sticky top-0 h-screen flex items-center justify-center bg-slate-100 z-10"
      >
        <div ref={box} className={chartW}>
          {mounted ? cfg.chart(globalData, api) : <div className="w-full h-full" />}
        </div>
      </div>

      {/* scrolling captions */}
      {cfg.captions.map((c, i) => (
        <div
          key={i}
          data-cap-idx={i}
          className={`relative h-screen flex ${capFlex(
            c.captionSide
          )} pointer-events-none z-20`}
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

      {/* empty spacer to scroll past last caption */}
      <div className="relative h-screen" />
    </section>
  );
}
