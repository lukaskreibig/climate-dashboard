"use client";

import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

export interface AnnualRowBar {
  Year: number;
  "64N-90N"?: number | null;
  Glob?: number | null;
}

interface Bar2024Props {
  data: AnnualRowBar[];
}

export default function BarChart2024({ data }: Bar2024Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data || !ref.current) return;
    ref.current.innerHTML = "";

    const row2024 = data.find(d => d.Year === 2024);
    if (!row2024 || row2024["64N-90N"] == null || row2024.Glob == null) {
      ref.current.innerHTML = `<p class="text-gray-500 p-2">No 2024 data found for Arctic/Global.</p>`;
      return;
    }

    const summary = [
      { location: "Arctic", value: row2024["64N-90N"] },
      { location: "Global", value: row2024.Glob }
    ];

    const rect = ref.current.getBoundingClientRect();
    const w = rect.width || 600;
    const h = 400;
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };

    const svg = d3.select(ref.current)
      .append("svg")
      .attr("width", w)
      .attr("height", h)
      // spacing
      .style("margin-bottom", "2rem");

    const xScale = d3.scaleBand()
      .domain(summary.map(d => d.location))
      .range([margin.left, w - margin.right])
      .padding(0.3);

    const [mn, mx] = d3.extent(summary.map(d => d.value)) as [number, number];
    const yScale = d3.scaleLinear()
      .domain([Math.min(0, mn), Math.max(0, mx)])
      .range([h - margin.bottom, margin.top])
      .nice();

    const xAxis = d3.axisBottom<string>(xScale).tickSizeOuter(0);
    const yAxis = d3.axisLeft<number>(yScale).ticks(5);

    svg.append("g")
      .attr("transform", `translate(0, ${h - margin.bottom})`)
      .call(xAxis);
    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(yAxis);

    // zero line
    svg.append("line")
      .attr("x1", margin.left)
      .attr("x2", w - margin.right)
      .attr("y1", yScale(0))
      .attr("y2", yScale(0))
      .attr("stroke", "#333")
      .attr("stroke-dasharray", "2,2");

    const colorMap: Record<string, string> = {
      Arctic: "red",
      Global: "blue"
    };

    const tooltip = d3.select(ref.current)
      .append("div")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("background", "rgba(0,0,0,0.7)")
      .style("color", "#fff")
      .style("padding", "6px 10px")
      .style("border-radius", "4px")
      .style("font-size", "0.75rem")
      .style("opacity", 0);

    // draw bars
    svg.selectAll(".bar-2024")
      .data(summary)
      .enter()
      .append("rect")
      .attr("class", "bar-2024")
      .attr("x", d => xScale(d.location)!)
      .attr("width", xScale.bandwidth())
      .attr("y", d => yScale(d.value))
      .attr("height", d => Math.abs(yScale(d.value) - yScale(0)))
      .attr("fill", d => colorMap[d.location])
      .on("mouseover", function() {
        d3.select(this).transition().duration(100).attr("opacity", 0.7);
      })
      .on("mouseout", function() {
        d3.select(this).transition().duration(100).attr("opacity", 1);
      })
      .on("mousemove", (event, d) => {
        tooltip
          .style("left",(event.offsetX+4)+"px")
          .style("top",(event.offsetY+122)+"px")
          .style("opacity", 1)
          .html(`
            <div class="font-semibold text-sm mb-1">${d.location}</div>
            <div>Value: <strong>${d.value.toFixed(3)}</strong></div>
          `);
      })
      .on("mouseleave", () => tooltip.style("opacity", 0));

  }, [data]);

  return <div ref={ref} />;
}
