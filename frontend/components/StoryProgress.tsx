"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

/* helpers */
const pageTop = (el: HTMLElement) => el.getBoundingClientRect().top + scrollY;
const pageBot = (el: HTMLElement) => el.getBoundingClientRect().bottom + scrollY;

/* types */
interface Waypoint {
  key: string;
  title: string;
  el: HTMLElement;
  f: number; // 0-1
}

export default function StoryProgress() {
  const container = useRef<HTMLDivElement>(null);
  const track     = useRef<HTMLDivElement>(null);
  const fill      = useRef<HTMLDivElement>(null);
  const knob      = useRef<HTMLDivElement>(null);

  const [points, setPoints] = useState<Waypoint[]>([]);
  const pointsRef           = useRef<Waypoint[]>([]); // always current
  const lastActiveRef       = useRef<HTMLElement | null>(null);

  /* ───────── build / rebuild ───────── */
  useEffect(() => {
    const rebuild = () => requestAnimationFrame(collectScenes);
    rebuild();
    addEventListener("resize", rebuild);
    return () => removeEventListener("resize", rebuild);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function collectScenes() {
    const scenes = Array.from(
      document.querySelectorAll<HTMLElement>(
        "section[data-scene][data-progress='true']"
      )
    );
    const allScenes  = Array.from(
    document.querySelectorAll<HTMLElement>("section[data-scene]")
  );
    if (!scenes.length) { requestAnimationFrame(collectScenes); return; }

    const spanStart = pageTop(scenes[0]);
    const spanEnd   = pageBot(allScenes.at(-1)!);
    const spanPx    = Math.max(1, (spanEnd - innerHeight ) - spanStart);

    const wps: Waypoint[] = scenes.map(el => ({
      key  : el.dataset.scene!,
      title: el.dataset.title || el.dataset.scene!,
      el,
      f    : (pageTop(el) - spanStart) / spanPx,
    }));

    pointsRef.current = wps;
    setPoints(wps);                  // ← löst das Rendern der Dots aus

    const first = scenes[0];
    const last  = scenes[scenes.length - 1];
    initFade(first, last);;
    initProgress(spanStart, spanEnd);
  }

  function initFade(first: HTMLElement, last: HTMLElement) {
  if (!container.current) return;

  /* Helper */
  const fade = (show: boolean) =>
    gsap.to(container.current!, {
      autoAlpha : show ? 1 : 0,
      duration  : .35,
      onStart   : () => {
        container.current!.style.pointerEvents = show ? "auto" : "none";
      }
    });

  /* ----- ❶ sofortiger Zustand beim Page-Load ---------------- */
  const topGap   = 0.10 * innerHeight;            // gleiche Schwelle wie Trigger
  const shouldBeVisible = first.getBoundingClientRect().top <= topGap;
  gsap.set(container.current, { autoAlpha: shouldBeVisible ? 1 : 0 });

  /* ----- ❷ Fade-in am Story-Anfang -------------------------- */
  ScrollTrigger.create({
    trigger : first,
    start   : "top 10%",
    onEnter : () => fade(true),
    onLeaveBack: () => fade(false)
  });

  /* ----- ❸ Fade-out am Story-Ende --------------------------- */
  ScrollTrigger.create({
    trigger : last,
    start   : "bottom bottom",
    onLeave : () => fade(false),
    onEnterBack: () => fade(true)
  });
}


  /* ───────── knob & fill ───────── */
  function initProgress(start: number, end: number) {
    if (!track.current || !knob.current || !fill.current) return;

    const trackH = track.current.clientHeight;
    const offset = knob.current.offsetHeight / 2;

    ScrollTrigger.getById("knobMove")?.kill();

    ScrollTrigger.create({
      id    : "knobMove",
      start : start,
      end   : end - innerHeight,
      scrub : true,
      onUpdate: self => {
        const y = self.progress * trackH - offset;
        gsap.set(knob.current!, { y });
        gsap.set(fill.current!, { height: y + offset });
      },
    });
  }

  /* ───────── Dot-Triggers erst NACH Render ───────── */
  useEffect(() => {
    /* alte Trigger entfernen */
    ScrollTrigger.getAll()
      .filter(t => t.vars.id?.toString().startsWith("dot-"))
      .forEach(t => t.kill());

    lastActiveRef.current = null;
    points.forEach((wp, i) => {
      const dot = document.getElementById(`dot-${i}`)!;

      /* Grundzustand */
      gsap.set(dot, {
        background: "transparent",
        border: "2px solid #94a3b8",
        boxShadow: "none",
        transformOrigin: "center",
      });

      ScrollTrigger.create({
        id     : `dot-${i}`,
        trigger: wp.el,
        start  : "top 60%",
        onEnter: () => activateDot(dot),
        onEnterBack: () => activateDot(dot),
      });
    });
  }, [points]); // ← feuert erst wenn Dots existieren

  const activateDot = (el: HTMLElement, opts: { pulse?: boolean; force?: boolean } = {}) => {
    if (!el) return;
    if (lastActiveRef.current && lastActiveRef.current !== el) {
      gsap.to(lastActiveRef.current, {
        background: "transparent",
        borderColor: "#94a3b8",
        boxShadow: "none",
        duration: 0.3,
        ease: "power2.out",
      });
    }

    if (!opts.force && lastActiveRef.current === el && !opts.pulse) return;

    lastActiveRef.current = el;

    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    tl.to(
      el,
      {
        background: "#93c5fd",
        borderColor: "#93c5fd",
        boxShadow: "0 0 8px rgba(59,130,246,0.55)",
        duration: 0.25,
      },
      0
    );

    if (opts.pulse) {
      tl.fromTo(
        el,
        { boxShadow: "0 0 8px rgba(59,130,246,0.55)" },
        { boxShadow: "0 0 16px rgba(59,130,246,0.6)", duration: 0.18, yoyo: true, repeat: 1 }
      );
    }
  };


  /* ───────── Scroll/Kbd navigation ───────── */
  const scrollToScene = (idx: number) => {
    const wp = pointsRef.current[idx];
    if (!wp) return;
    const y = wp.el.offsetTop + innerHeight * 0.0;
    gsap.to(window, { scrollTo: y, duration: 0.9, ease: "power2.inOut" });
  };

  const handleDotClick = (idx: number) => {
    const dot = document.getElementById(`dot-${idx}`);
    if (dot) activateDot(dot, { pulse: true, force: true });
    scrollToScene(idx);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const dir  = e.key === "ArrowRight" ? 1 : -1;
      const idx  = pointsRef.current.findIndex(wp => pageTop(wp.el) > scrollY) - 1;
      const next = Math.max(0, Math.min(idx + dir, pointsRef.current.length - 1));
      scrollToScene(next);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  /* ───────── render ───────── */
  return (
    <div
      ref={container}
      className="fixed top-1/2 -translate-y-1/2 lg:right-4 hidden sm:flex flex-col items-center z-50"
    >
      <div className="text-slate-800 mb-5">Big Melt</div>

      <div ref={track} className="relative h-[40vh] w-[2px] bg-slate-400/60 rounded-full mx-auto">
        {/* Fill */}
        <div
          ref={fill}
          className="absolute left-1/2 -translate-x-1/2 top-0 w-[2px] rounded-full"
          style={{
            height: 0,
            /* sanfter Verlauf  –  Arctic-Blue → Magenta */
            background:
              "linear-gradient(180deg,#38bdf8 0%,#6366f1 60%,#98bdf2 100%)",
            boxShadow: "0 0 6px 2px rgba(99,102,241,.35)",
          }}
        />
        {/* Knob */}
        <div
          ref={knob}
          className="absolute left-1/2 -translate-x-1/2 z-1000 w-3 h-3 rounded-full bg-slate-800"
        />

        {/* Dots */}
        {points.map((p, i) => (
          <button
            key={p.key}
            id={`dot-${i}`}
            onClick={() => handleDotClick(i)}
            aria-label={`Jump to ${p.title}`}
            className="
                        group absolute -translate-y-1/2
                        w-3 h-3 rounded-full transition-transform
                        hover:scale-125 active:scale-90 focus:outline-none focus:ring-2
                      "
            style={{
              top: `${p.f * 100}%`,
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <span
              className="
                absolute right-4 top-1/2 -translate-y-1/2
                text-[11px] bg-slate-800 text-white px-1.5 py-0.5 rounded
                opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none
              "
            >
              {p.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
