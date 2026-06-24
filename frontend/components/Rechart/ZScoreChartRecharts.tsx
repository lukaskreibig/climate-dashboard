"use client";
import React, {
  useState,
  useMemo,
  useImperativeHandle,
  MutableRefObject,
} from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useTranslation } from "react-i18next";
import {
  ChartCallout,
  ChartEmptyState,
  ChartSourceBadge,
} from "@/components/ChartExplainers";

/* ---------------- types ---------------------------------------- */
export interface RowZ {
  Year: number;
  Arctic_z?: number | null;
  SeaIce_z?: number | null;
  SeaIce_z_inv?: number | null;
  GlobCO2Mean_z?: number | null;
}
interface Props {
  data: RowZ[];
  inverted?: boolean;
  apiRef?: MutableRefObject<any>;
}

/* ---------------- component ------------------------------------ */
export default function ZScoreChartRecharts({
  data,
  inverted = false,
  apiRef,
}: Props) {
  const { t } = useTranslation();
  const [inv, setInv] = useState(inverted);

  /* ─── expose tiny API for parent components ─────────────────── */
  useImperativeHandle(apiRef, () => ({
    toggleInvert: (v: boolean) => setInv(v),
  }));

  /* ─── derive plotted dataset on-the-fly ──────────────────────── */
  const plotted = useMemo(
    () =>
      data.map((r) => ({
        ...r,
        SeaIceFinal: inv ? r.SeaIce_z_inv : r.SeaIce_z,
      })),
    [data, inv],
  );

  /* ─── legend hide / show state ───────────────────────────────── */
  const [hidden, setHidden] = useState<string[]>([]);

  if (!Array.isArray(data) || !data.length) {
    return (
      <ChartEmptyState title={t("charts.zScore.emptyTitle")}>
        {t("charts.zScore.emptyBody")}
      </ChartEmptyState>
    );
  }

  /* ---------------- render -------------------------------------- */
  return (
    <div className="relative w-full" role="img" aria-label={t("charts.ariaSummaries.zScore")}>
      <div className="h-[400px] w-full">
        <div className="text-center font-semibold text-slate-800 mb-1 select-none text-sm sm:text-base">
          {t("charts.zScore.title")}
        </div>
        <div className="absolute right-2 top-0 z-10">
          <ChartSourceBadge href="https://data.giss.nasa.gov/gistemp/">
            {t("charts.zScore.source")}
          </ChartSourceBadge>
        </div>
        <ChartCallout
          tone={inv ? "warning" : "neutral"}
          className="absolute bottom-2 left-3 z-10 max-w-[270px]"
          title={inv ? t("charts.zScore.calloutInvertedTitle") : t("charts.zScore.calloutRawTitle")}
        >
          {inv ? t("charts.zScore.calloutInvertedBody") : t("charts.zScore.calloutRawBody")}
        </ChartCallout>

        <ResponsiveContainer>
          <LineChart data={plotted} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid className="chart-grid" strokeDasharray="3 3" />
            <XAxis className="chart-axis" dataKey="Year" />
            <YAxis className="chart-axis" />
            <Tooltip formatter={(v) => (typeof v === "number" ? v.toFixed(2) : v)} labelStyle={{color:"#000"}} />
            <Legend
              className="chart-grid"
              onClick={(o) => {
                const k = o.dataKey as string;
                setHidden((h) => (h.includes(k) ? h.filter((x) => x !== k) : [...h, k]));
              }}
            />

            {/* Arctic temp -------------------------------------------------- */}
            <Line
              type="monotone"
              dataKey="Arctic_z"
              name={t("charts.zScore.arcticTemp")}
              stroke="#ef4444"
              strokeWidth={2}
              hide={hidden.includes("Arctic_z")}
              dot={false}
            />

            {/* Sea-ice (normal oder invertiert) ---------------------------- */}
            <Line
              type="monotone"
              dataKey="SeaIceFinal"
              name={inv ? t("charts.zScore.seaIceInv") : t("charts.zScore.seaIce")}
              stroke="#3b82f6"
              strokeWidth={2}
              hide={hidden.includes("SeaIceFinal")}
              dot={false}
            />

            {/* CO₂ --------------------------------------------------------- */}
            <Line
              type="monotone"
              dataKey="GlobCO2Mean_z"
              name={t("charts.zScore.co2")}
              stroke="#48bb78"
              strokeWidth={2}
              hide={hidden.includes("GlobCO2Mean_z")}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
