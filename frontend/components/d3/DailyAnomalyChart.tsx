"use client";
import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

interface DailySeaIceRow {
  Year: number;
  DayOfYear: number;
  Extent?: number;
}

interface DailyAnomalyProps {
  data: DailySeaIceRow[];
  chosenYear: number;
}

export default function DailyAnomalyChart({ data, chosenYear }: DailyAnomalyProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data || !ref.current) return;
    ref.current.innerHTML = "";

    // exclude the chosen year from baseline
    const base = data.filter(d => d.Year !== chosenYear);
    const dayMap = d3.rollups(
      base,
      arr => d3.mean(arr, a => a.Extent ?? 0),
      d => d.DayOfYear
    );
    const baseline = new Map(dayMap);

    const chosen = data.filter(d => d.Year === chosenYear && d.Extent != null && d.DayOfYear);
    if (chosen.length === 0) {
      ref.current.innerHTML = `<p class="text-gray-500 p-2">No daily data for ${chosenYear}.</p>`;
      return;
    }

    const anomalies = chosen.map(d => ({
      dayOfYear: d.DayOfYear,
      anomaly: (d.Extent ?? 0) - (baseline.get(d.DayOfYear) ?? 0)
    }));
    anomalies.sort((a,b) => a.dayOfYear - b.dayOfYear);

    const rect = ref.current.getBoundingClientRect();
    const w = rect.width || 600;
    const h = 400;
    const margin = { top: 30, right: 30, bottom: 40, left: 60 };

    const xExtent = d3.extent(anomalies, d => d.dayOfYear) as [number, number];
    const [minA, maxA] = d3.extent(anomalies, d => d.anomaly) as [number, number];

    const xScale = d3.scaleLinear()
      .domain(xExtent)
      .range([margin.left, w - margin.right]);

    const yScale = d3.scaleLinear()
      .domain([Math.min(0, minA), Math.max(0, maxA)])
      .range([h - margin.bottom, margin.top])
      .nice();

    const svg = d3.select(ref.current)
      .append("svg")
      .attr("width", w)
      .attr("height", h);

    const xAxis = d3.axisBottom<number>(xScale).tickFormat(d3.format("d")).ticks(12);
    const yAxis = d3.axisLeft<number>(yScale).ticks(6);

    svg.append("g")
      .attr("transform", `translate(0,${h - margin.bottom})`)
      .call(xAxis);
    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(yAxis);

    svg.append("line")
      .attr("x1", xScale(xExtent[0]))
      .attr("x2", xScale(xExtent[1]))
      .attr("y1", yScale(0))
      .attr("y2", yScale(0))
      .attr("stroke", "#333")
      .attr("stroke-dasharray", "2,2");

    const lineGen = d3.line<typeof anomalies[0]>()
      .x(d => xScale(d.dayOfYear))
      .y(d => yScale(d.anomaly))
      .curve(d3.curveMonotoneX);

    svg.append("path")
      .datum(anomalies)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", lineGen as any);

    svg.append("text")
      .attr("x", margin.left)
      .attr("y", margin.top - 10)
      .style("font-weight", "bold")
      .text(`Daily Anomalies for Year ${chosenYear}`);
  }, [data, chosenYear]);

  return <div ref={ref} />;
}
