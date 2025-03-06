"use client";
import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

/**
 * Each row: { Year, AnnualAnomaly }
 */
interface Row { 
  Year: number; 
  AnnualAnomaly: number | null; 
}

interface Props {
  data: Row[];
}

export default function AnnualAnomalyBarChartD3({ data }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data || !ref.current) return;
    ref.current.innerHTML = "";

    // Filter out rows with missing values
    const valid = data.filter(d => d.Year != null && d.AnnualAnomaly != null) as Required<Row>[];

    if (valid.length === 0) {
      ref.current.innerHTML = `<p class="text-gray-500 p-2">No annual anomaly data found.</p>`;
      return;
    }

    // Sort by Year
    valid.sort((a, b) => a.Year - b.Year);

    const margin = { top: 30, right: 30, bottom: 60, left: 60 };
    const w = ref.current.getBoundingClientRect().width || 600;
    const h = 400;

    const svg = d3.select(ref.current)
      .append("svg")
      .attr("width", w)
      .attr("height", h);

    // Create a scaleBand for the x-axis based on the years as strings
    const xScale = d3.scaleBand()
      .domain(valid.map(d => String(d.Year)))
      .range([margin.left, w - margin.right])
      .padding(0.2);

    // Calculate tick values for every 10 years
    const domainYears = valid.map(d => d.Year);
    const minYear = Math.min(...domainYears);
    const maxYear = Math.max(...domainYears);
    // Generate ticks every 10 years
    const tickYears = d3.range(Math.ceil(minYear / 10) * 10, maxYear + 1, 10).map(String);

    const [minA, maxA] = d3.extent(valid.map(d => d.AnnualAnomaly)) as [number, number];
    const absMax = Math.max(Math.abs(minA), Math.abs(maxA));
    const yScale = d3.scaleLinear()
      .domain([-absMax, absMax])
      .range([h - margin.bottom, margin.top])
      .nice();

    // Create a diverging color scale: red for negative, blue for positive
    const colorScale = d3.scaleLinear<string>()
      .domain([-absMax, 0, absMax])
      .range(["red", "white", "blue"]);

    // Create the x-axis with custom tick values
    const xAxis = d3.axisBottom(xScale)
      .tickValues(tickYears)
      .tickSizeOuter(0);

    // Create the y-axis
    const yAxis = d3.axisLeft(yScale).ticks(5);

    svg.append("g")
      .attr("transform", `translate(0,${h - margin.bottom})`)
      .call(xAxis)
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .attr("text-anchor", "end")
      .attr("dy", ".35em")
      .attr("dx", "-.5em");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(yAxis);

    // Zero line
    svg.append("line")
      .attr("x1", margin.left)
      .attr("x2", w - margin.right)
      .attr("y1", yScale(0))
      .attr("y2", yScale(0))
      .attr("stroke", "#000")
      .attr("stroke-dasharray", "3,3");

    // Tooltip
    const tooltip = d3.select(ref.current).append("div")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("background", "rgba(0,0,0,0.7)")
      .style("color", "#fff")
      .style("padding", "5px 10px")
      .style("border-radius", "4px")
      .style("font-size", "0.75rem")
      .style("opacity", 0);

    // Draw the bars
    svg.selectAll("rect.bar")
      .data(valid)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(String(d.Year))!)
      .attr("width", xScale.bandwidth())
      .attr("fill", d => colorScale(d.AnnualAnomaly))
      .attr("y", yScale(0))
      .attr("height", 0)
      .on("mouseover", function () {
        d3.select(this).transition().duration(150).attr("opacity", 0.7);
      })
      .on("mouseout", function () {
        d3.select(this).transition().duration(150).attr("opacity", 1);
      })
      .on("mousemove", (evt, d) => {
        tooltip
          .style("left", (evt.offsetX + 17) + "px")
          .style("top", (evt.offsetY + 122) + "px")
          .style("opacity", 1)
          .html(`
            <div class="font-semibold text-sm mb-1">${d.Year}</div>
            <div>Anomaly: ${d.AnnualAnomaly.toFixed(3)}</div>
          `);
      })
      .on("mouseleave", () => tooltip.style("opacity", 0))
      .transition()
      .duration(800)
      .attr("y", d => d.AnnualAnomaly >= 0 ? yScale(d.AnnualAnomaly) : yScale(0))
      .attr("height", d => Math.abs(yScale(d.AnnualAnomaly) - yScale(0)));
  }, [data]);

  return <div ref={ref} />;
}
