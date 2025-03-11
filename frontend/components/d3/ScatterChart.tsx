"use client";

import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

export interface AnnualRowScatter {
  Year: number;
  Glob?: number | null;
  SeaIceMean?: number | null;
}

interface ScatterProps {
  data: AnnualRowScatter[];
}

export default function ScatterChart({ data }: ScatterProps) {
  const ref = useRef<HTMLDivElement>(null);

  function linearRegression(x: number[], y: number[]) {
    const n = x.length;
    const meanX = d3.mean(x) ?? 0;
    const meanY = d3.mean(y) ?? 0;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      num += dx * dy;
      den += dx * dx;
    }
    const slope = num / den;
    const intercept = meanY - slope * meanX;
    return { slope, intercept };
  }

  useEffect(() => {
    if (!data || !ref.current) return;
    ref.current.innerHTML = "";

    const valid = data.filter(d => d.Year != null && d.Glob != null && d.SeaIceMean != null);
    if (valid.length === 0) {
      ref.current.innerHTML = `<p class="text-gray-500 p-2">No data for scatter.</p>`;
      return;
    }

    const rect = ref.current.getBoundingClientRect();
    const w = rect.width || 600;
    const h = 400;
    const margin = { top: 20, right: 110, bottom: 50, left: 60 };

    const svg = d3.select(ref.current)
      .append("svg")
      .attr("width", w)
      .attr("height", h)
      // add margin for spacing
      .style("margin-bottom", "2rem");

    const xExtent = d3.extent(valid, d => d.Glob!) as [number, number];
    const yExtent = d3.extent(valid, d => d.SeaIceMean!) as [number, number];

    const xScale = d3.scaleLinear()
      .domain(xExtent)
      .range([margin.left, w - margin.right])
      .nice();
    const yScale = d3.scaleLinear()
      .domain(yExtent)
      .range([h - margin.bottom, margin.top])
      .nice();

    const xAxis = d3.axisBottom<number>(xScale).ticks(6);
    const yAxis = d3.axisLeft<number>(yScale).ticks(6);

    svg.append("g")
      .attr("transform", `translate(0,${h - margin.bottom})`)
      .call(xAxis);
    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(yAxis);

    // do linear regression
    const xVals = valid.map(d => d.Glob!);
    const yVals = valid.map(d => d.SeaIceMean!);
    const { slope, intercept } = linearRegression(xVals, yVals);

    const [xMin, xMax] = xExtent;
    const yMinPred = slope * xMin + intercept;
    const yMaxPred = slope * xMax + intercept;

    // The main trend line
    const trendLine = svg.append("line")
      .attr("x1", xScale(xMin))
      .attr("y1", yScale(yMinPred))
      .attr("x2", xScale(xMax))
      .attr("y2", yScale(yMaxPred))
      .attr("stroke", "darkorange")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "3,3");

    // add an invisible line for hover
    const invisibleLine = svg.append("line")
      .attr("x1", xScale(xMin))
      .attr("y1", yScale(yMinPred))
      .attr("x2", xScale(xMax))
      .attr("y2", yScale(yMaxPred))
      .attr("stroke", "rgba(0,0,0,0)")
      .attr("stroke-width", 10);

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

    // hover on the invisible line
    invisibleLine
      .on("mousemove", (event) => {
        trendLine.attr("stroke", "darkorange"); 
        tooltip
          .style("left",(event.offsetX+20)+"px")
          .style("top",(event.offsetY+102)+"px")
          .style("opacity", 1)
          .html(`
            <div><strong>Trendline</strong></div>
            <div>Slope: ${slope.toFixed(3)}</div>
            <div>Intercept: ${intercept.toFixed(3)}</div>
          `);
      })
      .on("mouseleave", () => {
        tooltip.style("opacity", 0);
      });

    // draw scatter points
    svg.selectAll(".dot")
      .data(valid)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", d => xScale(d.Glob!))
      .attr("cy", d => yScale(d.SeaIceMean!))
      .attr("r", 0)
      .attr("fill", "steelblue")
      .on("mouseover", function() {
        d3.select(this).transition().duration(200).attr("r", 6);
      })
      .on("mouseout", function() {
        d3.select(this).transition().duration(200).attr("r", 4);
      })
      .on("mousemove", (event, d) => {
        tooltip
          .style("left",(event.offsetX+20)+"px")
          .style("top",(event.offsetY+102)+"px")
          .style("opacity", 1)
          .html(`
            <div class="font-semibold">Year: ${d.Year}</div>
            <div>Global Temp: ${(d.Glob!).toFixed(3)}</div>
            <div>Sea Ice: ${(d.SeaIceMean!).toFixed(3)}</div>
          `);
      })
      .on("mouseleave", () => tooltip.style("opacity", 0))
      .transition()
      .duration(800)
      .delay((_, i) => i * 10)
      .attr("r", 4);

    // legend on the right
    const legendX = w - margin.right + 10;
    let legendY = margin.top;
    // Dot item
    svg.append("circle")
      .attr("cx", legendX)
      .attr("cy", legendY + 6)
      .attr("r", 6)
      .attr("fill", "steelblue");
    svg.append("text")
      .attr("x", legendX + 14)
      .attr("y", legendY + 10)
      .text("Data points")
      .style("font-size", "0.8rem")
      .attr("fill", "#333");
    legendY += 24;
    // Trendline item
    svg.append("line")
      .attr("x1", legendX - 2)
      .attr("y1", legendY + 6)
      .attr("x2", legendX + 16)
      .attr("y2", legendY + 6)
      .attr("stroke", "darkorange")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "3,3");
    svg.append("text")
      .attr("x", legendX + 20)
      .attr("y", legendY + 10)
      .text("Trendline")
      .style("font-size", "0.8rem")
      .attr("fill", "#333");
  }, [data]);

  return <div ref={ref} />;
}
