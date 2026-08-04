import type { FreshnessBlock } from "./api";

export interface FjordSeasonRow {
  day: string;
  eMean: number | null;
  e25: number | null;
  e75: number | null;
  lMean: number | null;
  l25: number | null;
  l75: number | null;
}

export interface FjordSpringAnomaly {
  year: number;
  anomaly: number | null;
}

export interface FjordMeanFraction {
  year: number;
  mean: number | null;
  /**
   * Days inside the Feb-Jun window that a satellite actually saw that season.
   * Gap-filled days are excluded, so this is the sample the interval rests on.
   */
  observedDays?: number | null;
  /** Bootstrap standard error of the seasonal mean (2000 draws, seeded by year). */
  standardError?: number | null;
  /**
   * [lower, upper] 95 % bootstrap percentile interval. Percentile bounds are
   * not symmetric around `mean`, so charts must draw both ends from this pair
   * rather than mean ± 1.96 × standardError.
   */
  ci95?: [number, number] | number[] | null;
}

export interface FjordFreezeBreakup {
  year: number;
  freeze: number | null;
  breakup: number | null;
}

export interface FjordDailyRow {
  date: string;
  year: number;
  doy: number;
  /** smoothed / gap-filled daily ice fraction */
  frac: number | null;
  /** per-scene value; null = no usable satellite scene that day */
  fracRaw?: number | null;
}

export interface FjordDataMeta {
  latestDate?: string | null;
  latestYear?: number | null;
  source?: string | null;
  baselineYears?: string | null;
  generatedAt?: string | null;
  freshness?: FreshnessBlock | null;
}

export interface FjordDataBundle {
  spring: FjordSpringAnomaly[];
  season: FjordSeasonRow[];
  frac: FjordMeanFraction[];
  freeze: FjordFreezeBreakup[];
  daily: FjordDailyRow[];
  seasonLossPct?: number | null;
  meta?: FjordDataMeta | null;
}

export type {
  DailySeaIceRow,
  AnnualAnomalyRow,
  IqrStatsRow,
  AnnualRow,
  DecadalAnomalyRow,
  LatestSeaIceSeasonRow,
  ClimateDataMeta,
  BackendDataResponse,
  ApiErrorPayload,
  FreshnessStatus,
  SourceFreshness,
  FreshnessBlock,
} from "./api";
