/* ------------------------------------------------------------------
   HeroFade.tsx · centred “photo” block that can shift left/right
------------------------------------------------------------------ */
"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import Image from "next/image";
import gsap from "gsap";

export type HeroFadeApi = { setOverlayShown: (v: boolean) => void };

interface Props {
  rawSrc: string;      // Sentinel-2 RGB
  overlaySrc: string;  // colour-coded mask
}

/* sticky hero that fades when ChartScene calls setOverlayShown() */
const HeroFade = forwardRef<HeroFadeApi, Props>(
  ({ rawSrc, overlaySrc }, apiRef) => {
    const root = useRef<HTMLDivElement>(null);
    const ovl  = useRef<HTMLImageElement>(null);

    /* --- public API -------------------------------------------------- */
    useImperativeHandle(
      apiRef,
      () => ({
        setOverlayShown: (on: boolean) => {
          if (!ovl.current) return;
          gsap.to(ovl.current, {
            opacity: on ? 1 : 0,
            duration: 0.8,
            ease: "power2.out",
          });
        },
      }),
      []
    );

    /* start hidden ---------------------------------------------------- */
    useLayoutEffect(() => {
      if (ovl.current) gsap.set(ovl.current, { opacity: 0 });
    }, []);

    /* ---------------------------------------------------------------- */
    return (
      /* ❶ the flex wrapper centres everything vertically */
      <div
        className="flex items-center justify-center w-full h-full"
        ref={root}
      >
        {/* ❷ fixed-ratio inner box (same max width logic as charts) */}
        <div
          className="relative w-full"
          style={{ aspectRatio: "1 / 0.6" }} /* ≈ chart height ratio */
        >
          {/* raw Sentinel-2 RGB */}
          <Image
            src={rawSrc}
            alt="Raw Sentinel-2"
            fill
            priority
            className="object-contain"
          />

          {/* coloured overlay */}
          <Image
            ref={ovl}
            src={overlaySrc}
            alt="Segmented overlay"
            fill
            priority
            className="object-contain"
          />
        </div>
      </div>
    );
  }
);
HeroFade.displayName = "HeroFade";

export default HeroFade;
