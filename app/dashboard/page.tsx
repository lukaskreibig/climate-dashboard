"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

type DataRecord = {
  Year: number;
  Glob: number;
  [key: string]: any;
};

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DataRecord[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);

  // Fetch data from the API endpoint.
  useEffect(() => {
    fetch("/api/data")
      .then((res) => res.json())
      .then((jsonData: DataRecord[]) => setData(jsonData))
      .catch((err) => console.error("Error fetching data:", err));
  }, []);

  // Render the D3 chart when data is available.
  useEffect(() => {
    if (!data.length) return;
    
    // Clear any previous chart content.
    d3.select(chartRef.current).selectAll("*").remove();

    // Set dimensions and margins.
    const margin = { top: 20, right: 30, bottom: 50, left: 60 },
          width = 800 - margin.left - margin.right,
          height = 500 - margin.top - margin.bottom;

    // Append the SVG object.
    const svg = d3.select(chartRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Extract data for plotting.
    const years = data.map((d) => +d.Year);
    const globalAnomaly = data.map((d) => +d.Glob);

    // Define scales.
    const xScale = d3.scaleLinear()
      .domain(d3.extent(years) as [number, number])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([d3.min(globalAnomaly) ?? 0, d3.max(globalAnomaly) ?? 0])
      .range([height, 0]);

    // Add the x-axis.
    svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")))
      .append("text")
      .attr("x", width / 2)
      .attr("y", 40)
      .attr("fill", "#000")
      .text("Year");

    // Add the y-axis.
    svg.append("g")
      .call(d3.axisLeft(yScale))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -50)
      .attr("fill", "#000")
      .text("Global Temperature Anomaly (°C)");

    // Create a line generator.
    const line = d3.line<number>()
      .x((d, i) => xScale(years[i]))
      .y((d) => yScale(d));

    // Append the line path.
    svg.append("path")
      .datum(globalAnomaly)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Add circles for data points.
    svg.selectAll("circle")
      .data(globalAnomaly)
      .enter()
      .append("circle")
      .attr("cx", (d, i) => xScale(years[i]))
      .attr("cy", (d) => yScale(d))
      .attr("r", 3)
      .attr("fill", "red");

  }, [data]);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Climate Dashboard (D3.js)</h1>
      <div ref={chartRef}></div>
      <p>This chart shows the Global Temperature Anomaly over time.</p>
    </div>
  );
};

export default Dashboard;
