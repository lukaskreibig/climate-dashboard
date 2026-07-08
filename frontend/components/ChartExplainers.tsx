"use client";

import React from "react";

type Tone = "ice" | "warning" | "neutral" | "dark" | "green";

const toneClasses: Record<Tone, string> = {
  ice: "border-sky-200 bg-sky-50/95 text-slate-800",
  warning: "border-amber-200 bg-amber-50/95 text-slate-900",
  neutral: "border-slate-200 bg-white/95 text-slate-800",
  dark: "border-slate-700 bg-slate-900/90 text-white",
  green: "border-emerald-200 bg-emerald-50/95 text-slate-800",
};

export function ChartCallout({
  title,
  children,
  tone = "neutral",
  className = "",
}: {
  title?: React.ReactNode;
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={`rounded-md border px-3 py-2 text-xs leading-snug shadow-sm backdrop-blur ${toneClasses[tone]} ${className}`}
    >
      {title ? <div className="mb-1 font-semibold">{title}</div> : null}
      <div className="text-current/80">{children}</div>
    </div>
  );
}

export function ChartMetricBadge({
  label,
  value,
  detail,
  tone = "neutral",
  className = "",
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  detail?: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={`rounded-md border px-3 py-2 shadow-sm backdrop-blur ${toneClasses[tone]} ${className}`}
    >
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-current/60">
        {label}
      </div>
      <div className="mt-0.5 text-xl font-semibold leading-none">{value}</div>
      {detail ? (
        <div className="mt-1 text-xs leading-snug text-current/65">{detail}</div>
      ) : null}
    </div>
  );
}

export function ChartSourceBadge({
  children,
  href,
  className = "",
}: {
  children: React.ReactNode;
  href?: string;
  className?: string;
}) {
  const sharedClass = `inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[11px] font-medium leading-none text-slate-600 shadow-sm backdrop-blur ${className}`;

  if (href) {
    return (
      <a
        className={`${sharedClass} transition-colors hover:border-slate-400 hover:text-slate-950`}
        href={href}
        target="_blank"
        rel="noreferrer"
      >
        {children}
      </a>
    );
  }

  return <div className={sharedClass}>{children}</div>;
}

export function ChartEmptyState({
  title,
  children,
}: {
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[280px] w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-white/80 p-6 text-center text-slate-700">
      <div>
        <div className="text-sm font-semibold">{title}</div>
        {children ? (
          <div className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-slate-500">
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}
