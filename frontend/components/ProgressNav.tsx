// components/ProgressNav.tsx
"use client";

import React, { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { scenes } from "@/components/scenes/scenesConfig";

// register the plugin
gsap.registerPlugin(ScrollTrigger);

export default function ProgressNav() {
  const navRef    = useRef<HTMLDivElement>(null);
  const ballRef   = useRef<HTMLDivElement>(null);
  const itemRefs  = useRef<HTMLLIElement[]>([]);

  useLayoutEffect(() => {
    const nav  = navRef.current;
    const ball = ballRef.current;
    const items = itemRefs.current;
    if (!nav || !ball || items.length < 2) return;

    // measure vertical distance between first & last bullet
    const positions = items.map((li) => li.offsetTop);
    const startY = positions[0];
    const endY   = positions[positions.length - 1];
    const totalDistance = endY - startY;

    // animate `ball` y from 0 → totalDistance as you scroll the scenes-wrapper
    gsap.timeline({
      scrollTrigger: {
        trigger: "#scenes-wrapper",
        start:   "top top",
        end:     "bottom bottom",
        scrub:   true
      }
    })
    .to(ball, { y: totalDistance, ease: "none" });
  }, []);

  return (
    <div className="fixed right-8 top-1/2 transform -translate-y-1/2">
      <div ref={navRef} className="relative">
        {/* vertical line */}
        <div className="absolute left-1 w-px h-full bg-gray-500" />

        <ul className="relative space-y-8">
          {scenes.map((scene, i) => (
            <li
              key={scene.key}
              ref={(el) => el && (itemRefs.current[i] = el)}
              className="flex items-center"
            >
              {/* static bullet */}
              <div className="w-3 h-3 bg-gray-500 rounded-full" />
              <span className="ml-2 text-gray-400 lowercase">
                {scene.key.replace(/-/g, " ")}
              </span>
            </li>
          ))}
        </ul>

        {/* the moving “ball” */}
        <div
          ref={ballRef}
          className="
            absolute
            left-[-0.25rem]
            w-4 h-4
            bg-white
            border-2 border-gray-700
            rounded-full
            pointer-events-none
          "
        />
      </div>
    </div>
  );
}