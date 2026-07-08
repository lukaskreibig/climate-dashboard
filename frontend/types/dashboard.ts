import type {
  AnnualAnomalyRow,
  DailySeaIceRow,
  IqrStatsRow,
  AnnualRow,
  DecadalAnomalyRow,
  LatestSeaIceSeasonRow,
  ClimateDataMeta,
} from "./api";
import type { FjordDataBundle, FjordDataMeta } from "./index";

export interface CoreDataBundle {
  dailySeaIce: DailySeaIceRow[];
  annualAnomaly: AnnualAnomalyRow[];
  iqrStats: IqrStatsRow[];
  annual: AnnualRow[];
  decadalAnomaly?: DecadalAnomalyRow[];
  latestSeaIceSeason?: LatestSeaIceSeasonRow[];
  baseMeta?: ClimateDataMeta | null;
}

export interface DashboardData extends CoreDataBundle {
  spring: FjordDataBundle["spring"];
  season: FjordDataBundle["season"];
  frac: FjordDataBundle["frac"];
  freeze: FjordDataBundle["freeze"];
  daily: FjordDataBundle["daily"];
  seasonLossPct?: number | null;
  fjordMeta?: FjordDataMeta | null;
}

export type DashboardDataOrNull = DashboardData | null;
