/* ------------------------------------------------------------------
   DataFreshnessNote.tsx

   Tells the reader how far each measurement record actually reaches.

   The story used to print 2025 numbers with no date anywhere, which reads
   as "this is the ice right now". It is not. This block names the last
   observation of every source and, when a source has gone quiet, says so
   in plain words instead of implying currency.

   Everything shown here comes from the API meta.freshness block, so the
   copy can never drift from the data.
------------------------------------------------------------------ */
"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import type { ClimateDataMeta, FjordDataMeta, FreshnessStatus, SourceFreshness } from "@/types";
import {
  formatFreshnessDate,
  leadKey,
  normaliseStatus,
  orderSources,
  reachFor,
  worstStatus,
} from "@/lib/freshness";

interface Props {
  baseMeta?: ClimateDataMeta | null;
  fjordMeta?: FjordDataMeta | null;
  className?: string;
}

const STATUS_DOT: Record<FreshnessStatus, string> = {
  current: "bg-emerald-400",
  lagging: "bg-amber-400",
  stale: "bg-rose-400",
  unknown: "bg-gray-500",
};

const STATUS_TEXT: Record<FreshnessStatus, string> = {
  current: "text-emerald-300",
  lagging: "text-amber-300",
  stale: "text-rose-300",
  unknown: "text-gray-400",
};

export default function DataFreshnessNote({ baseMeta, fjordMeta, className }: Props) {
  const { t, i18n } = useTranslation();

  const sources: SourceFreshness[] = [
    ...(fjordMeta?.freshness?.sources ?? []),
    ...(baseMeta?.freshness?.sources ?? []),
  ];

  if (sources.length === 0) {
    return (
      <p className={clsx("text-sm text-gray-400", className)}>
        {t("outro.freshness.unavailable")}
      </p>
    );
  }

  const ordered = orderSources(sources);
  const overall = worstStatus(ordered);
  const checkedAtRaw = fjordMeta?.freshness?.checkedAt ?? baseMeta?.freshness?.checkedAt ?? null;
  const checkedAt = formatFreshnessDate(checkedAtRaw, i18n.language);

  return (
    <section className={clsx("space-y-3", className)} aria-labelledby="data-freshness-title">
      <h4 id="data-freshness-title" className="text-xl font-semibold text-blue-300">
        {t("outro.freshness.title")}
      </h4>

      <p className="text-sm leading-relaxed text-gray-300">{t(leadKey(overall))}</p>

      <ul className="space-y-2">
        {ordered.map((source) => {
          const status = normaliseStatus(source.status);
          const label =
            t(`outro.freshness.sourceLabels.${source.key}`, { defaultValue: "" }) ||
            source.label ||
            source.key;

          const reach = reachFor(source, formatFreshnessDate(source.latestDate, i18n.language));
          const age =
            source.ageDays != null ? t("outro.freshness.age", { count: source.ageDays }) : null;

          return (
            <li
              key={source.key}
              data-testid={`freshness-${source.key}`}
              data-status={status}
              className="flex items-start gap-2 text-sm text-gray-400"
            >
              <span
                aria-hidden
                className={clsx("mt-1.5 h-2 w-2 shrink-0 rounded-full", STATUS_DOT[status])}
              />
              <span className="leading-relaxed">
                <span className="text-gray-200">{label}</span>
                {": "}
                {t(reach.key, reach.params)}
                {age ? ` (${age})` : null}
                {", "}
                <span className={STATUS_TEXT[status]}>
                  {t(`outro.freshness.status.${status}`)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      {checkedAt && (
        <p className="text-xs text-gray-500">
          {t("outro.freshness.checkedAt", { date: checkedAt })}
        </p>
      )}
    </section>
  );
}
