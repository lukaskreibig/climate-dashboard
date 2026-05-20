// LoadingOverlay.tsx
"use client";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function LoadingOverlay({ progress }: { progress: number }) {
  const { t } = useTranslation();
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <div
      data-loading-overlay="true"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#020617] px-6 text-center text-snow-50"
    >
      <div className="mb-7 h-12 w-12 rounded-full border border-white/20 border-b-sky-300 animate-spin" />
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/90">
        {t("loading.eyebrow")}
      </p>
      <h1 className="mt-3 max-w-xl text-2xl font-semibold sm:text-3xl">
        {t("loading.title")}
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-300 sm:text-base">
        {t("loading.detail")}
      </p>

      <div className="mt-8 h-1.5 w-full max-w-xs rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-sky-300"
          animate={{ width: `${safeProgress}%` }}
          transition={{ ease: "easeOut", duration: 0.2 }}
        />
      </div>
      <p className="mt-3 text-xs text-slate-400">
        {t("loading.progress", { progress: safeProgress })}
      </p>
    </div>
  );
}
