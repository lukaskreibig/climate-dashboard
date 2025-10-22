/* ------------------------------------------------------------------
   ChartScene.tsx   (per-scene snow toggle + x-shift restore)  v3
------------------------------------------------------------------ */
"use client";

import React, {
  useLayoutEffect,
  useRef,
  useState,
  MutableRefObject,
  useEffect,
  useCallback,
} from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

import { SnowApi } from "@/components/ArcticBackgroundSystem";

/* ===== tweakables =========================================== */
const CHART_PARALLAX = 0.12;
/* ============================================================ */

/* ---------- TYPES ------------------------------------------- */
export interface CaptionCfg {
  html: React.ReactNode;
  captionSide?: "left" | "right";
  boxClass?: string;
  at?: number;
  out?: number;
  axesInIdx?: number;
  axesOutIdx?: number;
  helperInIdx?: number;
  helperOutIdx?: number;
}

export interface SceneCfg {
  key: string;
  chart: (d: any, api: MutableRefObject<any>) => JSX.Element;
  axesSel: string;
  helperSel?: string;
  captions: CaptionCfg[];
  chartSide?: "left" | "right" | "center" | "fullscreen";
  wide?: boolean;
  parallax?: boolean;
  plainCaptions?: boolean;
  axesInIdx?: number;
  axesOutIdx?: number;
  helperInIdx?: number;
  helperOutIdx?: number;
  actions?: { captionIdx: number; call: (api?: any) => void }[];
  scrollScreens?: number;
  slideIn?: boolean;
  slideUp?: boolean;
  fadeIn?: boolean;
  fadeOut?: boolean;
  bgClass?: string;
  bgColor?: string;
  progressPoint?: boolean;

  /** whether the snow layer should be visible (default true) */
  snow?: boolean;
  /** pre-mount chart this many pixels before the scene enters view */
  prefetchMarginPx?: number;
}

export const NO_MATCH = "*:not(*)";

/* tiny util – waits for lazy-loaded elements ----------------- */
const waitFor = (root: HTMLElement, sel: string) =>
  new Promise<void>((res) => {
    if (sel === NO_MATCH) return res();
    const loop = () =>
      root.querySelector(sel) ? res() : requestAnimationFrame(loop);
    loop();
  });

/* ============================================================ */
interface Props {
  cfg: SceneCfg;
  globalData: any;
  /** reference to the snow layer so we can fade it */
  snowRef?: MutableRefObject<SnowApi | null>;
}

