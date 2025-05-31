"use client";
import React, { ReactNode, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Toggle from "@/components/Toggle";
import { motions } from "./motions";

gsap.registerPlugin(ScrollTrigger);

/* ---------- types ---------- */
export interface SceneBlock {
  id: string;
  slot: "left" | "right" | "full";
  content: ReactNode | ((p: any) => ReactNode);
  at: string;
  motion?:
    | { type: "fade"; dur?: number }
    | { type: "slide"; x?: number; y?: number; dur?: number };
  exitAt?: string;
}

export interface SceneSpec {
  key: string;
  pinLen?: number;
  timeline: { label: string; at: number }[];
  blocks: SceneBlock[];
  bg?: string;
  toggleable?: boolean;
  libDefault?: "d3" | "recharts";
  backdrop?: boolean;
}

interface BuilderProps {
  spec: SceneSpec;
  d3?: (p: any) => JSX.Element;
  re?: (p: any) => JSX.Element;
  chartProps: Record<string, any>;
}

export default function SceneBuilder({
  spec,
  d3,
  re,
  chartProps,
}: BuilderProps) {
  const [lib, setLib] = useState<"d3" | "recharts">(spec.libDefault || "recharts");
  const section = useRef<HTMLDivElement>(null);

  /* ---------- NEW  mount state per block ---------- */
  const [mounted, setMounted] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    spec.blocks.forEach(b => (init[b.id] = false));
    return init;
  });

  /* ---------- timeline ---------- */
  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
      trigger: section.current,
      start:   "top bottom",     // ← wait until section top hits viewport bottom
        end: `+=${spec.pinLen ?? 200}%`,
        scrub: true,
        pin: true,
      },
    });

    spec.timeline.forEach(({ label, at }) => tl.addLabel(label, at));

    spec.blocks.forEach(b => {
      const sel = `#${spec.key}-${b.id}`;

      /* mount block exactly at its label */
      tl.call(() => setMounted(m => ({ ...m, [b.id]: true })), undefined, b.at);

      if (b.motion?.type === "fade")
        tl.add(motions.fadeIn(sel, b.motion.dur), b.at);
      else if (b.motion?.type === "slide")
        tl.add(motions.slideFrom(sel, b.motion, b.motion.dur), b.at);

      if (b.exitAt) {
        tl.to(sel, { autoAlpha: 0, duration: 0.3, ease: "none" }, b.exitAt)
          .set(sel, { display: "none", pointerEvents: "none" }, b.exitAt + "+=0.31");
      }
    });
  }, []);

  const ChartComp = lib === "d3" ? d3 : re;

  return (
    <section
      id={spec.key}
      ref={section}
      className={`relative h-screen overflow-hidden ${spec.bg ?? "bg-night-900"}`}
    >
      {/* toggle */}
      {spec.toggleable && d3 && re && (
        <div className="absolute top-6 right-6 z-50 pointer-events-auto">
          <Toggle lib={lib} setLib={setLib} />
        </div>
      )}

      {/* blocks grid */}
      <div className="absolute inset-0 flex flex-col lg:flex-row lg:items-center gap-6 p-6">
        {spec.blocks.map(b => {
          if (!mounted[b.id]) return null;           /* NEW — not yet time */

        const node =
             typeof b.content === "function"
               ? (
                   <React.Fragment key={`${lib}-${b.id}`}>
                     {(b.content as (p: any) => React.ReactNode)({ ...chartProps, lib })}
                   </React.Fragment>
                 )
               : b.content;

          return (
            <div
              key={b.id}
              id={`${spec.key}-${b.id}`}
              className={
                b.slot === "full"
                ? "absolute inset-0 flex items-center justify-center w-full h-full flex-grow"
                  : b.slot === "left"
                  ? "lg:w-1/2"
                  : "lg:w-1/2 lg:pl-8"
              }
            >
              {node}
            </div>
          );
        })}
      </div>

      {/* optional backdrop */}
      {ChartComp && (spec.backdrop ?? true) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-full max-w-[95vw] min-h-[60vh] flex items-center justify-center">
            <ChartComp {...chartProps} />
          </div>
        </div>
      )}
    </section>
  );
}