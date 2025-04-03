"use client";
import React, { useMemo } from "react";
import {
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Line,
  Legend,
} from "recharts";
// Note: We are not using d3 to build the legend here, but we use it only for the color scale.
// If you want to completely remove d3, you can implement your own color interpolation.
import * as d3 from "d3";

interface DailySeaIceRow {
  Year: number;
  DayOfYear: number;
  Extent?: number | null;
}
interface Props {
  data: DailySeaIceRow[];
}

// Custom active dot renders a tooltip near the hovered point for that specific line.
const renderActiveDot = (props: any) => {
  const { cx, cy, stroke, payload, value } = props;
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill={stroke} stroke="none" />
      <foreignObject x={cx + 8} y={cy - 20} width={100} height={50}>
        <div
          style={{
            background: "rgba(0,0,0,0.7)",
            color: "#fff",
            fontSize: "0.75rem",
            padding: "4px",
            borderRadius: "4px",
          }}
        >
          <div>Day: {payload.DayOfYear}</div>
          <div>{value.toFixed(2)}</div>
        </div>
      </foreignObject>
    </g>
  );
};

export default function SeasonalLinesChartRecharts({ data }: Props) {
  // Group data by Year, and sort each group by DayOfYear.
  const byYear = useMemo(() => {
    const map = new Map<number, DailySeaIceRow[]>();
    data.forEach(row => {
      if (!map.has(row.Year)) map.set(row.Year, []);
      map.get(row.Year)!.push(row);
    });
    map.forEach(arr => arr.sort((a, b) => a.DayOfYear - b.DayOfYear));
    return Array.from(map.entries())
      .map(([year, values]) => ({ year, values }))
      .sort((a, b) => a.year - b.year);
  }, [data]);

  if (!byYear.length) {
    return <p className="text-gray-500">No daily data found.</p>;
  }

  const minYear = byYear[0].year;
  const maxYear = byYear[byYear.length - 1].year;

  // Use d3.scaleSequential to compute a color for each year.
  const colorScale = d3.scaleSequential(d3.interpolateTurbo).domain([minYear, maxYear]);

  // Determine global min and max for the Y axis.
  const minDOY = 1;
  const maxDOY = 366;
  let minExtent = Infinity, maxExtent = -Infinity;
  byYear.forEach(group => {
    group.values.forEach(r => {
      if (r.Extent != null) {
        if (r.Extent < minExtent) minExtent = r.Extent;
        if (r.Extent > maxExtent) maxExtent = r.Extent;
      }
    });
  });

  return (
    <div style={{ width: "100%", height: 400 }}>
      <ResponsiveContainer>
        <LineChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            domain={[minDOY, maxDOY]}
            dataKey="DayOfYear"
            tickCount={12}
            label={{ value: "Day of Year", position: "bottom", offset: 0 }}
          />
          <YAxis
            domain={[minExtent, maxExtent]}
            label={{ value: "Sea Ice Extent", angle: -90, position: "insideLeft", offset: -5 }}
          />
          {/* Remove the global Tooltip to show only per-line tooltips */}
          <Legend wrapperStyle={{ display: "none" }} />

          {byYear.map(group => {
            const lineColor = colorScale(group.year);
            return (
              <Line
                key={group.year}
                data={group.values}
                dataKey="Extent"
                name={String(group.year)}
                stroke={lineColor}
                dot={false}
                activeDot={renderActiveDot}
                isAnimationActive={false}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
