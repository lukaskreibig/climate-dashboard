/* ------------------------------------------------------------------
   StatChip.tsx · a key figure that counts up when it scrolls into view.
   Editorial "big number + small label" pattern; the number animates once
   (reduced-motion: rendered instantly), formatted per locale.
------------------------------------------------------------------ */
"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslation } from "react-i18next";
import { prefersReducedMotion } from "@/lib/reducedMotion";

gsap.registerPlugin(ScrollTrigger);

interface Props {
  /** target number (counts 0 → value) */
  value: number;
  /** rendered before the number, e.g. "−" */
  prefix?: string;
  /** rendered after the number, e.g. " %", " Tage" */
  suffix?: string;
  decimals?: number;
  /** small line under the number */
  label: string;
  className?: string;
}

export default function StatChip({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  label,
  className = "",
}: Props) {
  const { i18n } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const num = numRef.current;
    if (!root || !num) return;

    const locale = i18n.language === "de" ? "de-DE" : "en-US";
    const fmt = (n: number) =>
      `${prefix}${n.toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix}`;

    if (prefersReducedMotion()) {
      num.textContent = fmt(value);
      return;
    }

    num.textContent = fmt(0);
    const counter = { v: 0 };
    const st = ScrollTrigger.create({
      trigger: root,
      start: "top 85%",
      once: true,
      onEnter: () =>
        gsap.to(counter, {
          v: value,
          duration: 1.6,
          ease: "power3.out",
          onUpdate: () => {
            num.textContent = fmt(counter.v);
          },
        }),
    });

    return () => st.kill();
  }, [value, prefix, suffix, decimals, i18n.language]);

  return (
    <div ref={rootRef} className={`stat-chip ${className}`}>
      <span ref={numRef} className="stat-chip-value" aria-hidden="true" />
      {/* screen readers get the final figure immediately */}
      <span className="sr-only">{`${prefix}${value.toLocaleString(
        i18n.language === "de" ? "de-DE" : "en-US",
        { minimumFractionDigits: decimals, maximumFractionDigits: decimals },
      )}${suffix}`}</span>
      <span className="stat-chip-label">{label}</span>
    </div>
  );
}
