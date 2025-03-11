"use client";
import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

export interface DailySeaIceRowSeasonal {
  Year: number;
  DayOfYear: number;
  Extent?: number;
}

interface SeasonalProps {
  data: DailySeaIceRowSeasonal[];
}

export default function SeasonalLinesChart({ data }: SeasonalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data || !ref.current) return;
    ref.current.innerHTML = "";

    const valid = data.filter(d => d.DayOfYear != null && d.Extent != null);
    if (valid.length === 0) {
      ref.current.innerHTML = `<p class="text-gray-500 p-2">No daily data found.</p>`;
      return;
    }

    const byYear = d3.group(valid, d => d.Year);
    const years = Array.from(byYear.keys()).sort();
    if (years.length === 0) {
      ref.current.innerHTML = `<p class="text-gray-500 p-2">No valid years found.</p>`;
      return;
    }

    const minYear = years[0];
    const maxYear = years[years.length - 1];

    const rect = ref.current.getBoundingClientRect();
    const w = rect.width || 600;
    const h = 400;
    const margin = { top: 40, right: 40, bottom: 50, left: 60 };

    const svg = d3.select(ref.current)
      .append("svg")
      .attr("width", w)
      .attr("height", h)
      .style("margin-bottom","2rem");

    const xScale = d3.scaleLinear()
      .domain([1, 366])
      .range([margin.left, w - margin.right]);

    const allVals = valid.map(d => d.Extent!);
    const [minE, maxE] = d3.extent(allVals) as [number, number];
    const yScale = d3.scaleLinear()
      .domain([minE, maxE])
      .nice()
      .range([h - margin.bottom, margin.top]);

    const xAxis = d3.axisBottom<number>(xScale).tickFormat(d3.format("d")).ticks(12);
    const yAxis = d3.axisLeft<number>(yScale).ticks(6);

    svg.append("g")
      .attr("transform", `translate(0, ${h - margin.bottom})`)
      .call(xAxis);

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(yAxis);

    // color scale
    const colorScale = d3.scaleSequential<number>()
      .domain([minYear, maxYear])
      .interpolator(d3.interpolateTurbo);

    const lineGen = d3.line<DailySeaIceRowSeasonal>()
      .x(d => xScale(d.DayOfYear))
      .y(d => yScale(d.Extent!))
      .curve(d3.curveMonotoneX);

    // tooltip
    const tooltip = d3.select(ref.current)
      .append("div")
      .style("position", "absolute")
      .style("pointer-events","none")
      .style("background","rgba(0,0,0,0.7)")
      .style("color","#fff")
      .style("padding","5px 10px")
      .style("border-radius","4px")
      .style("font-size","0.75rem")
      .style("opacity",0);

    // for each year, draw line
    years.forEach(year => {
      const arr = byYear.get(year)!;
      arr.sort((a,b) => a.DayOfYear - b.DayOfYear);

      const path = svg.append("path")
        .datum(arr)
        .attr("fill","none")
        .attr("stroke", colorScale(year))
        .attr("stroke-width", 1.5)
        .attr("d", lineGen as any);

      // invisible line
      svg.append("path")
        .datum(arr)
        .attr("fill","none")
        .attr("stroke","rgba(0,0,0,0)")
        .attr("stroke-width", 8)
        .attr("d", lineGen as any)
        .on("mousemove",(event) => {
          path.attr("stroke-width",3);
          tooltip
            .style("left",(event.offsetX+20)+"px")
            .style("top",(event.offsetY+142)+"px")
            .style("opacity",1)
            .html(`Year: <strong>${year}</strong>`);
        })
        .on("mouseleave",() => {
          path.attr("stroke-width",1.5);
          tooltip.style("opacity",0);
        });
    });

    // A color bar legend from minYear to maxYear
    const legendWidth = 120;
    const legendHeight = 12;

    // build a scale for the legend
    const legendScale = d3.scaleLinear()
      .domain([minYear, maxYear])
      .range([0, legendWidth]);

    // We create an axis to label the minYear → maxYear
    const legendAxis = d3.axisBottom(legendScale)
      .tickValues([minYear, maxYear])
      .tickFormat(d3.format("d"));

    // define a gradient
    const defs = svg.append("defs");
    const gradientId = "yearGradient";
    const gradient = defs.append("linearGradient")
      .attr("id", gradientId)
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "100%").attr("y2","0%");

    // We'll create small steps
    const numStops = 10;
    d3.range(numStops).forEach(i => {
      const t = i / (numStops - 1);
      const yearVal = minYear + t*(maxYear - minYear);
      gradient.append("stop")
        .attr("offset", t)
        .attr("stop-color", colorScale(yearVal));
    });

    // place legend near top (for example)
    const legendX = w - margin.right - legendWidth - 10;
    const legendY = margin.top - 25;

    // rectangle for color
    svg.append("rect")
      .attr("x", legendX)
      .attr("y", legendY)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", `url(#${gradientId})`);

    // axis
    const legendAxisG = svg.append("g")
      .attr("transform", `translate(${legendX}, ${legendY + legendHeight})`)
      .call(legendAxis);
    
    legendAxisG.select(".domain").remove();
  }, [data]);

  return <div ref={ref} />;
}