export default function ChartScene({ cfg, globalData, snowRef }: Props) {
  const sec = useRef<HTMLElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const api = useRef<any>(null);
  const [mounted, setMounted] = useState(false);
  const hasMounted = useRef(false);

  const fadeIn = !!cfg.fadeIn;
  const fadeOut = !!cfg.fadeOut;
  const slideIn = fadeIn ? false : cfg.slideIn !== false;
  const slideUp = fadeOut ? false : cfg.slideUp !== false;

  const ensureMounted = useCallback(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      setMounted(true);
    }
  }, []);

  /* ─────────────────── prefetch / pre-mount ───────────────────── */
  useEffect(() => {
    if (!cfg.prefetchMarginPx) return;
    if (hasMounted.current) return;
    if (!sec.current) return;

    if (typeof IntersectionObserver === "undefined") {
      ensureMounted();
      return;
    }

    const margin = cfg.prefetchMarginPx;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            ensureMounted();
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: `${margin}px 0px ${margin}px 0px`,
        threshold: 0,
      }
    );

    observer.observe(sec.current);

    return () => observer.disconnect();
  }, [cfg.prefetchMarginPx, ensureMounted]);

  /* ─────────────────── SNOW TOGGLE ─────────────────────── */
  useEffect(() => {
    if (!snowRef?.current) return;
    if (typeof cfg.snow === "undefined") return;

    const desired = cfg.snow;
    if (!sec.current) return;

    const st = ScrollTrigger.create({
      trigger: sec.current,
      start: "top bottom",
      end: "bottom top",
      onEnter: () => snowRef.current!.fadeTo(desired),
      onEnterBack: () => snowRef.current!.fadeTo(desired),
      onLeave: () => snowRef.current!.fadeTo(true),
      onLeaveBack: () => snowRef.current!.fadeTo(true),
    });

    return () => st.kill();
  }, [cfg.snow, snowRef]);

  /* ────────────────────────────────────────────────────────── */
  useLayoutEffect(() => {
    if (!sec.current || !wrap.current || !box.current) return;

    const ctx = gsap.context(() => {
      /* ---------- hide other chart layers ------------------- */
      const hideOthers = () =>
        document.querySelectorAll<HTMLDivElement>(".chart-layer").forEach(
          (el) => {
            if (el !== wrap.current) el.style.visibility = "hidden";
          }
        );

      gsap.set(wrap.current, { opacity: 1, xPercent: 0, visibility: "hidden" });

      ScrollTrigger.create({
        trigger: sec.current,
        start: "top bottom",
        end: "bottom 90%",
        onEnter: () => {
          hideOthers();
          ensureMounted();
          wrap.current!.style.visibility = "visible";
          api.current?.showStage?.(0);
        },
        onEnterBack: () => {
          hideOthers();
          ensureMounted();
          wrap.current!.style.visibility = "visible";
          api.current?.showStage?.(0);
        },
        onLeave: () => {
          wrap.current!.style.visibility = "hidden";
        },
        onLeaveBack: () => {
          wrap.current!.style.visibility = "hidden";
        },
      });

      /* ---------- vertikale Bewegung ------------------------ */
      const firstCap =
        sec.current!.querySelector<HTMLElement>('[data-cap-idx="0"]')!;
      const lastCap = sec.current!.querySelector<HTMLElement>(
        `[data-cap-idx="${cfg.captions.length - 1}"]`
      )!;

      const extraScreens = (cfg.scrollScreens ?? 1) - 1;
      const extraEndOffset = () =>
        `bottom+=${extraScreens * window.innerHeight} top`;

      if (fadeIn) {
        gsap.fromTo(
          box.current,
          { opacity: 0 },
          {
            opacity: 1,
            ease: "none",
            scrollTrigger: {
              trigger: firstCap,
              start: "top bottom",
              end: "top 60%",
              scrub: true,
            },
          }
        );
        gsap.set(box.current, { yPercent: 0 });
      } else if (slideIn) {
        gsap.fromTo(
          box.current,
          { yPercent: 150 },
          {
            yPercent: 0,
            ease: "none",
            scrollTrigger: {
              trigger: firstCap,
              start: "top bottom",
              end: "top 60%",
              scrub: true,
            },
          }
        );
      } else {
        gsap.set(box.current, { yPercent: 0 });
      }

      if (cfg.parallax !== false && CHART_PARALLAX) {
        gsap.fromTo(
          box.current!,
          { y: () => window.innerHeight * CHART_PARALLAX },
          {
            y: () => -window.innerHeight * CHART_PARALLAX,
            ease: "none",
            scrollTrigger: {
              trigger: sec.current,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          }
        );
      }

      if (fadeOut) {
        gsap.fromTo(
          box.current,
          { opacity: 1 },
          {
            opacity: 0,
            ease: "none",
            scrollTrigger: {
              trigger: lastCap,
              start: "bottom 50%",
              end: extraEndOffset,
              scrub: true,
            },
          }
        );
      } else if (slideUp) {
        gsap.fromTo(
          box.current,
          { yPercent: 0 },
          {
            yPercent: -120,
            ease: "none",
            scrollTrigger: {
              trigger: lastCap,
              start: "bottom 50%",
              end: extraEndOffset,
              scrub: true,
            },
          }
        );
      }

      /* ---------- axes / helper fades ----------------------- */
      /* ---------- axes / helper fades ----------------------- */
(async () => {
  await waitFor(wrap.current!, cfg.axesSel);
  if (cfg.helperSel) await waitFor(wrap.current!, cfg.helperSel);

  /* ▸▸ nur Elemente dieser Szene selektieren ◂◂ */
  const axesEls =
    cfg.axesSel === NO_MATCH ? [] : wrap.current!.querySelectorAll(cfg.axesSel);
  const helperEls = cfg.helperSel
    ? wrap.current!.querySelectorAll(cfg.helperSel)
    : [];

  /* anfangs verbergen – nur lokale Nodes, nicht global! */
  gsap.set(axesEls,   { opacity: 0 });
  gsap.set(helperEls, { opacity: 0 });

  const N      = cfg.captions.length;
  const capEl  = (i: number) =>
    sec.current!.querySelector<HTMLElement>(`[data-cap-idx="${i}"] .caption-box`)!;
  const clamp  = (n: number) => Math.max(0, Math.min(N - 1, n));

  const axesIn  = clamp(cfg.axesInIdx   ?? 1);
  const axesOut = cfg.axesOutIdx        ?? N;
  const helpIn  = clamp(cfg.helperInIdx ?? axesIn);
  const helpOut = cfg.helperOutIdx      ?? axesOut;

  const fade = (els: NodeListOf<HTMLElement>, v: number) =>
    gsap.to(els, { opacity: v, duration: 0.4, paused: true });

  const bind = (
    els: NodeListOf<HTMLElement>,
    iIn: number,
    iOut: number
  ) => {
    ScrollTrigger.create({
      trigger : capEl(iIn),
      start   : "top 80%",
      animation: fade(els, 1),
      toggleActions: "play none none none",
    });
    if (iOut >= 0 && iOut < N) {
      ScrollTrigger.create({
        trigger : capEl(iOut),
        start   : "bottom top",
        animation: fade(els, 0),
        toggleActions: "play none reverse none",
      });
    }
  };

  if (axesEls.length)   bind(axesEls,   axesIn,  axesOut);
  if (helperEls.length) bind(helperEls, helpIn,  helpOut);

  /* evtl. benutzerdefinierte Aktionen der Szene -------------- */
  cfg.actions?.forEach(a => {
    const trg = capEl(clamp(a.captionIdx));
    ScrollTrigger.create({
      trigger : trg,
      start   : "top 90%",
      onEnter      : () => a.call(api.current),
      onEnterBack  : () => a.call(api.current),
    });
  });
})();

      /* ─── chart x-shift helpers (zurück-geholt) ─────────── */
      if (cfg.chartSide !== "fullscreen") {
        const CAPTION_MARGIN = 24;
        const SHIFT_FACTOR = 0.6;

        const pxShift = (side: "left" | "right" | "center") => {
          if (!wrap.current || !box.current || side === "center") return 0;
          const wrapW = wrap.current.clientWidth;
          const boxW = box.current.clientWidth;
          const gap = (wrapW - boxW) / 2;
          const cap = sec.current?.querySelector<HTMLElement>(".caption-box");
          const capW = cap ? cap.clientWidth : 320;
          const shift = Math.max(gap * SHIFT_FACTOR, capW / 2 + CAPTION_MARGIN);
          return side === "left" ? -shift : shift;
        };

        const firstSide = cfg.captions.find((c) => c.captionSide);
        const explicit =
          cfg.chartSide && cfg.chartSide !== "fullscreen"
            ? cfg.chartSide
            : undefined;
        let current: "left" | "right" | "center" =
          explicit ??
          (firstSide?.captionSide === "left"
            ? "right"
            : firstSide?.captionSide === "right"
            ? "left"
            : "center");

        gsap.set(box.current, { x: 0 });
        const firstShift = pxShift(current);
        if (firstShift !== 0) {
          gsap.to(box.current, {
            x: firstShift,
            duration: 0.6,
            ease: "power2.out",
            scrollTrigger: { trigger: sec.current, start: "top 10%", once: true },
          });
        }

        cfg.captions.forEach((c, i) => {
          if (!c.captionSide || explicit) return;
          const desired = c.captionSide === "left" ? "right" : "left";
          if (desired === current) return;
          const trg = sec
            .current!.querySelector<HTMLElement>(`[data-cap-idx="${i}"] .caption-box`)!;
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
      }

      /* ---------- caption slide-ins (unverändert) ----------- */
      cfg.captions.forEach((c, i) => {
        const el = sec
          .current!.querySelector<HTMLElement>(`[data-cap-idx="${i}"] .caption-box`);
        if (!el) return;
        const fromX =
          c.captionSide === "left"
            ? "-4rem"
            : c.captionSide === "right"
            ? "4rem"
            : "0rem";
        const fracIn = (c.at ?? i * 0.05) - 1;
        const fracOut = (c.out ?? 1.01) - 1;
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
              start: () =>
                "top+=" + window.innerHeight * fracIn + " bottom",
              end: () => "top+=" + window.innerHeight * fracOut + " top",
              scrub: 0.3,
            },
          }
        );
      });
    }, sec);

    return () => ctx.revert();
  }, [cfg, ensureMounted]);

  /* ---------- helpers -------------------------------------- */
  const chartW =
    cfg.chartSide === "fullscreen"
      ? "w-full h-screen max-w-none"
      : "w-[90%] sm:w-4/5 md:w-3/5 lg:w-2/3 max-w-[900px]";

  const capFlex = (s?: "left" | "right") =>
    s === "left"
      ? "items-end justify-start pl-10 sm:pl-16 pr-6"
      : s === "right"
      ? "items-end justify-end   pr-24 sm:pr-24 pl-6"
      : "items-center justify-center px-6";

  const capText = (s?: "left" | "right") => (s ? "text-left" : "text-center");
  /* ---------- render --------------------------------------- */
  return (
    <section
      ref={sec}
      className={`relative ${cfg.bgClass ?? ""}`}
      style={cfg.bgColor ? { background: cfg.bgColor } : undefined}
      data-scene={cfg.key}
      data-progress={cfg.progressPoint ? "true" : undefined}
      data-title={
        (cfg.captions[0]?.html as any)?.props?.children?.[0]?.props?.children ??
        cfg.key
      }
    >
      {/* sticky chart layer */}
      <div
        ref={wrap}
        className="chart-layer fixed inset-0 flex items-center justify-center z-10"
      >
        <div ref={box} className={chartW}>
          {mounted ? cfg.chart(globalData, api) : <div className="w-full h-full" />}
        </div>
      </div>

      {/* captions */}
      {cfg.captions.map((c, i) => {
        const empty =
          !c.html ||
          (React.isValidElement(c.html) &&
            React.Children.count(c.html.props.children) === 0);

        const defaultBoxClass = cfg.plainCaptions
          ? `caption-box ${
              cfg.wide ? "max-w-3xl lg:max-w-4xl" : "max-w-md"
            } px-4 ${capText(c.captionSide)} text-slate-900 drop-shadow-lg`
          : `caption-box ${
              cfg.wide ? "max-w-3xl lg:max-w-4xl" : "max-w-md"
            } p-6 bg-white/90 rounded-lg shadow-lg ${capText(
              c.captionSide
            )} text-slate-900`;

        const hiddenBoxClass =
          "caption-box p-0 bg-transparent shadow-none opacity-0";

        const finalClass = empty
          ? hiddenBoxClass
          : c.boxClass
          ? `${c.boxClass} ${capText(c.captionSide)}`
          : defaultBoxClass;

        return (
          <div
            key={i}
            data-cap-idx={i}
            className={`relative h-screen flex ${capFlex(
              c.captionSide
            )} pointer-events-none z-20`}
          >
            <div className={`pointer-events-auto ${finalClass}`}>{c.html}</div>
          </div>
        );
      })}

      {/* spacer after last caption */}
      {Array.from({ length: cfg.scrollScreens ?? 1 }).map((_, i) => (
        <div key={`spacer-${i}`} className="relative h-screen" />
      ))}
    </section>
  );
}
