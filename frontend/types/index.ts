export interface FjordSeasonRow {
  doy: number;
  period: string;
  mean: number | null;
  p25: number | null;
  p75: number | null;
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

export interface FjordDataBundle {
  spring: FjordSpringAnomaly[];
  season: FjordSeasonRow[];
  frac: FjordMeanFraction[];
  freeze: FjordFreezeBreakup[];
  daily: FjordDailyRow[];
}
