export interface FjordDailyPoint {
  date?: string;
  year: number;
  doy: number;
  frac: number | null;
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
 * Splits at a fixed boundary year (default 2021) to match the story's
 * baseline ("2017–2020 vs 2021–2025"), not a median split — so the labels
 * and the backend's seasonLossPct window stay consistent.
 */
export function summarizeBreakup(
  rows: BreakupRow[],
  lateStartYear = 2021
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

export function splitEarlyLate<T extends { year: number }>(rows: T[]) {
  const sorted = [...rows].sort((a, b) => a.year - b.year);
  const splitAt = Math.ceil(sorted.length / 2);
  return {
    early: sorted.slice(0, splitAt),
    late: sorted.slice(splitAt),
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
  const date = new Date(Date.UTC(2020, 0, doy));
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
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
        return {
          date: row?.date ?? isoDateFromYearDoy(year, doy),
          year,
          doy,
          frac,
          status: frac === null ? "missing" : "measured",
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
