"use client";

import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

export interface DailySeaIceRowIQR {
  Year: number;
  DayOfYear: number;
  Extent?: number;
}

interface IQRChartProps {
  data: DailySeaIceRowIQR[];
}

export default function IQRChart({ data }: IQRChartProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data || !ref.current) return;
    ref.current.innerHTML = "";

    // Exclude 2025
    const main = data.filter(d => d.Year !== 2025 && d.Extent != null);
    const partial2025 = data.filter(d => d.Year === 2025 && d.Extent != null);

    if (main.length === 0) {
      ref.current.innerHTML = `<p class="text-gray-500 p-2">No data for IQR chart.</p>`;
      return;
    }

    const grouped = d3.group(main, d => d.DayOfYear);
    interface Stats {
      dayOfYear: number;
      minVal: number;
      q25: number;
      q75: number;
      meanVal: number;
    }
    const stats: Stats[] = [];
    grouped.forEach((arr, doy) => {
      const exts = arr.map(d => d.Extent!).sort((a,b) => a - b);
      stats.push({
        dayOfYear: +doy,
        minVal: d3.min(exts) ?? 0,
        q25: d3.quantile(exts,0.25) ?? 0,
        q75: d3.quantile(exts,0.75) ?? 0,
        meanVal: d3.mean(exts) ?? 0
      });
    });
    stats.sort((a,b) => a.dayOfYear - b.dayOfYear);

    const rect = ref.current.getBoundingClientRect();
    const w = rect.width || 600;
    const h = 400;
    const margin = { top: 40, right: 40, bottom: 40, left: 60 };

    const allVals: number[] = [];
    stats.forEach(s => {
      allVals.push(s.minVal, s.q25, s.q75, s.meanVal);
    });
    if (partial2025.length > 0) {
      const pMin = d3.min(partial2025, d => d.Extent!) as number;
      const pMax = d3.max(partial2025, d => d.Extent!) as number;
      allVals.push(pMin, pMax);
    }
    const [minY, maxY] = d3.extent(allVals) as [number, number];

    const xScale = d3.scaleLinear()
      .domain([1,366])
      .range([margin.left, w - margin.right]);
    const yScale = d3.scaleLinear()
      .domain([minY, maxY])
      .nice()
      .range([h - margin.bottom, margin.top]);

    const svg = d3.select(ref.current)
      .append("svg")
      .attr("width", w)
      .attr("height", h)
      .style("margin-bottom","2rem");

    const xAxis = d3.axisBottom<number>(xScale).tickFormat(d3.format("d")).ticks(12);
    const yAxis = d3.axisLeft<number>(yScale).ticks(6);

    svg.append("g")
      .attr("transform", `translate(0,${h - margin.bottom})`)
      .call(xAxis);
    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(yAxis);

    // area IQR
    const areaIQR = d3.area<Stats>()
      .x(d => xScale(d.dayOfYear))
      .y0(d => yScale(d.q25))
      .y1(d => yScale(d.q75))
      .curve(d3.curveMonotoneX);

    const iqrPath = svg.append("path")
      .datum(stats)
      .attr("fill","skyblue")
      .attr("opacity",0.4)
      .attr("d", areaIQR as any);

    // mean line
    const lineMean = d3.line<Stats>()
      .x(d => xScale(d.dayOfYear))
      .y(d => yScale(d.meanVal))
      .curve(d3.curveMonotoneX);

    const meanPath = svg.append("path")
      .datum(stats)
      .attr("fill","none")
      .attr("stroke","black")
      .attr("stroke-width",2)
      .attr("d", lineMean as any);

    // min line
    const lineMin = d3.line<Stats>()
      .x(d => xScale(d.dayOfYear))
      .y(d => yScale(d.minVal))
      .curve(d3.curveMonotoneX);

    const minPath = svg.append("path")
      .datum(stats)
      .attr("fill","none")
      .attr("stroke","red")
      .attr("stroke-dasharray","3,3")
      .attr("stroke-width",2)
      .attr("d", lineMin as any);

    // partial 2025
    let partialPath: d3.Selection<SVGPathElement, unknown, null, undefined> | null = null;
    if (partial2025.length > 0) {
      partial2025.sort((a,b)=>a.DayOfYear - b.DayOfYear);
      const line2025 = d3.line<DailySeaIceRowIQR>()
        .x(d=> xScale(d.DayOfYear))
        .y(d=> yScale(d.Extent!))
        .curve(d3.curveMonotoneX);

      partialPath = svg.append("path")
        .datum(partial2025)
        .attr("fill","none")
        .attr("stroke","orange")
        .attr("stroke-width",2)
        .attr("d", line2025 as any);
    }

    // Hover
    const tooltip = d3.select(ref.current)
      .append("div")
      .style("position","absolute")
      .style("pointer-events","none")
      .style("background","rgba(0,0,0,0.7)")
      .style("color","#fff")
      .style("padding","5px 10px")
      .style("border-radius","4px")
      .style("font-size","0.75rem")
      .style("opacity",0);

    function addHoverPath(pathSel: d3.Selection<SVGPathElement,any,null,undefined>, label: string) {
      // create an invisible path
      const node = pathSel.node();
      if(!node) return;
      const cloned = node.cloneNode() as SVGPathElement;
      d3.select(cloned)
        .attr("stroke","rgba(0,0,0,0)")
        .attr("stroke-width",10)
        .on("mousemove",(event)=>{
          pathSel.attr("stroke-width",3);
          tooltip
            .style("left",(event.offsetX+17)+"px")
            .style("top",(event.offsetY+122)+"px")
            .style("opacity",1)
            .html(label);
        })
        .on("mouseleave",()=>{
          pathSel.attr("stroke-width",2);
          tooltip.style("opacity",0);
        });
      node.parentNode?.insertBefore(cloned, node.nextSibling);
    }

    addHoverPath(iqrPath,"IQR (25%-75%)");
    addHoverPath(meanPath,"Mean line");
    addHoverPath(minPath,"Min line");
    if(partialPath) addHoverPath(partialPath,"Partial 2025");

    // legend near top-left corner (within chart)
    const legendItems = [
      { label: "IQR (25%–75%)", color: "skyblue", fillArea: true, dashed:false },
      { label: "Mean", color: "black", fillArea: false, dashed:false },
      { label: "Min", color: "red", fillArea:false, dashed:true },
    ];
    if(partial2025.length > 0){
      legendItems.push({ label:"Partial 2025", color:"orange", fillArea:false, dashed:false});
    }

    const legendG = svg.append("g")
      .attr("transform", `translate(${margin.left+30}, ${margin.top+220})`);

    legendItems.forEach((item,i) => {
      const yPos = i*20;
      if(item.fillArea){
        legendG.append("rect")
          .attr("x",0)
          .attr("y",yPos)
          .attr("width",14)
          .attr("height",14)
          .attr("fill",item.color)
          .attr("opacity",0.4);
      } else {
        legendG.append("line")
          .attr("x1",0)
          .attr("y1",yPos+7)
          .attr("x2",20)
          .attr("y2",yPos+7)
          .attr("stroke",item.color)
          .attr("stroke-width",2)
          .attr("stroke-dasharray",item.dashed?"3,3":"0");
      }
      legendG.append("text")
        .attr("x",25)
        .attr("y",yPos+12)
        .text(item.label)
        .style("font-size","0.8rem")
        .attr("fill","#333");
    });
  }, [data]);

  return <div ref={ref}/>;
}
