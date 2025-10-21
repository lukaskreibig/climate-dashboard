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

  /* ----------------------------------------------------------------
     HEADLINE:
     – Einige Übersetzungen enthalten „CO₂ … arctic sea ice … Arctic“,
       andere (z. B. Deutsch) nicht. Darum:
       1.  Wir holen den Titel als *reinen* String (default = "").
       2.  Nur wenn CO₂ & co. vorkommen, bauen wir das bunte Label
           wie bisher; sonst nehmen wir einfach den Titel selbst.
  -----------------------------------------------------------------*/
  const rawTitle: string =
    typeof t("charts.zScore.title") === "string"
      ? (t("charts.zScore.title") as string)
      : t("zscore.title", ""); // Fallback auf scenes-Titel

  const HEADLINE = rawTitle.includes("CO₂") ? (
    <>
      {rawTitle.split("CO₂")[0]}CO₂&nbsp;
      <span className="inline-block w-3 h-3 bg-green-500 align-baseline rounded-sm" />
      &nbsp;
      {rawTitle.split("CO₂")[1]?.split("arctic sea ice")[0]}arctic sea ice&nbsp;
      <span className="inline-block w-3 h-3 bg-blue-500 align-baseline rounded-sm" />
      &nbsp;
      {rawTitle.split("arctic sea ice")[1]?.split("Arctic")[0]}Arctic&nbsp;
      <span className="inline-block w-3 h-3 bg-red-500 align-baseline rounded-sm" />
    </>
  ) : (
    rawTitle || "CO₂ · Sea-Ice · Arctic"
  );

  /* ---------------- render -------------------------------------- */
  return (
    <div className="w-full">
      <div className="h-[400px] w-full">
        <div className="text-center font-semibold text-slate-800 mb-1 select-none text-sm sm:text-base">
          {HEADLINE}
        </div>

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
