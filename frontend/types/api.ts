export interface DailySeaIceRow {
  Year: number;
  Extent: number | null;
  DayOfYear: number;
}

export interface AnnualAnomalyRow {
  Year: number;
  AnnualAnomaly: number;
}

export interface IqrStatsRow {
  DayOfYear: number;
  minVal: number | null;
  q25: number | null;
  q75: number | null;
  meanVal: number | null;
}

export type AnnualRow = {
  Year: number;
} & Record<string, number | null>;

export interface DecadalAnomalyRow {
  decade: string;
  day: number;
  an: number | null;
  sd: number | null;
  n: number | null;
}

export interface LatestSeaIceSeasonRow {
  DayOfYear: number;
  Extent: number | null;
}

/** How current a single upstream dataset is, as reported by the API. */
export type FreshnessStatus = "current" | "lagging" | "stale" | "unknown";

export interface SourceFreshness {
  /** "seaIce" | "temperature" | "co2" | "fjord" */
  key: string;
  label?: string | null;
  /** "daily" | "annual" | "seasonal" */
  cadence?: string | null;
  latestDate?: string | null;
  latestYear?: number | null;
  referenceDate?: string | null;
  ageDays?: number | null;
  status: FreshnessStatus;
  laggingAfterDays?: number | null;
  staleAfterDays?: number | null;
}

export interface FreshnessBlock {
  checkedAt?: string | null;
  /** worst status across all sources in the block */
  status: FreshnessStatus;
  sources: SourceFreshness[];
}

export interface ClimateDataMeta {
  latestSeaIceDate?: string | null;
  latestSeaIceYear?: number | null;
  latestAnnualYear?: number | null;
  latestTemperatureYear?: number | null;
  latestCo2Year?: number | null;
  source?: string | null;
  baselineYears?: string | null;
  generatedAt?: string | null;
  freshness?: FreshnessBlock | null;
}

export interface BackendDataResponse {
  annual: AnnualRow[];
  dailySeaIce: DailySeaIceRow[];
  annualAnomaly: AnnualAnomalyRow[];
  corrMatrix: Record<string, number | null>[];
  iqrStats: IqrStatsRow[];
  partial2025: LatestSeaIceSeasonRow[];
  latestSeaIceSeason?: LatestSeaIceSeasonRow[];
  decadalAnomaly?: DecadalAnomalyRow[];
  meta?: ClimateDataMeta | null;
}

export interface ApiErrorPayload {
  error: string;
}
