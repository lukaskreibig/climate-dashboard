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
const PROGRESS_GUTTER_VAR = "var(--progress-gutter, 0px)";
const MIN_CHART_WIDTH = 520;
const MAX_CHART_WIDTH = 960;
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
  chart: (d: any, api: MutableRefObject<any>) => React.ReactElement;
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

const useIsCompact = () => {
  const [compact, setCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 1023px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 1023px)");
    const handler = (event: MediaQueryListEvent) => setCompact(event.matches);
    setCompact(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return compact;
};

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
  const isCompact = useIsCompact();
  const [needsStack, setNeedsStack] = useState(false);
  const [chartMaxWidth, setChartMaxWidth] = useState(() => MAX_CHART_WIDTH);
  const [layoutBounds, setLayoutBounds] = useState(() => ({
    wrapWidth: 0,
    maxCaptionWidth: 0,
    availableWidth: MAX_CHART_WIDTH,
  }));
  const baseStack = isCompact || needsStack;
  const stackLayout = cfg.chartSide === "fullscreen" ? false : baseStack;

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

  useLayoutEffect(() => {
    if (!wrap.current || !sec.current) return;

    const calculate = () => {
      if (!wrap.current || !sec.current) return;

      const wrapWidth = wrap.current.clientWidth;
      const chartTarget = Math.min(
        Math.max(wrapWidth * 0.58, MIN_CHART_WIDTH),
        MAX_CHART_WIDTH
      );

      const captions = Array.from(
        sec.current.querySelectorAll<HTMLElement>("[data-cap-idx] .caption-box")
      );
      if (!captions.length) {
        setNeedsStack(false);
        setChartMaxWidth((prev) =>
          Math.abs(prev - chartTarget) > 1 ? chartTarget : prev
        );
        setLayoutBounds({
          wrapWidth,
          maxCaptionWidth: 0,
          availableWidth: chartTarget,
        });
        return;
      }
      const maxCaptionWidth = captions.reduce(
        (acc, el) => Math.max(acc, el.getBoundingClientRect().width),
        0
      );
      const style = getComputedStyle(document.documentElement);
      const gutterRaw = style.getPropertyValue("--progress-gutter");
      const gutter = gutterRaw ? parseFloat(gutterRaw) || 0 : 0;
      const safetyGap = Math.max(160, wrapWidth * 0.08);
      const availableForChart = wrapWidth - (maxCaptionWidth + gutter + safetyGap);
      const shouldStack = availableForChart < MIN_CHART_WIDTH * 0.8;

      if (shouldStack) {
        setNeedsStack(true);
        const stackedWidth = Math.min(
          Math.max(wrapWidth * 0.82, MIN_CHART_WIDTH),
          MAX_CHART_WIDTH
        );
        setChartMaxWidth((prev) =>
          Math.abs(prev - stackedWidth) > 1 ? stackedWidth : prev
        );
        setLayoutBounds({
          wrapWidth,
          maxCaptionWidth,
          availableWidth: stackedWidth,
        });
        return;
      }

      const nextWidth = Math.min(
        chartTarget,
        Math.max(availableForChart, MIN_CHART_WIDTH)
      );

      setNeedsStack(false);
      setChartMaxWidth((prev) =>
        Math.abs(prev - nextWidth) > 1 ? nextWidth : prev
      );
      setLayoutBounds({
        wrapWidth,
        maxCaptionWidth,
        availableWidth: nextWidth,
      });
    };

    calculate();

    let frameId = 0;
    const handleResize = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(calculate);
    };

    window.addEventListener("resize", handleResize);
    const observer = new ResizeObserver(handleResize);
    observer.observe(wrap.current);

    const captionNodes = Array.from(
      sec.current?.querySelectorAll<HTMLElement>("[data-cap-idx] .caption-box") ?? []
    );
    captionNodes.forEach((node) => observer.observe(node));

    return () => {
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [cfg.captions.length]);

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

    const ctx = gsap.context((context) => {
      /* ---------- hide other chart layers ------------------- */
      const hideOthers = () =>
        document.querySelectorAll<HTMLDivElement>(".chart-layer").forEach(
          (el) => {
            if (!wrap.current || el !== wrap.current) el.style.visibility = "hidden";
          }
        );

      if (!wrap.current) return;
      gsap.set(wrap.current, { opacity: 1, xPercent: 0, visibility: "hidden" });

      ScrollTrigger.create({
        trigger: sec.current,
        start: "top bottom",
        end: "bottom 90%",
        onEnter: () => {
          const wrapEl = wrap.current;
          if (!wrapEl) return;
          hideOthers();
          ensureMounted();
          wrapEl.style.visibility = "visible";
          api.current?.showStage?.(0);
        },
        onEnterBack: () => {
          const wrapEl = wrap.current;
          if (!wrapEl) return;
          hideOthers();
          ensureMounted();
          wrapEl.style.visibility = "visible";
          api.current?.showStage?.(0);
        },
        onLeave: () => {
          if (wrap.current) wrap.current.style.visibility = "hidden";
        },
        onLeaveBack: () => {
          if (wrap.current) wrap.current.style.visibility = "hidden";
        },
      });

      /* ---------- vertikale Bewegung ------------------------ */
      const sectionEl = sec.current;
      if (!sectionEl) return;
      const firstCap = sectionEl.querySelector<HTMLElement>(
        '[data-cap-idx="0"]'
      );
      const lastCap = sectionEl.querySelector<HTMLElement>(
        `[data-cap-idx="${cfg.captions.length - 1}"]`
      );
      if (!firstCap || !lastCap) return;

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

      if (cfg.parallax !== false && CHART_PARALLAX && box.current) {
        gsap.fromTo(
          box.current,
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
  const wrapEl = wrap.current;
  const sectionElAsync = sec.current;
  if (!wrapEl || !sectionElAsync) return;

  await waitFor(wrapEl, cfg.axesSel);
  if (cfg.helperSel) await waitFor(wrapEl, cfg.helperSel);

  /* ▸▸ nur Elemente dieser Szene selektieren ◂◂ */
  const axesEls =
    cfg.axesSel === NO_MATCH
      ? ([] as HTMLElement[])
      : Array.from(wrapEl.querySelectorAll<HTMLElement>(cfg.axesSel));
  const helperEls = cfg.helperSel
    ? Array.from(wrapEl.querySelectorAll<HTMLElement>(cfg.helperSel))
    : ([] as HTMLElement[]);

  /* anfangs verbergen – nur lokale Nodes, nicht global! */
  gsap.set(axesEls, { opacity: 0 });
  gsap.set(helperEls, { opacity: 0 });

  const N      = cfg.captions.length;
  const capEl  = (i: number) =>
    sectionElAsync.querySelector<HTMLElement>(`[data-cap-idx="${i}"] .caption-box`);
  const clamp  = (n: number) => Math.max(0, Math.min(N - 1, n));

  const axesIn  = clamp(cfg.axesInIdx   ?? 1);
  const axesOut = cfg.axesOutIdx        ?? N;
  const helpIn  = clamp(cfg.helperInIdx ?? axesIn);
  const helpOut = cfg.helperOutIdx      ?? axesOut;

  const fade = (els: HTMLElement[], v: number) =>
    gsap.to(els, { opacity: v, duration: 0.4, paused: true });

  const bind = (
    els: HTMLElement[],
    iIn: number,
    iOut: number
  ) => {
    const triggerIn = capEl(iIn);
    if (!triggerIn) return;

    ScrollTrigger.create({
      trigger : triggerIn,
      start   : "top 80%",
      animation: fade(els, 1),
      toggleActions: "play none none none",
    });
    if (iOut >= 0 && iOut < N) {
      const triggerOut = capEl(iOut);
      if (triggerOut) {
        ScrollTrigger.create({
          trigger : triggerOut,
          start   : "bottom top",
          animation: fade(els, 0),
          toggleActions: "play none reverse none",
        });
      }
    }
  };

  if (axesEls.length)   bind(axesEls,   axesIn,  axesOut);
  if (helperEls.length) bind(helperEls, helpIn,  helpOut);

  /* evtl. benutzerdefinierte Aktionen der Szene -------------- */
  cfg.actions?.forEach(a => {
    const trg = capEl(clamp(a.captionIdx));
    if (!trg) return;
    ScrollTrigger.create({
      trigger : trg,
      start   : "top 90%",
      onEnter      : () => a.call(api.current),
      onEnterBack  : () => a.call(api.current),
    });
  });
    })();

      /* ─── chart x-shift helpers (zurück-geholt) ─────────── */
      const firstSide = cfg.captions.find((c) => c.captionSide);
      const effectiveSide = cfg.chartSide ?? firstSide?.captionSide ?? "center";
      const canShift = !stackLayout && effectiveSide !== "fullscreen";
      if (canShift) {
        const CAPTION_MARGIN = 0;
        const SHIFT_FACTOR = 0.6;

        const findCaptionForSide = (side: "left" | "right") => {
          const idx = cfg.captions.findIndex((c) => c.captionSide === side);
          if (idx === -1) return null;
          return (
            sec.current?.querySelector<HTMLElement>(
              `[data-cap-idx="${idx}"] .caption-box`
            ) ?? null
          );
        };

        const oppositeFor = (dir: "left" | "right" | "center") =>
          dir === "left" ? "right" : dir === "right" ? "left" : null;

        const captionForDirection = (dir: "left" | "right" | "center") => {
          const opposite = oppositeFor(dir);
          if (!opposite) return null;
          return findCaptionForSide(opposite);
        };

        const pxShift = (
          direction: "left" | "right" | "center",
          activeCaption?: HTMLElement | null
        ) => {
          if (!wrap.current || !box.current || stackLayout || direction === "center")
            return 0;

          const wrapW = wrap.current.clientWidth;
          const boxW = box.current.clientWidth;
          const gap = (wrapW - boxW) / 2;
          const candidate =
            activeCaption ??
            captionForDirection(direction) ??
            sec.current?.querySelector<HTMLElement>(".caption-box");

          const capW = candidate
            ? candidate.getBoundingClientRect().width
            : layoutBounds.maxCaptionWidth || 320;
          const shift = Math.max(gap * SHIFT_FACTOR, capW / 2 + CAPTION_MARGIN);
          const rootStyle = getComputedStyle(document.documentElement);
          const gutter =
            parseFloat(rootStyle.getPropertyValue("--progress-gutter")) || 0;
          const desired = direction === "left" ? -shift : shift;

          const leftLimit = Math.max(48, wrapW * 0.05);
          const rightLimit = wrapW - Math.max(gutter + 160, wrapW * 0.12);

          let newLeft = gap + desired;
          let newRight = newLeft + boxW;
          let adjusted = desired;

          if (newLeft < leftLimit) {
            const delta = leftLimit - newLeft;
            adjusted += delta;
            newLeft += delta;
            newRight += delta;
          }

          if (newRight > rightLimit) {
            const delta = newRight - rightLimit;
            adjusted -= delta;
          }

          return adjusted;
        };

        const explicit =
          cfg.chartSide && cfg.chartSide !== "fullscreen"
            ? (cfg.chartSide as "left" | "right" | "center")
            : undefined;
        let current: "left" | "right" | "center" =
          explicit ??
          (effectiveSide === "left"
            ? "right"
            : effectiveSide === "right"
            ? "left"
            : "center");

        if (!box.current) return;
        let lastShift = 0;

        const updateChartPosition = (
          direction: "left" | "right" | "center",
          captionEl?: HTMLElement | null,
          opts?: { immediate?: boolean; duration?: number }
        ) => {
          if (!box.current) return 0;
          let target = pxShift(direction, captionEl);
          const immediate = opts?.immediate ?? false;

          if (wrap.current) {
            const prevShift = lastShift;
            const bufferBase = CAPTION_MARGIN * 2 + 24;

            gsap.set(box.current, { x: target });
            const chartRect = box.current.getBoundingClientRect();
            const wrapRect = wrap.current.getBoundingClientRect();
            const rootStyle = getComputedStyle(document.documentElement);
            const gutter =
              parseFloat(rootStyle.getPropertyValue("--progress-gutter")) || 0;

            const captionRect = captionEl?.getBoundingClientRect();
            let safeLeft = wrapRect.left + Math.max(96, CAPTION_MARGIN * 3);
            let safeRight =
              wrapRect.right - Math.max(gutter + CAPTION_MARGIN * 3.5, 180);
            const captionBuffer = bufferBase;

            if (direction === "left" && captionRect) {
              safeRight = Math.min(safeRight, captionRect.left - captionBuffer);
            } else if (direction === "right" && captionRect) {
              safeLeft = Math.max(safeLeft, captionRect.right + captionBuffer);
            }

            if (chartRect.left < safeLeft) {
              target += safeLeft - chartRect.left;
            }
            if (chartRect.right > safeRight) {
              target -= chartRect.right - safeRight;
            }

            gsap.set(box.current, { x: prevShift });
          }

          lastShift = target;

          if (immediate) {
            gsap.set(box.current, { x: target });
          } else {
            gsap.to(box.current, {
              x: target,
              duration: opts?.duration ?? 0.6,
              ease: "power2.out",
            });
          }

          return target;
        };

        gsap.set(box.current, { x: 0 });
        lastShift = 0;

        const initialTrigger = ScrollTrigger.create({
          trigger: sec.current,
          start: "top 10%",
          once: true,
          onEnter: () => {
            const captionEl = captionForDirection(current);
            updateChartPosition(current, captionEl);
          },
          onEnterBack: () => {
            const captionEl = captionForDirection(current);
            updateChartPosition(current, captionEl);
          },
        });
        context.add(() => initialTrigger.kill());

        const refreshHandler = () => {
          const captionEl = captionForDirection(current);
          updateChartPosition(current, captionEl, { immediate: true });
        };
        ScrollTrigger.addEventListener("refresh", refreshHandler);
        context.add(() => ScrollTrigger.removeEventListener("refresh", refreshHandler));

        ScrollTrigger.create({
          trigger: sec.current,
          start: "top bottom",
          end: "bottom top",
          onEnter: () => {
            const captionEl = captionForDirection(current);
            updateChartPosition(current, captionEl);
          },
          onEnterBack: () => {
            const captionEl = captionForDirection(current);
            updateChartPosition(current, captionEl);
          },
        });

        cfg.captions.forEach((c, i) => {
          if (!c.captionSide || explicit) return;
          const desired = c.captionSide === "left" ? "right" : "left";
          if (desired === current) return;
          const trg = sec
            .current?.querySelector<HTMLElement>(`[data-cap-idx="${i}"] .caption-box`);
          if (!trg) return;
          ScrollTrigger.create({
            trigger: trg,
            start: "top 92%",
            invalidateOnRefresh: true,
            onEnter: () => {
              if (!box.current) return;
              current = desired;
              updateChartPosition(desired, trg);
            },
            onLeaveBack: () => {
              if (!box.current) return;
              current = desired;
              updateChartPosition(desired, trg);
            },
          });
        });
      } else {
        if (box.current) gsap.set(box.current, { x: 0 });
      }

      /* ---------- caption slide-ins (unverändert) ----------- */
      cfg.captions.forEach((c, i) => {
        const el = sec
          .current?.querySelector<HTMLElement>(`[data-cap-idx="${i}"] .caption-box`);
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
  }, [cfg, ensureMounted, stackLayout]);

  /* ---------- helpers -------------------------------------- */
  const chartW =
    cfg.chartSide === "fullscreen"
      ? "w-full h-screen max-w-none"
      : "w-full";

  const chartStyle =
    cfg.chartSide === "fullscreen"
      ? undefined
      : stackLayout
      ? {
          width: `min(92vw, ${chartMaxWidth}px)`,
          maxWidth: `${chartMaxWidth}px`,
          margin: "0 auto",
        }
      : {
          width: `${chartMaxWidth}px`,
          maxWidth: "100%",
        };

  const capFlex = (s?: "left" | "right") => {
    if (stackLayout) return "items-start justify-center px-4";
    return s === "left"
      ? "items-end justify-start pl-[clamp(2.5rem,7vw,8rem)] pr-[clamp(1.5rem,5vw,4rem)]"
      : s === "right"
      ? "items-end justify-end   pr-[clamp(6.5rem,9vw,12rem)] pl-[clamp(2rem,6vw,6rem)]"
      : "items-center justify-center px-6";
  };

  const capText = (s?: "left" | "right") => (s ? "text-left" : "text-center");

  const captionStyle = (side?: "left" | "right"): React.CSSProperties => {
    if (stackLayout) {
      return {
        maxWidth: "min(92vw, 520px)",
        margin: "1.5rem auto 0",
      };
    }

    if (!side) {
      return {
        maxWidth: cfg.wide ? "min(48rem, 85vw)" : "min(36rem, 78vw)",
        margin: "0 auto",
      };
    }

    if (side === "right") {
      return {
        maxWidth: "clamp(260px, 32vw, 420px)",
        marginLeft: "clamp(3.5rem, 7vw, 9rem)",
      };
    }

    return {
      maxWidth: "clamp(260px, 32vw, 420px)",
      marginRight: "clamp(3.5rem, 7vw, 10.5rem)",
    };
  };
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
        className={`chart-layer fixed inset-0 flex z-10 ${
          stackLayout ? "items-start justify-center pt-[min(12vh,5rem)]" : "items-center justify-center"
        }`}
      >
        <div ref={box} className={chartW} style={chartStyle}>
          {mounted ? cfg.chart(globalData, api) : <div className="w-full h-full" />}
        </div>
      </div>

      {/* captions */}
      {cfg.captions.map((c, i) => {
        const content = c.html;
        const empty = (() => {
          if (content === null || content === undefined) return true;
          if (!React.isValidElement(content)) return false;
          const props = content.props as { children?: React.ReactNode };
          return React.Children.count(props.children ?? null) === 0;
        })();

        const defaultBoxClass = cfg.plainCaptions
          ? `caption-box ${
              cfg.wide ? "max-w-3xl lg:max-w-4xl" : "max-w-md"
            } px-4 ${capText(c.captionSide)} text-slate-900 drop-shadow-lg`
          : `caption-box ${
              cfg.wide ? "max-w-3xl lg:max-w-4xl" : "max-w-md"
            } p-6 bg-white/90 rounded-lg shadow-lg ${capText(
              c.captionSide
            )} text-slate-900`;

        const stackedBoxClass = [
          "caption-box",
          c.boxClass,
          capText(c.captionSide),
          "w-full max-w-xl sm:max-w-2xl",
          "p-5 sm:p-6 lg:p-7",
          "bg-white/95 backdrop-blur-lg",
          "rounded-2xl shadow-2xl ring-1 ring-white/50",
          "text-slate-900"
        ]
          .filter(Boolean)
          .join(" ");

        const hiddenBoxClass =
          "caption-box p-0 bg-transparent shadow-none opacity-0";

        const finalClass = empty
          ? hiddenBoxClass
          : stackLayout
          ? stackedBoxClass
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
            <div
              className={`pointer-events-auto ${finalClass}`}
              style={captionStyle(c.captionSide)}
            >
              {c.html}
            </div>
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
