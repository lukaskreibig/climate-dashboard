"use client";
import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";

export interface AnnualRowZ {
  Year: number;
  Arctic_z?: number | null;
  SeaIce_z?: number | null;
  SeaIce_z_inv?: number | null;
  GlobCO2Mean_z?: number | null;
}

interface ZScoreProps {
  data: AnnualRowZ[];
  // initial inversion state can be provided via prop if needed
  inverted?: boolean;
}

export default function ZScoreChart({ data, inverted = false }: ZScoreProps) {
  // Use local state for inversion toggle
  const [localInverted, setLocalInverted] = useState<boolean>(inverted);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data || data.length === 0) return;
    if (!ref.current) return;
    ref.current.innerHTML = "";

    // Filter to only rows that have all needed fields
    const valid = data.filter(d =>
      d.Year != null &&
      d.Arctic_z != null &&
      d.SeaIce_z != null &&
      d.SeaIce_z_inv != null &&
      d.GlobCO2Mean_z != null
    );

    if (valid.length === 0) {
      ref.current.innerHTML = `<p class="text-gray-500 p-2">No Z-score data found.</p>`;
      return;
    }

    // Sort by Year
    valid.sort((a, b) => a.Year - b.Year);

    const rect = ref.current.getBoundingClientRect();
    const w = rect.width || 600;
    const h = 400;
    const margin = { top: 30, right: 150, bottom: 40, left: 60 };

    const svg = d3.select(ref.current)
      .append("svg")
      .attr("width", w)
      .attr("height", h);

    // X scale for Year
    const xExtent = d3.extent(valid, d => d.Year) as [number, number];
    const xScale = d3.scaleLinear()
      .domain(xExtent)
      .range([margin.left, w - margin.right]);

    // Gather all z-values: Arctic_z, GlobCO2Mean_z, and sea ice (depending on localInverted)
    const allVals: number[] = [];
    valid.forEach(d => {
      if (d.Arctic_z != null) allVals.push(d.Arctic_z);
      if (d.GlobCO2Mean_z != null) allVals.push(d.GlobCO2Mean_z);
      if (localInverted && d.SeaIce_z_inv != null) {
        allVals.push(d.SeaIce_z_inv);
      } else if (!localInverted && d.SeaIce_z != null) {
        allVals.push(d.SeaIce_z);
      }
    });
    const [minV, maxV] = d3.extent(allVals) as [number, number];
    const yScale = d3.scaleLinear()
      .domain([minV, maxV])
      .nice()
      .range([h - margin.bottom, margin.top]);

    const xAxis = d3.axisBottom<number>(xScale)
      .tickFormat(d3.format("d"))
      .ticks(6);
    const yAxis = d3.axisLeft<number>(yScale).ticks(6);

    svg.append("g")
      .attr("transform", `translate(0,${h - margin.bottom})`)
      .call(xAxis);
    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(yAxis);

    // Build line definitions
    const lines = [
      {
        key: "Arctic",
        label: "Arctic Temp (z)",
        color: "red",
        accessor: (d: typeof valid[number]) => d.Arctic_z as number
      },
      {
        key: "SeaIce",
        label: localInverted ? "Sea Ice (inverted z)" : "Sea Ice (z)",
        color: "blue",
        accessor: (d: typeof valid[number]) => localInverted ? (d.SeaIce_z_inv as number) : (d.SeaIce_z as number)
      },
      {
        key: "CO2",
        label: "CO₂ (z)",
        color: "orange",
        accessor: (d: typeof valid[number]) => d.GlobCO2Mean_z as number
      }
    ];

    // Tooltip for displaying info on hover
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

    // Draw each line and corresponding circles
    lines.forEach(line => {
      const lineGen = d3.line<typeof valid[number]>()
        .x(d => xScale(d.Year))
        .y(d => yScale(line.accessor(d)))
        .curve(d3.curveCatmullRom.alpha(0.5));

      const path = svg.append("path")
        .datum(valid)
        .attr("fill", "none")
        .attr("stroke", line.color)
        .attr("stroke-width", 2)
        .attr("d", lineGen as any);

      // Animate path drawing
      const pathLength = (path.node() as SVGPathElement).getTotalLength();
      path.attr("stroke-dasharray", `${pathLength} ${pathLength}`)
          .attr("stroke-dashoffset", pathLength)
          .transition()
          .duration(1500)
          .ease(d3.easeCubicOut)
          .attr("stroke-dashoffset", 0);

      // Add circles with hover events
      svg.selectAll(`.dots-${line.key}`)
        .data(valid)
        .enter()
        .append("circle")
        .attr("class", `dots-${line.key}`)
        .attr("cx", d => xScale(d.Year))
        .attr("cy", d => yScale(line.accessor(d)))
        .attr("r", 4)
        .attr("fill", line.color)
        .attr("opacity", 0.9)
        .on("mouseover", function() {
          d3.select(this).transition().duration(150).attr("r", 6);
        })
        .on("mouseout", function() {
          d3.select(this).transition().duration(150).attr("r", 4);
        })
        .on("mousemove", (event, d) => {
          const val = line.accessor(d).toFixed(2);
          tooltip
            .style("left", (event.offsetX + 17) + "px")
            .style("top", (event.offsetY + 102) + "px")
            .style("opacity", 1)
            .html(`
              <div class="font-semibold">${line.label}</div>
              <div>Year: ${d.Year}</div>
              <div>Value: ${val}</div>
            `);
        })
        .on("mouseleave", () => tooltip.style("opacity", 0));
    });

    // Draw legend on the right side
    let legendY = margin.top;
    lines.forEach(line => {
      svg.append("rect")
        .attr("x", w - margin.right + 10)
        .attr("y", legendY)
        .attr("width", 14)
        .attr("height", 14)
        .attr("fill", line.color);
      svg.append("text")
        .attr("x", w - margin.right + 30)
        .attr("y", legendY + 12)
        .text(line.label)
        .style("font-size", "0.8rem")
        .attr("fill", "#333");
      legendY += 20;
    });
  }, [data, localInverted]);

  return (
    <div>
      {/* Inversion toggle placed inline above the chart */}
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <button
          onClick={() => setLocalInverted(prev => !prev)}
          style={{
            padding: "6px 12px",
            border: "none",
            borderRadius: "4px",
            background: "#3b82f6",
            color: "#fff",
            cursor: "pointer"
          }}
        >
          {localInverted ? "Show Normal Sea Ice" : "Invert Sea Ice"}
        </button>
      </div>
      <div ref={ref} />
    </div>
  );
}
