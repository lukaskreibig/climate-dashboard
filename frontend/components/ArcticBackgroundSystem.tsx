/* ------------------------------------------------------------------
   ArcticBackgroundSystem.tsx   (snow layer + API)
------------------------------------------------------------------ */
"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ───────────────  PUBLIC API  ─────────────── */
export interface SnowApi {
  /** Fade snow layer to full-on (true) or invisible (false). */
  fadeTo: (visible: boolean, dur?: number) => void;
}

/* ─────────── snowfall constants ─────────── */
const FLAKE_COUNT = 28;
const DEPTH_LAYERS = 5;
const VIEW_H = typeof window !== "undefined" ? window.innerHeight : 1080;

const FALL_MIN = 0.02;
const FALL_MAX = 0.05;
const DRIFT_MAX = 0.01;
const SPIN_MAX = 2;

const VEL_CLAMP = 800;
const WIND_VERTICAL_FACTOR = 0.00025;
const WIND_HORIZONTAL_FACTOR = 0.00005;
const WIND_FRICTION = 0.9;

const GUST_MIN_DELAY = 1;
const GUST_MAX_DELAY = 2;
const GUST_MIN_SPEED = 0.02;
const GUST_MAX_SPEED = 0.1;
const GUST_DURATION = 0.5;

/* ============================================================== */
const ArcticBackgroundSystem = forwardRef<SnowApi>((_, ref) => {
  const root = useRef<HTMLDivElement>(null);

  /* expose fade API */
  useImperativeHandle(
    ref,
    () => ({
      fadeTo: (v: boolean, dur = 0.6) => {
        if (!root.current) return;
        gsap.to(root.current, {
          opacity: v ? 1 : 0,
          duration: dur,
          ease: "power2.out",
        });
      },
    }),
    []
  );

  /* full snow logic – unchanged except wrapped in gsap.context */
  useEffect(() => {
    if (!root.current) return;

    const ctx = gsap.context(() => {
      /* ── build flakes ── */
      const flakes = gsap.utils.toArray<HTMLDivElement>(
        root.current!.querySelectorAll(".snow-flake")
      );
      const setX = flakes.map((el) => gsap.quickSetter(el, "x", "px"));
      const setY = flakes.map((el) => gsap.quickSetter(el, "y", "px"));
      const setRot = flakes.map((el) => gsap.quickSetter(el, "rotation", "deg"));

      const depth = flakes.map((_, i) => i % DEPTH_LAYERS);
      const baseSpeed = flakes.map(() => gsap.utils.random(FALL_MIN, FALL_MAX));
      const drift = flakes.map(() => gsap.utils.random(-DRIFT_MAX, DRIFT_MAX));
      const spin = flakes.map(() => gsap.utils.random(-SPIN_MAX, SPIN_MAX));
      const restX = flakes.map(() => gsap.utils.random(0, window.innerWidth));
      const restY = flakes.map(() => gsap.utils.random(-VIEW_H, 0));

      flakes.forEach((el, i) => {
        const scale = gsap.utils.mapRange(
          0,
          DEPTH_LAYERS - 1,
          1,
          0.75,
          depth[i]
        );
        gsap.set(el, {
          x: restX[i],
          y: restY[i],
          scale,
          opacity: gsap.utils.random(0.5, 0.8),
          willChange: "transform",
        });
      });

      /* ── wind / scroll coupling ── */
      let scrollVel = 0;
      const ST = ScrollTrigger.create({
        trigger: document.body,
        start: "top top",
        end: "bottom top",
        scrub: true,
        onUpdate: (self) => {
          scrollVel = self.getVelocity();
        },
      });

      const sideWind = { v: 0 };
      const triggerGust = () => {
        const dir = gsap.utils.random([-1, 1]);
        const amp = gsap.utils.random(GUST_MIN_SPEED, GUST_MAX_SPEED);
        gsap.to(sideWind, {
          v: dir * amp,
          duration: GUST_DURATION,
          ease: "sine.out",
          yoyo: true,
          repeat: 1,
          repeatDelay: GUST_DURATION * 1.2,
          onComplete: () =>
            gsap.delayedCall(
              gsap.utils.random(GUST_MIN_DELAY, GUST_MAX_DELAY),
              triggerGust
            ),
        });
      };
      gsap.delayedCall(gsap.utils.random(2, 4), triggerGust);

      gsap.ticker.add((_, dt) => {
        scrollVel *= WIND_FRICTION;

        const gustMag = Math.min(VEL_CLAMP, Math.abs(scrollVel));
        const gustY = scrollVel * WIND_VERTICAL_FACTOR * dt;
        const gustX = Math.sign(scrollVel) * gustMag * WIND_HORIZONTAL_FACTOR * dt;
        const side = sideWind.v * dt;

        flakes.forEach((__, i) => {
          const speed = baseSpeed[i] * dt * (1 + depth[i] * 0.1);

          restY[i] += speed + gustY;
          restX[i] += drift[i] * speed + gustX + side;

          if (restY[i] > VIEW_H + 40) restY[i] -= VIEW_H + 80;
          if (restY[i] < -40) restY[i] += VIEW_H + 80;

          setY[i](restY[i]);
          setX[i](((restX[i] + window.innerWidth) % window.innerWidth));
          setRot[i]((spin[i] * dt * 60) % 360);
        });
      });

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        ST.disable();
      }
    }, root);

    return () => ctx.revert();
  }, []);

  /* ─────────────── JSX ─────────────── */
  return (
    <div
      ref={root}
      className="fixed inset-0 pointer-events-none z-20"
      style={{ opacity: 1 }}
    >
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: FLAKE_COUNT }).map((_, i) => (
          <div
            key={i}
            className="snow-flake absolute w-1 h-1 bg-white/80 rounded-full"
          />
        ))}
      </div>
    </div>
  );
});

ArcticBackgroundSystem.displayName = "ArcticBackgroundSystem";
export default ArcticBackgroundSystem;
