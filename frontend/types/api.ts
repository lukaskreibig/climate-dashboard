export interface DailySeaIceRow {
  Month: string;
  Day: number;
  Year: number;
  Extent: number | null;
  DayOfYear: number;
  DateStr: string;
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

export interface ClimateDataMeta {
  latestSeaIceDate?: string | null;
  latestSeaIceYear?: number | null;
  latestAnnualYear?: number | null;
  latestTemperatureYear?: number | null;
  source?: string | null;
  baselineYears?: string | null;
  generatedAt?: string | null;
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
