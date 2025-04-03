"use client";

import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

export interface AnnualRowHeat {
  Year: number;
  Glob?: number | null;        // global temperature
  "64N-90N"?: number | null;   // arctic temperature
  GlobalCO2Mean?: number | null; 
}

interface HeatmapProps {
  data: AnnualRowHeat[];
}

export default function HeatmapChart({ data }: HeatmapProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data || !ref.current) return;
    ref.current.innerHTML = "";

    // Filter data for valid rows
    const valid = data.filter(
      d => d.Glob != null && d["64N-90N"] != null && d.GlobalCO2Mean != null
    );
    if (valid.length === 0) {
      ref.current.innerHTML = `<p class="text-gray-500 p-2">No data for correlation heatmap.</p>`;
      return;
    }

    // correlation helper
    function correlation(a: number[], b: number[]) {
      const n = a.length;
      const meanA = d3.mean(a) ?? 0;
      const meanB = d3.mean(b) ?? 0;
      let num = 0;
      let denA = 0;
      let denB = 0;
      for (let i = 0; i < n; i++) {
        const da = a[i] - meanA;
        const db = b[i] - meanB;
        num += da * db;
        denA += da * da;
        denB += db * db;
      }
      return num / Math.sqrt(denA * denB);
    }

    // Build arrays of values
    const globVals = valid.map(d => d.Glob!);
    const arcVals = valid.map(d => d["64N-90N"]!);
    const co2Vals = valid.map(d => d.GlobalCO2Mean!);

    const cGA = correlation(globVals, arcVals);
    const cGC = correlation(globVals, co2Vals);
    const cAC = correlation(arcVals, co2Vals);

    // Use shortened labels for brevity
    const variables = ["Global", "Arctic", "CO₂"];

    // Build matrix for the heatmap
    const matrix = [
      { row: "Global", col: "Global", val: 1 },
      { row: "Global", col: "Arctic", val: cGA },
      { row: "Global", col: "CO₂", val: cGC },
      { row: "Arctic", col: "Global", val: cGA },
      { row: "Arctic", col: "Arctic", val: 1 },
      { row: "Arctic", col: "CO₂", val: cAC },
      { row: "CO₂", col: "Global", val: cGC },
      { row: "CO₂", col: "Arctic", val: cAC },
      { row: "CO₂", col: "CO₂", val: 1 }
    ];

    // Increase cellSize for a larger chart
    const cellSize = 120;
    const size = cellSize * variables.length + 120; // additional offset

    // Center the chart container
    const container = d3.select(ref.current)
      .append("div")
      .style("width", size + "px")
      .style("margin", "0 auto")
      .style("text-align", "center");

    // Append SVG for the heatmap
    const svg = container.append("svg")
      .attr("width", size)
      .attr("height", size)
      .style("margin-bottom", "2rem");

    // Offsets for row and column labels
    const leftPad = 120;
    const topPad = 60;

    const xScale = d3.scaleBand()
      .domain(variables)
      .range([leftPad, leftPad + cellSize * variables.length])
      .padding(0);
    const yScale = d3.scaleBand()
      .domain(variables)
      .range([topPad, topPad + cellSize * variables.length])
      .padding(0);

    const colorScale = d3.scaleSequential(d3.interpolateRdBu).domain([1, -1]);

    // Draw heatmap cells
    svg.selectAll("rect")
      .data(matrix)
      .enter()
      .append("rect")
      .attr("x", d => xScale(d.col)!)
      .attr("y", d => yScale(d.row)!)
      .attr("width", xScale.bandwidth())
      .attr("height", yScale.bandwidth())
      .attr("fill", d => colorScale(d.val));

    // Text inside cells (white)
    svg.selectAll(".corr-text")
      .data(matrix)
      .enter()
      .append("text")
      .attr("x", d => xScale(d.col)! + xScale.bandwidth() / 2)
      .attr("y", d => yScale(d.row)! + yScale.bandwidth() / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-size", "0.8rem")
      .attr("fill", "#fff")
      .text(d => d.val.toFixed(2));

    // Row labels (outside the heatmap, left side - black text)
    variables.forEach((v) => {
      svg.append("text")
        .attr("x", leftPad - 10)
        .attr("y", yScale(v)! + yScale.bandwidth() / 2)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .style("font-size", "0.85rem")
        .attr("fill", "#000")
        .text(v);
    });

    // Column labels (above the heatmap - black text)
    variables.forEach((v) => {
      svg.append("text")
        .attr("x", xScale(v)! + xScale.bandwidth() / 2)
        .attr("y", topPad - 10)
        .attr("text-anchor", "middle")
        .style("font-size", "0.85rem")
        .attr("fill", "#000")
        .text(v);
    });
  }, [data]);

  return <div className="w-full h-full" ref={ref} />;
}
