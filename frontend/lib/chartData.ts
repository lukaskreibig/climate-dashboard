export interface FjordDailyPoint {
  date?: string;
  year: number;
  doy: number;
  /** smoothed / gap-filled daily ice fraction (what the charts plot) */
  frac: number | null;
  /** per-scene value; null or absent = no usable satellite scene that day */
  fracRaw?: number | null;
}

export type FjordCellStatus = "measured" | "estimated" | "missing";

export interface FjordSeasonCell {
  date: string;
  year: number;
  doy: number;
  frac: number | null;
  status: FjordCellStatus;
}

export interface FjordSeasonRow {
  year: number;
  cells: FjordSeasonCell[];
}

export interface SeasonSummary {
  year: number;
  mean: number | null;
  measuredDays: number;
  iceDays: number;
}

export const UUMMANNAQ_SEASON_START_DOY = 45;
export const UUMMANNAQ_SEASON_END_DOY = 181;

/**
 * First year of the "later" Uummannaq period.
 *
 * This has to be a fixed year, not a median split of whatever rows happen to
 * have arrived. The headline the story prints next to these charts is the
 * backend's seasonLossPct, which is defined over 2017-2020 against everything
 * from FJORD_LATE_START_YEAR = 2021 (backend/main.py). That constant is open
 * ended on purpose: it used to enumerate the late seasons, so a new season had
 * to be added by hand to join them. A median split of the ten measured seasons
 * puts 2021 in the *early* group, so the
 * calendar and the small multiples were highlighting 2017-2021 vs 2022-2025
 * while the badge beside them reported a 2017-2020 vs 2021-2025 number. One
 * more measured season would have moved the highlight again without moving
 * the headline. Keep this in step with backend/main.py.
 */
export const FJORD_LATE_START_YEAR = 2021;

export function isoDateFromYearDoy(year: number, doy: number) {
  const date = new Date(Date.UTC(year, 0, doy));
  return date.toISOString().slice(0, 10);
}

export function summarizeFjordSeasons(
  rows: FjordDailyPoint[],
  startDoy = UUMMANNAQ_SEASON_START_DOY,
  endDoy = UUMMANNAQ_SEASON_END_DOY
): SeasonSummary[] {
  const byYear = new Map<number, FjordDailyPoint[]>();

  rows.forEach((row) => {
    if (
      typeof row.year !== "number" ||
      typeof row.doy !== "number" ||
      row.doy < startDoy ||
      row.doy > endDoy
    ) {
      return;
    }
    const list = byYear.get(row.year) ?? [];
    list.push(row);
    byYear.set(row.year, list);
  });

  return Array.from(byYear.entries())
    .map(([year, values]) => {
      const measured = values.filter((value) => typeof value.frac === "number");
      const mean =
        measured.length > 0
          ? measured.reduce((sum, value) => sum + (value.frac ?? 0), 0) /
            measured.length
          : null;
      return {
        year,
        mean,
        measuredDays: measured.length,
        iceDays: measured.filter((value) => (value.frac ?? 0) >= 0.5).length,
      };
    })
    .sort((a, b) => a.year - b.year);
}

/* ------------------------------------------------------------------
   Per-season sampling uncertainty
------------------------------------------------------------------ */

/** Raw shape as the API sends it; every field past `year` may be absent. */
export interface SeasonMeanRow {
  year: number;
  mean?: number | null;
  measuredMean?: number | null;
  observedDays?: number | null;
  standardError?: number | null;
  ci95?: number[] | readonly number[] | null;
}

export interface SeasonUncertainty {
  year: number;
  /** The gap-filled, smoothed average over the whole window. */
  mean: number | null;
  /**
   * The mean of exactly the days that were measured. This is the one the
   * bootstrap resampled, so it is the one `ci95` belongs to. Pairing the
   * interval with `mean` instead put the 2018 point below its own lower bound.
   */
  measuredMean: number | null;
  observedDays: number | null;
  standardError: number | null;
  /** [lower, upper], already validated as two finite numbers with lower < upper */
  ci95: [number, number] | null;
  /** upper − lower; null when there is no interval */
  ciWidth: number | null;
}

const finiteOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/**
 * Normalises the API's per-season sampling error into something a chart can
 * draw without re-checking every field.
 *
 * The interval is a bootstrap *percentile* interval, so it is not symmetric
 * about the mean: for 2017 the API reports mean 0.5904 with ci95
 * [0.4293, 0.6735], which is 0.161 below and 0.083 above. Charts must take
 * both ends from `ci95` and must not reconstruct them from `standardError`,
 * or 2017 would be drawn a third narrower on its long side than measured.
 *
 * A season with fewer than three observed days carries no interval at all
 * (the backend returns null); those rows keep a mean and lose the band rather
 * than getting a fabricated one.
 */
export function toSeasonUncertainty(row: SeasonMeanRow): SeasonUncertainty {
  const bounds = Array.isArray(row?.ci95) ? row.ci95 : null;
  const lower = finiteOrNull(bounds?.[0]);
  const upper = finiteOrNull(bounds?.[1]);
  const usable =
    bounds !== null &&
    bounds.length === 2 &&
    lower !== null &&
    upper !== null &&
    upper > lower;

  return {
    year: row.year,
    mean: finiteOrNull(row?.mean),
    measuredMean: finiteOrNull(row?.measuredMean),
    observedDays: finiteOrNull(row?.observedDays),
    standardError: finiteOrNull(row?.standardError),
    ci95: usable ? [lower as number, upper as number] : null,
    ciWidth: usable ? (upper as number) - (lower as number) : null,
  };
}

/** year → uncertainty, for charts that render one panel or one row per season. */
export function indexSeasonUncertainty(
  rows: SeasonMeanRow[] | undefined | null
): Map<number, SeasonUncertainty> {
  const index = new Map<number, SeasonUncertainty>();
  (rows ?? []).forEach((row) => {
    if (typeof row?.year !== "number") return;
    index.set(row.year, toSeasonUncertainty(row));
  });
  return index;
}

/** The least firm season in the record, i.e. the widest interval. */
export function widestSeason(
  index: Map<number, SeasonUncertainty>
): SeasonUncertainty | null {
  let widest: SeasonUncertainty | null = null;
  index.forEach((season) => {
    if (season.ciWidth === null) return;
    if (widest === null || season.ciWidth > (widest.ciWidth ?? 0)) widest = season;
  });
  return widest;
}

export interface BreakupRow {
  year: number;
  breakup: number | null;
}

export interface BreakupYear {
  year: number;
  breakup: number | null;
  period: "early" | "late";
}

export interface BreakupSummary {
  byYear: BreakupYear[];
  earlyMean: number | null;
  lateMean: number | null;
  /** earlyMean − lateMean: positive means the late period breaks up earlier */
  shiftDays: number | null;
  lateMin: number | null;
  lateMax: number | null;
}

/**
 * Splits at a fixed boundary year (FJORD_LATE_START_YEAR) to match the story's
 * baseline ("2017 to 2020 vs 2021 to 2025"), not a median split, so the labels
 * and the backend's seasonLossPct window stay consistent.
 */
export function summarizeBreakup(
  rows: BreakupRow[],
  lateStartYear = FJORD_LATE_START_YEAR
): BreakupSummary {
  const sorted = [...rows]
    .filter((row) => typeof row.year === "number")
    .sort((a, b) => a.year - b.year);

  const byYear: BreakupYear[] = sorted.map((row) => ({
    year: row.year,
    breakup: typeof row.breakup === "number" ? row.breakup : null,
    period: row.year < lateStartYear ? "early" : "late",
  }));

  const early = byYear.filter((row) => row.period === "early");
  const late = byYear.filter((row) => row.period === "late");

  const earlyMean = meanOf(early.map((row) => row.breakup));
  const lateMean = meanOf(late.map((row) => row.breakup));
  const shiftDays =
    earlyMean === null || lateMean === null ? null : earlyMean - lateMean;

  const lateBreakups = late
    .map((row) => row.breakup)
    .filter((value): value is number => typeof value === "number");
  const lateMin = lateBreakups.length ? Math.min(...lateBreakups) : null;
  const lateMax = lateBreakups.length ? Math.max(...lateBreakups) : null;

  return { byYear, earlyMean, lateMean, shiftDays, lateMin, lateMax };
}

/**
 * Splits year-keyed rows at a fixed boundary year. Replaces the old
 * splitEarlyLate median split; see FJORD_LATE_START_YEAR for why.
 */
