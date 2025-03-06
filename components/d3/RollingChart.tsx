"use client";
import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

interface DailySeaIceRow {
  Year: number;
  Extent?: number;
  DateStr?: string;
}

interface RollingProps {
  data: DailySeaIceRow[];
}

export default function RollingChart({ data }: RollingProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data || !ref.current) return;
    ref.current.innerHTML = "";

    // Sort by DateStr
    const dailyData = data
      .filter(d => d.DateStr && d.Extent != null)
      .map(d => ({ ...d, dateObj: new Date(d.DateStr!) }));
    dailyData.sort((a,b) => a.dateObj.valueOf() - b.dateObj.valueOf());
    if (dailyData.length === 0) {
      ref.current.innerHTML = `<p class="text-gray-500 p-2">No valid date/extent data.</p>`;
      return;
    }

    // 365 rolling
    let sum = 0;
    let queue: number[] = [];
    const windowSize = 365;
    const rollingArr: { date: Date; rolling: number }[] = [];

    for (let i = 0; i < dailyData.length; i++) {
      sum += dailyData[i].Extent!;
      queue.push(dailyData[i].Extent!);
      if (queue.length > windowSize) {
        sum -= queue.shift()!;
      }
      const avg = sum / queue.length;
      rollingArr.push({ date: dailyData[i].dateObj, rolling: avg });
    }

    const rect = ref.current.getBoundingClientRect();
    const w = rect.width || 600;
    const h = 400;
    const margin = { top: 30, right: 30, bottom: 40, left: 60 };

    const xExtent = d3.extent(rollingArr, d => d.date) as [Date, Date];
    const yExtent = d3.extent(rollingArr, d => d.rolling) as [number, number];

    const xScale = d3.scaleTime()
      .domain(xExtent)
      .range([margin.left, w - margin.right]);
    const yScale = d3.scaleLinear()
      .domain(yExtent)
      .range([h - margin.bottom, margin.top])
      .nice();

    const svg = d3.select(ref.current)
      .append("svg")
      .attr("width", w)
      .attr("height", h);

    const xAxis = d3.axisBottom<Date>(xScale).ticks(6);
    const yAxis = d3.axisLeft<number>(yScale).ticks(6);

    svg.append("g")
      .attr("transform", `translate(0,${h - margin.bottom})`)
      .call(xAxis);
    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(yAxis);

    const lineGen = d3.line<{ date: Date; rolling: number }>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.rolling))
      .curve(d3.curveMonotoneX);

    svg.append("path")
      .datum(rollingArr)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", lineGen as any);

    // optional label
    svg.append("text")
      .attr("x", margin.left)
      .attr("y", margin.top - 10)
      .attr("fill", "#333")
      .style("font-weight", "bold")
      .text("365-Day Rolling Average");
  }, [data]);

  return <div ref={ref} />;
}
