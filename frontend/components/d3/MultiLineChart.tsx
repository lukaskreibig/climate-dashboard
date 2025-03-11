"use client";
import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";

export interface AnnualRowMulti {
  Year: number;
  Glob?: number | null;
  "64N-90N"?: number | null;
  GlobalCO2Mean?: number | null;
}

interface MultiLineChartProps {
  data: AnnualRowMulti[];
}

export default function MultiLineChart({ data }: MultiLineChartProps) {
  const ref = useRef<HTMLDivElement>(null);

  // State for toggling lines
  const [linesActive, setLinesActive] = useState({
    Arctic: true,
    Global: true,
    CO2: true,
  });

  useEffect(() => {
    if (!data || !ref.current) return;
    ref.current.innerHTML = "";

    // Filter valid data by Year
    const valid = data.filter(d => d.Year != null);
    if (valid.length === 0) {
      ref.current.innerHTML = `<p class="text-gray-500 p-2">No data available.</p>`;
      return;
    }
    valid.sort((a, b) => a.Year - b.Year);

    const rect = ref.current.getBoundingClientRect();
    const width = rect.width || 600;
    const height = 400;
    const margin = { top: 30, right: 120, bottom: 40, left: 60 };

    const svg = d3.select(ref.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("margin-bottom", "2rem");

    // Lines config
    const lines = [
      {
        key: "Arctic",
        label: "Arctic",
        color: "#ef4444",
        active: linesActive.Arctic,
        accessor: (d: AnnualRowMulti) => d["64N-90N"] ?? null,
      },
      {
        key: "Global",
        label: "Global",
        color: "#3b82f6",
        active: linesActive.Global,
        accessor: (d: AnnualRowMulti) => d.Glob ?? null,
      },
      {
        key: "CO2",
        label: "CO₂",
        color: "#10b981",
        active: linesActive.CO2,
        accessor: (d: AnnualRowMulti) => d.GlobalCO2Mean ?? null,
      },
    ];

    // X scale: based on Year
    const xExtent = d3.extent(valid, d => d.Year) as [number, number];
    const xScale = d3.scaleLinear()
      .domain(xExtent)
      .range([margin.left, width - margin.right]);

    // Primary Y scale for temperatures (Arctic & Global)
    const combinedTemp: number[] = [];
    lines.forEach(line => {
      if (line.key !== "CO2" && line.active) {
        valid.forEach(d => {
          const val = line.accessor(d);
          if (val !== null) combinedTemp.push(val);
        });
      }
    });
    const [minTemp, maxTemp] = d3.extent(combinedTemp) as [number, number];
    const yScaleTemp = d3.scaleLinear()
      .domain([minTemp, maxTemp])
      .range([height - margin.bottom, margin.top])
      .nice();

    // Secondary Y scale for CO₂ values
    const co2Vals = valid.map(d => d.GlobalCO2Mean).filter(v => v != null) as number[];
    const [minCO2, maxCO2] = d3.extent(co2Vals) as [number, number];
    const yScaleCO2 = d3.scaleLinear()
      .domain([minCO2, maxCO2])
      .range([height - margin.bottom, margin.top])
      .nice();

    // Create axes
    const xAxis = d3.axisBottom<number>(xScale)
      .tickFormat(d3.format("d"))
      .ticks(6);
    const yAxisLeft = d3.axisLeft<number>(yScaleTemp)
      .ticks(6);
    const yAxisRight = d3.axisRight<number>(yScaleCO2)
      .ticks(6)
      .tickFormat(d => (typeof d === "number" ? (d / 1e9).toFixed(2) + " Gt" : d));

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(xAxis);

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(yAxisLeft)
      .append("text")
      .attr("fill", "#000")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 15)
      .attr("x", -((height - margin.top - margin.bottom) / 2))
      .attr("dy", "0.7em")
      .style("text-anchor", "middle")
      .text("Temperature Anomaly (°C)");

    svg.append("g")
      .attr("transform", `translate(${width - margin.right},0)`)
      .call(yAxisRight)
      .append("text")
      .attr("fill", "#000")
      .attr("transform", "rotate(90)")
      .attr("y", -margin.right + 15)
      .attr("x", (height - margin.top - margin.bottom) / 2)
      .attr("dy", "-0.7em")
      .style("text-anchor", "middle")
      .text("CO₂ (Gt)");

    // Tooltip for D3
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

    // Draw each active line
    lines.forEach(line => {
      if (!line.active) return;
      const lineGen = d3.line<AnnualRowMulti>()
        .defined(d => line.accessor(d) != null)
        .x(d => xScale(d.Year!))
        .y(d => {
          if (line.key === "CO2") {
            return yScaleCO2(line.accessor(d)!);
          } else {
            return yScaleTemp(line.accessor(d)!);
          }
        })
        .curve(d3.curveMonotoneX);

      const path = svg.append("path")
        .datum(valid)
        .attr("fill", "none")
        .attr("stroke", line.color)
        .attr("stroke-width", 2)
        .attr("d", lineGen as any);

      const pathLength = (path.node() as SVGPathElement).getTotalLength();
      path.attr("stroke-dasharray", `${pathLength} ${pathLength}`)
        .attr("stroke-dashoffset", pathLength)
        .transition()
        .duration(1500)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0);

      // Draw circles for tooltip on this line
      const circleData = valid.filter(d => line.accessor(d) != null);
      svg.selectAll(`circle.${line.key}`)
        .data(circleData)
        .enter()
        .append("circle")
        .attr("class", line.key)
        .attr("cx", d => xScale(d.Year!))
        .attr("cy", d => {
          if (line.key === "CO2") {
            return yScaleCO2(line.accessor(d)!);
          } else {
            return yScaleTemp(line.accessor(d)!);
          }
        })
        .attr("r", 4)
        .attr("fill", line.color)
        .attr("opacity", 0.8)
        .on("mouseover", function () {
          d3.select(this).transition().duration(200).attr("r", 6);
        })
        .on("mouseout", function () {
          d3.select(this).transition().duration(200).attr("r", 4);
        })
        .on("mousemove", (event, d) => {
          const rawValue = line.accessor(d)!;
          const displayValue =
            line.key === "CO2" ? (rawValue / 1e9).toFixed(2) + " Gt" : rawValue.toFixed(2);
          tooltip
            .style("left", (event.offsetX + 17) + "px")
            .style("top", (event.offsetY + 122) + "px")
            .style("opacity", 1)
            .html(`
              <div class="font-semibold">${line.label}</div>
              <div>Year: ${d.Year}</div>
              <div>Value: ${displayValue}</div>
            `);
        })
        .on("mouseleave", () => tooltip.style("opacity", 0));
    });

    // Clickable legend to toggle lines
    let legendY = margin.top;
    const legendG = svg.append("g");

    lines.forEach(line => {
      const item = legendG.append("g")
        .attr("transform", `translate(${width - margin.right + 10}, ${legendY})`)
        .style("cursor", "pointer")
        .on("click", () => {
          setLinesActive(prev => ({
            ...prev,
            [line.key]: !prev[line.key as keyof typeof prev],
          }));
        });

      item.append("rect")
        .attr("width", 14)
        .attr("height", 14)
        .attr("fill", line.active ? line.color : "#ccc");

      item.append("text")
        .attr("x", 20)
        .attr("y", 12)
        .text(line.label)
        .style("font-size", "0.8rem")
        .attr("fill", line.active ? "#333" : "#999");

      legendY += 20;
    });
  }, [data, linesActive]);

  return <div ref={ref} />;
}