export function splitAtYear<T extends { year: number }>(
  rows: T[],
  lateStartYear: number = FJORD_LATE_START_YEAR
) {
  const sorted = [...rows].sort((a, b) => a.year - b.year);
  return {
    early: sorted.filter((row) => row.year < lateStartYear),
    late: sorted.filter((row) => row.year >= lateStartYear),
    lateStartYear,
  };
}

export function percentChange(early: number | null, late: number | null) {
  if (early === null || late === null || early === 0) return null;
  return ((late - early) / early) * 100;
}

export function meanOf(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === "number");
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

export function latestYearFrom<T extends { Year?: number; year?: number }>(
  rows: T[] | undefined
) {
  const years = (rows ?? [])
    .map((row) => row.Year ?? row.year)
    .filter((year): year is number => typeof year === "number");
  return years.length ? Math.max(...years) : null;
}

export function doyToMonthDay(doy: number, locale: string) {
  // 2001, and the year matters. This used to pin to 2020, a leap year, so every
  // day of year past 29 February rendered one day early: the break-up badge
  // printed "29 Apr" for day 120 while the method panel called the same event
  // 30 April. Eight of the ten seasons in the record are common years, so a
  // common year is right for eight of them and one day out for 2020 and 2024,
  // which is inherent to sharing one axis across leap and common years.
  const date = new Date(Date.UTC(2001, 0, doy));
  return new Intl.DateTimeFormat(locale, {
    // numeric, not 2-digit: neither language writes a date this way. "08. Juni"
    // and "Jun 08" are both wrong outside a filename, and the padding bought
    // nothing, since these are right-aligned axis ticks and inline badge text.
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

export function buildFjordSeasonMatrix(
  rows: FjordDailyPoint[],
  startDoy = UUMMANNAQ_SEASON_START_DOY,
  endDoy = UUMMANNAQ_SEASON_END_DOY,
  maxInterpolatedGap = 2
): FjordSeasonRow[] {
  const byYear = new Map<number, Map<number, FjordDailyPoint>>();

  rows.forEach((row) => {
    if (
      typeof row.year !== "number" ||
      typeof row.doy !== "number" ||
      row.doy < startDoy ||
      row.doy > endDoy
    ) {
      return;
    }

    const yearMap = byYear.get(row.year) ?? new Map<number, FjordDailyPoint>();
    yearMap.set(row.doy, row);
    byYear.set(row.year, yearMap);
  });

  return Array.from(byYear.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, yearMap]) => {
      const cells: FjordSeasonCell[] = Array.from(
        { length: endDoy - startDoy + 1 },
        (_, index) => {
        const doy = startDoy + index;
        const row = yearMap.get(doy);
        const frac = typeof row?.frac === "number" ? row.frac : null;
        // `frac` is the smoothed/gap-filled series; only a day that also carries
        // a per-scene `fracRaw` was actually observed by a satellite. Without
        // this distinction every filled day would claim to be a measurement.
        const observed = typeof row?.fracRaw === "number";
        return {
          date: row?.date ?? isoDateFromYearDoy(year, doy),
          year,
          doy,
          frac,
          status: frac === null ? "missing" : observed ? "measured" : "estimated",
        } satisfies FjordSeasonCell;
        }
      );

      let index = 0;
      while (index < cells.length) {
        if (cells[index].frac !== null) {
          index += 1;
          continue;
        }

        const gapStart = index;
        while (index < cells.length && cells[index].frac === null) {
          index += 1;
        }
        const gapEnd = index - 1;
        const gapLength = gapEnd - gapStart + 1;
        const before = cells[gapStart - 1];
        const after = cells[index];

        if (
          gapLength <= maxInterpolatedGap &&
          typeof before?.frac === "number" &&
          typeof after?.frac === "number"
        ) {
          for (let gapIndex = gapStart; gapIndex <= gapEnd; gapIndex += 1) {
            const step = gapIndex - gapStart + 1;
            const ratio = step / (gapLength + 1);
            cells[gapIndex] = {
              ...cells[gapIndex],
              frac: before.frac + (after.frac - before.frac) * ratio,
              status: "estimated",
            };
          }
        }
      }

      return { year, cells };
    });
}
