/* ------------------------------------------------------------------
   DailyAnomalyChartRecharts  (v3.1 — decades + blue-red + months)
   - Fix tooltip labels to show decade names
   - Pressable legend to toggle series visibility
------------------------------------------------------------------ */
"use client";

import React, {
  useMemo,
  useState,
  useImperativeHandle,
  useCallback,
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
  LegendPayload,
} from "recharts";

export interface Row {
  Year: number;
  DayOfYear: number;
  Extent?: number | null;
}
export interface Props {
  data: Row[];
  chosenYear: number;
  apiRef?: React.MutableRefObject<any>;
}

export default function DailyAnomalyChartRecharts({
  data,
  chosenYear,
  apiRef,
}: Props) {
  const [maxYear, setMaxYear] = useState(chosenYear);

  /* NEW 👉 store hidden series (decades) for interactive legend */
  const [hiddenDecades, setHiddenDecades] = useState<string[]>([]);

  /* imperative API ------------------------------------------- */
  useImperativeHandle(
    apiRef,
    () => ({
      addYear: () =>
        setMaxYear((y) => {
          const next = y + 1;
          return data.some((r) => r.Year === next) ? next : y;
        }),
      nextYear: () => setMaxYear((y) => y + 1),
      setYear: (y: number) => setMaxYear(y),
    }),
    [data]
  );

  /* baseline -------------------------------------------------- */
  const baseline = useMemo(() => {
    const base = data.filter((r) => r.Year <= maxYear && r.Extent != null);
    const byDay = new Map<number, number[]>();
    base.forEach((r) => {
      byDay.set(r.DayOfYear, [...(byDay.get(r.DayOfYear) ?? []), r.Extent!]);
    });
    const m = new Map<number, number>();
    byDay.forEach((arr, day) => m.set(day, arr.reduce((s, v) => s + v, 0) / arr.length));
    return m;
  }, [data, maxYear]);

  /* color mapping from blue to red ----------------------------- */
  const getDecadeColor = (decade: string) => {
    const decadeColors: Record<string, string> = {
      "1980s": "#1e40af", // Deep blue
      "1990s": "#3b82f6", // Blue
      "2000s": "#f59e0b", // Amber/Orange
      "2010s": "#ef4444", // Red
      "2020s": "#dc2626", // Dark red
    };
    return decadeColors[decade] ?? "#6b7280";
  };

  /* group years into decades ----------------------------------- */
  const decadeSeries = useMemo(() => {
    const years = [
      ...new Set(data.filter((r) => r.Year <= maxYear).map((r) => r.Year)),
    ].sort((a, b) => a - b);

    // Group years by decade
    const decades = new Map<string, number[]>();
    years.forEach((year) => {
      const decade = `${Math.floor(year / 10) * 10}s`;
      decades.set(decade, [...(decades.get(decade) ?? []), year]);
    });

    // Build data for each decade
    const decadeData = new Map<string, Map<number, number[]>>();

    data.forEach((r) => {
      if (r.Year > maxYear || r.Extent == null) return;

      const decade = `${Math.floor(r.Year / 10) * 10}s`;
      if (!decadeData.has(decade)) {
        decadeData.set(decade, new Map());
      }

      const dayMap = decadeData.get(decade)!;
      const anomaly = r.Extent - (baseline.get(r.DayOfYear) ?? 0);
      dayMap.set(r.DayOfYear, [...(dayMap.get(r.DayOfYear) ?? []), anomaly]);
    });

    // Average anomalies by day for each decade
    return Array.from(decades.keys())
      .sort()
      .map((decade) => {
        const dayMap = decadeData.get(decade) ?? new Map();
        const rows: { day: number; an: number }[] = [];

        for (let day = 1; day <= 366; day++) {
          const values = dayMap.get(day) ?? [];
          if (values.length > 0) {
            const avgAnomaly = values.reduce((s, v) => s + v, 0) / values.length;
            rows.push({ day, an: avgAnomaly });
          }
        }

        return {
          decade,
          rows: rows.sort((a, b) => a.day - b.day),
          color: getDecadeColor(decade),
        };
      });
  }, [data, maxYear, baseline]);

  /* month labels for x-axis ----------------------------------- */
  const monthTicks = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
  const monthLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const formatXAxisLabel = (value: number) => {
    const monthIndex = monthTicks.findIndex((tick) => Math.abs(tick - value) < 15);
    return monthIndex >= 0 ? monthLabels[monthIndex] : "";
  };

    /* custom tooltip -------------------------------------------- */
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const dayOfYear = Math.round(label);
    const monthIndex =
      monthTicks.findIndex((tick) => dayOfYear >= tick) !== -1
        ? monthTicks.findLastIndex((tick) => dayOfYear >= tick)
        : 0;
    const month = monthLabels[monthIndex] || "Unknown";

    return (
      <div className="bg-white/95 p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-800">{`${month} (Day ${dayOfYear})`}</p>

        {payload.map((entry: any, index: number) => {
          // 🔎 Re-look-up the correct value from our pre-computed decade data
          const decadeData = decadeSeries.find((d) => d.decade === entry.name);
          const row = decadeData?.rows.find((r) => r.day === dayOfYear);
          const value = row?.an ?? null;

          return (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.name}: ${
                value !== null ? value.toFixed(3) : "—"
              }`}
            </p>
          );
        })}
      </div>
    );
  };


  /* legend click handler -------------------------------------- */
  const handleLegendClick = useCallback((e: LegendPayload) => {
    const { value } = e; // `value` equals the `name` prop we give to <Line /> (the decade)
    if (typeof value !== "string") return;
    setHiddenDecades((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
    );
  }, []);

  /* render ---------------------------------------------------- */
  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer>
        <LineChart margin={{ top: 20, right: 20, bottom: 20, left: 40 }}>
          <CartesianGrid className="chart-grid" strokeDasharray="3 3" />
          <XAxis
            className="chart-axis"
            dataKey="day"
            type="number"
            domain={[1, 366]}
            ticks={monthTicks}
            tickFormatter={formatXAxisLabel}
          />
          <YAxis
            className="chart-axis"
            label={{ value: "Anomaly (10⁶ km²)", angle: -90, position: "insideLeft" }}
          />
          <Tooltip content={<CustomTooltip />} />
          {/* 🖱️ Make legend items pressable */}
          <Legend />
          {/* <Legend onClick={handleLegendClick} /> */}


          {decadeSeries.map(({ decade, rows, color }) =>
            hiddenDecades.includes(decade) ? null : (
              <Line
                key={decade}
                data={rows}
                dataKey="an"
                type="monotone"
                name={decade}
                stroke={color}
                strokeWidth={2}
                dot={false}
              />
            )
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
