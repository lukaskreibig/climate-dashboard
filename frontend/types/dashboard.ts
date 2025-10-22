import type {
  AnnualAnomalyRow,
  DailySeaIceRow,
  IqrStatsRow,
  AnnualRow,
  DecadalAnomalyRow,
} from "./api";
import type { FjordDataBundle } from "./index";

export interface CoreDataBundle {
  dailySeaIce: DailySeaIceRow[];
  annualAnomaly: AnnualAnomalyRow[];
  iqrStats: IqrStatsRow[];
  annual: AnnualRow[];
  decadalAnomaly?: DecadalAnomalyRow[];
}

export interface DashboardData extends CoreDataBundle {
  spring: FjordDataBundle["spring"];
  season: FjordDataBundle["season"];
  frac: FjordDataBundle["frac"];
  freeze: FjordDataBundle["freeze"];
  daily: FjordDataBundle["daily"];
  seasonLossPct?: number | null;
}

export type DashboardDataOrNull = DashboardData | null;
