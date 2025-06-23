"use client";

import React, { useEffect, useRef, useState } from "react";
import { gsap }            from "gsap";
import { ScrollTrigger }   from "gsap/ScrollTrigger";
import { ScrollToPlugin }  from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

/* ─── type ─────────────────────────────────────────────────── */
interface Waypoint {
  key   : string;
  title : string;
  el    : HTMLElement;
}

/* ─── component ────────────────────────────────────────────── */
export default function StoryProgress() {
  const container = useRef<HTMLDivElement>(null);
  const track     = useRef<HTMLDivElement>(null);
  const knob      = useRef<HTMLDivElement>(null);

  const [points, setPoints] = useState<Waypoint[]>([]);
  const pointsRef           = useRef<Waypoint[]>([]);      // always current

  /* build once after ChartScene sections exist -------------- */
  useEffect(() => {
    requestAnimationFrame(collectScenes);
  }, []);

  const collectScenes = () => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("section[data-scene]")
    );
    if (sections.length === 0) {
      requestAnimationFrame(collectScenes);
      return;
    }

    const waypoints = sections.map(el => ({
      key  : el.dataset.scene!,
      title: el.dataset.title ?? el.dataset.scene!,
      el
    }));

    setPoints(waypoints);
    pointsRef.current = waypoints;

    /* fade-in when first chart arrives ---------------------- */
    if (container.current) {
      gsap.set(container.current, { autoAlpha: 0, pointerEvents: "none" });
      ScrollTrigger.create({
        trigger : waypoints[0].el,
        start   : "top 80%",
        once    : true,
        onEnter : () =>
          gsap.to(container.current!, {
            autoAlpha: 1,
            duration : .45,
            onStart  : () => (container.current!.style.pointerEvents = "auto")
          })
      });
    }

    /* move knob per scene ----------------------------------- */
    waypoints.forEach((wp, idx) => {
      ScrollTrigger.create({
        trigger : wp.el,
        start   : "top 80%",
        end     : "bottom 20%",
        onEnter : () => moveKnob(idx),
        onEnterBack: () => moveKnob(idx)
      });
    });

    /* ← / → keyboard jump ----------------------------------- */
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const dir  = e.key === "ArrowRight" ? 1 : -1;
      const curr = Number(knob.current?.dataset.idx ?? 0);
      const next = Math.max(0, Math.min(curr + dir, waypoints.length - 1));
      scrollToScene(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  };

  /* ─── helpers ────────────────────────────────────────────── */
  const moveKnob = (idx: number) => {
    if (!track.current || !knob.current) return;
    const steps  = Math.max(pointsRef.current.length - 1, 1);
    const stepPx = track.current.clientHeight / steps;
    const offset = knob.current.offsetHeight / 2;
    gsap.to(knob.current, {
      y       : idx * stepPx - offset,
      duration: .35,
      ease    : "power2.out"
    });
    knob.current.dataset.idx = String(idx);
  };

  const scrollToScene = (idx: number) => {
    const target = pointsRef.current[idx]?.el;
    if (!target) return;
    const y = target.offsetTop + window.innerHeight * 0.5;   // centre first caption
    gsap.to(window, { duration: .9, scrollTo: y, ease: "power2.inOut" });
  };

  /* ─── render ─────────────────────────────────────────────── */
  return (
    <div
      ref={container}
      className="
        fixed right-2 top-1/2 -translate-y-1/2 lg:right-4
        hidden sm:flex flex-col items-center z-50
      "
      aria-label="Story progress"
    >
    
    <div className="text-slate-800 mb-5"> 
    Chapter 1
    </div>
      
      {/* vertical rail */}
      <div ref={track} className="relative h-[60vh] w-px bg-slate-400 rounded-full">
        {/* knob */}
        <div
          ref={knob}
          data-idx="0"
          className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-slate-800"
        />

        {/* dots */}
        {points.map((p, i) => (
          <button
            key={p.key}
            onClick={() => scrollToScene(i)}
            aria-label={`Jump to ${p.title}`}
            className="
              group absolute left-1/2 -translate-x-1/2 -translate-y-1/2
              w-2 h-2 rounded-full bg-slate-400
              hover:bg-indigo-500 focus:outline-none focus:ring-2
            "
            style={{ top: `${(i / Math.max(points.length - 1, 1)) * 100}%` }}
          >
            {/* tooltip */}
            <span
              className="
                absolute right-4 top-1/2 -translate-y-1/2
                text-[11px] bg-slate-800 text-white px-1.5 py-0.5 rounded
                opacity-0 group-hover:opacity-100 whitespace-nowrap
                pointer-events-none
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
