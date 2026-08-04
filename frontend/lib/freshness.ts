/* ------------------------------------------------------------------
   freshness.ts

   Pure helpers behind the "State of the data" note. Kept out of the
   component so the editorial contract can be tested directly: a stale
   record must never be described with copy that asserts currency.
------------------------------------------------------------------ */
import type { FreshnessStatus, SourceFreshness } from "@/types";

/** The fjord series is the story's own dataset, so it leads. */
export const SOURCE_ORDER = ["fjord", "seaIce", "temperature", "co2"] as const;

export const STATUS_RANK: Record<FreshnessStatus, number> = {
  current: 0,
  lagging: 1,
  stale: 2,
  unknown: 3,
};

export function isFreshnessStatus(value: unknown): value is FreshnessStatus {
  return value === "current" || value === "lagging" || value === "stale" || value === "unknown";
}

export function normaliseStatus(value: unknown): FreshnessStatus {
  return isFreshnessStatus(value) ? value : "unknown";
}

/** Stable display order; unknown keys fall to the end. */
export function orderSources(sources: SourceFreshness[]): SourceFreshness[] {
  const rank = (key: string) => {
    const i = SOURCE_ORDER.indexOf(key as (typeof SOURCE_ORDER)[number]);
    return i === -1 ? SOURCE_ORDER.length : i;
  };
  return [...sources].sort((a, b) => rank(a.key) - rank(b.key));
}

/**
 * The block as a whole is only as honest as its worst source, so one stale
 * record downgrades the whole note. Never averages, never rounds down.
 */
export function worstStatus(sources: SourceFreshness[]): FreshnessStatus {
  if (sources.length === 0) return "unknown";
  return sources.reduce<FreshnessStatus>((worst, source) => {
    const status = normaliseStatus(source.status);
    return STATUS_RANK[status] > STATUS_RANK[worst] ? status : worst;
  }, "current");
}

/** i18n key of the lead paragraph for a given overall status. */
export function leadKey(status: FreshnessStatus): string {
  return {
    current: "outro.freshness.leadCurrent",
    lagging: "outro.freshness.leadLagging",
    stale: "outro.freshness.leadStale",
    unknown: "outro.freshness.leadUnknown",
  }[status];
}

export type Reach =
  | { key: "outro.freshness.lastSeason"; params: { year: number } }
  | { key: "outro.freshness.lastYear"; params: { year: number } }
  | { key: "outro.freshness.lastMeasurement"; params: { date: string } }
  | { key: "outro.freshness.lastValueUnknown"; params: Record<string, never> };

/**
 * Picks how to state the end of the record. Seasonal and annual sources name
 * the window (a season, a year); only a daily source is dated to the day.
 */
export function reachFor(source: SourceFreshness, formattedDate: string | null): Reach {
  if (source.cadence === "seasonal" && source.latestYear != null) {
    return { key: "outro.freshness.lastSeason", params: { year: source.latestYear } };
  }
  if (source.cadence === "annual" && source.latestYear != null) {
    return { key: "outro.freshness.lastYear", params: { year: source.latestYear } };
  }
  if (formattedDate) {
    return { key: "outro.freshness.lastMeasurement", params: { date: formattedDate } };
  }
  if (source.latestYear != null) {
    return { key: "outro.freshness.lastYear", params: { year: source.latestYear } };
  }
  return { key: "outro.freshness.lastValueUnknown", params: {} };
}

/** Formats an ISO date in UTC so server and client never disagree. */
export function formatFreshnessDate(
  iso: string | null | undefined,
  language: string,
): string | null {
  if (!iso) return null;
  const parsed = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat(language || "en", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}
