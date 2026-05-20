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
  frac: number | null;
}

export interface FjordDataMeta {
  latestDate?: string | null;
  latestYear?: number | null;
  source?: string | null;
  baselineYears?: string | null;
  generatedAt?: string | null;
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
} from "./api";
