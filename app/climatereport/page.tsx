"use client";

import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import classNames from "classnames";

/** 
 * Adjust these types if your data differs 
 */
interface AnnualRow {
  Year: number;
  Glob?: number | null;
  "64N-90N"?: number | null;
  SeaIceMean?: number | null;
  GlobalCO2Mean?: number | null;
  Arctic_z?: number | null;
  SeaIce_z?: number | null;
  SeaIce_z_inv?: number | null;
  GlobCO2Mean_z?: number | null;
}
interface DailySeaIceRow {
  Year: number;
  DayOfYear: number;
  Extent?: number;
  DateStr?: string;
}
interface DataJSON {
  annual: AnnualRow[];
  dailySeaIce: DailySeaIceRow[];
}

export default function ClimateReportPage() {
  const [annualData, setAnnualData] = useState<AnnualRow[]>([]);
  const [dailyData, setDailyData] = useState<DailySeaIceRow[]>([]);

  // Toggles
  const [linesActive, setLinesActive] = useState({ Arctic: true, Global: true, CO2: true });
  const [seaIceInverted, setSeaIceInverted] = useState(false);
  const [dailyAnomalyYear, setDailyAnomalyYear] = useState(2024);

  // Refs
  const refMultiLine = useRef<HTMLDivElement>(null);
  const refZScore = useRef<HTMLDivElement>(null);
  const refBar2024 = useRef<HTMLDivElement>(null);
  const refScatter = useRef<HTMLDivElement>(null);
  const refHeatmap = useRef<HTMLDivElement>(null);
  const refSeasonal = useRef<HTMLDivElement>(null);
  const refIQR = useRef<HTMLDivElement>(null);
  const refRolling = useRef<HTMLDivElement>(null);
  const refDailyAnomaly = useRef<HTMLDivElement>(null);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/data");
        const json: DataJSON = await res.json();
        const withZ = computeZscores(json.annual);
        setAnnualData(withZ);
        setDailyData(json.dailySeaIce);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    }
    fetchData();
  }, []);

  // Render charts
  useEffect(() => {
    if (annualData.length > 0) {
      createMultiLineChart(refMultiLine.current, annualData, linesActive);
      createZScoreChart(refZScore.current, annualData, seaIceInverted);
      createBar2024(refBar2024.current, annualData);
      createScatterChart(refScatter.current, annualData);
      createCorrelationHeatmap(refHeatmap.current, annualData);
    }
  }, [annualData, linesActive, seaIceInverted]);

  useEffect(() => {
    if (dailyData.length > 0) {
      createSeasonalLines(refSeasonal.current, dailyData);
      createIQRChart(refIQR.current, dailyData);
      createRollingChart(refRolling.current, dailyData);
      createDailyAnomaly(refDailyAnomaly.current, dailyData, dailyAnomalyYear);
    }
  }, [dailyData, dailyAnomalyYear]);

  return (
    <div className="font-sans text-base-content bg-base-200 min-h-screen flex flex-col">

      {/* Navbar */}
      <nav className="navbar bg-primary text-primary-content justify-center py-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Sleek Interactive Climate Report</h1>
          <p className="opacity-80">Explore anomalies, sea ice, CO₂, and more. Interact & enjoy!</p>
        </div>
      </nav>

      {/* Content */}
      <main className="flex justify-center py-6 px-4">
        <div className="w-full max-w-7xl space-y-12">
        <div className="max-w-screen-xl mx-auto space-y-12">

          {/* Intro */}
          <section className="card bg-base-100 shadow-xl">
            <div className="card-body items-center text-center">
              <h2 className="card-title text-2xl font-semibold">Introduction</h2>
              <p className="max-w-2xl">
                This report explores temperature anomalies, Arctic warming, sea ice extent, 
                and CO₂ trends. Scroll down, toggle lines, hover points for details, 
                and pick a year for daily anomalies.
              </p>
            </div>
          </section>

          {/* Multi-line + toggles */}
          <section className="card">
            <div className="card-body items-center text-center">
              <h2 className="card-title text-2xl font-semibold">Arctic vs. Global vs. CO₂ Over Time</h2>
              <p className="text-gray-600 max-w-3xl mx-auto">
                A multi-line chart. Use the toggles below to turn lines on/off. Hover points for exact values. 
                Observe the transitions and hover interactions.
              </p>
              <ToggleMultiLine linesActive={linesActive} setLinesActive={setLinesActive} />
              {/* We add w-full and some margin. The chart will fill horizontally but the SVG logic determines final width. */}
              <div
                ref={refMultiLine}
                className="bg-white rounded-lg shadow-md p-2 w-full mt-6"
                style={{ minHeight: 420}}
              />
            </div>
          </section>

          {/* Z-Score + Bar side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Z-score */}
            <section className="card bg-base-100 shadow-xl p-4">
              <div className="card-body items-center text-center">
                <h2 className="card-title text-2xl font-semibold">Z-Score Anomalies</h2>
                <label className="flex items-center space-x-2 mt-2">
                  <span>Invert Sea Ice Extent?</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={seaIceInverted}
                    onChange={() => setSeaIceInverted(!seaIceInverted)}
                  />
                </label>
                <div
                  ref={refZScore}
                  className="bg-white rounded-lg shadow-md w-full mt-4"
                  style={{ minHeight: 420 }}
                />
              </div>
            </section>

            {/* Bar 2024 */}
            <section className="card bg-base-100 shadow-xl p-4">
              <div className="card-body items-center text-center">
                <h2 className="card-title text-2xl font-semibold">2024 Arctic vs. Global</h2>
                <p className="text-gray-600 max-w-md">
                  A bar chart comparing the average Arctic anomaly vs. Global anomaly for 2024.
                </p>
                <div
                  ref={refBar2024}
                  className="bg-white rounded-lg shadow-md w-full mt-4"
                  style={{ minHeight: 420 }}
                />
              </div>
            </section>
          </div>

          {/* Scatter + Trendline */}
          <section className="card bg-base-100 shadow-xl p-4">
            <div className="card-body items-center text-center">
              <h2 className="card-title text-2xl font-semibold">Scatter: Global Temp vs. Sea Ice (Trendline)</h2>
              <p className="text-gray-600 max-w-xl">
                Shows how the global temperature anomaly associates with mean sea ice extent. 
                A best-fit line helps illustrate correlation.
              </p>
              <div
                ref={refScatter}
                className="bg-white rounded-lg shadow-md w-full mt-4"
                style={{ minHeight: 420 }}
              />
            </div>
          </section>

          {/* Heatmap */}
          <section className="card bg-base-100 shadow-xl p-4">
            <div className="card-body items-center text-center">
              <h2 className="card-title text-2xl font-semibold">Correlation Heatmap</h2>
              <p className="text-gray-600 max-w-lg">
                Compare <em>Glob</em>, <em>64N-90N</em>, and <em>CO₂</em> to see how strongly 
                they correlate with one another.
              </p>
              <div
                ref={refHeatmap}
                className="bg-white rounded-lg shadow-md mt-4"
                style={{ minHeight: 360, width: "fit-content" }} 
              />
            </div>
          </section>

          {/* Seasonal lines */}
          <section className="card bg-base-100 shadow-xl p-4">
            <div className="card-body items-center text-center">
              <h2 className="card-title text-2xl font-semibold">Seasonal Sea Ice Lines (Daily)</h2>
              <p className="text-gray-600 max-w-lg">
                Each year’s daily sea ice extent is drawn in a unique color. Hover near a line to see the year.
              </p>
              <div
                ref={refSeasonal}
                className="bg-white rounded-lg shadow-md w-full mt-4"
                style={{ minHeight: 420 }}
              />
            </div>
          </section>

          {/* IQR */}
          <section className="card bg-base-100 shadow-xl p-4">
            <div className="card-body items-center text-center">
              <h2 className="card-title text-2xl font-semibold">Daily IQR Envelope</h2>
              <p className="text-gray-600 max-w-lg">
                We compute the min, mean, and 25th–75th percentile envelope across all years except 2025.
                The partial 2025 is overlayed in orange to see if it breaks the min record.
              </p>
              <div
                ref={refIQR}
                className="bg-white rounded-lg shadow-md w-full mt-4"
                style={{ minHeight: 420, }}
              />
            </div>
          </section>

          {/* Rolling */}
          <section className="card bg-base-100 shadow-xl p-4">
            <div className="card-body items-center text-center">
              <h2 className="card-title text-2xl font-semibold">365-Day Rolling Average</h2>
              <p className="text-gray-600 max-w-lg">
                A smoothed line (steelblue) that highlights the longer-term sea ice trend by averaging
                each day with the previous 364 days.
              </p>
              <div
                ref={refRolling}
                className="bg-white rounded-lg shadow-md w-full mt-4"
                style={{ minHeight: 420 }}
              />
            </div>
          </section>

          {/* Daily anomaly year selection */}
          <section className="card bg-base-100 shadow-xl p-4">
            <div className="card-body items-center text-center">
              <h2 className="card-title text-2xl font-semibold">Daily Anomaly of a Selected Year</h2>
              <p className="text-gray-600 max-w-lg">
                Choose a year to compare that year’s daily sea ice extent to the multi-year average
                for each day-of-year. The line will show positive/negative anomalies relative to the 
                baseline.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <label className="text-gray-700">Year:</label>
                <select
                  className="select select-bordered w-28"
                  value={dailyAnomalyYear}
                  onChange={(e) => setDailyAnomalyYear(Number(e.target.value))}
                >
                  {Array.from({ length: 50 }, (_, i) => 1975 + i).map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                  <option value={2025}>2025</option>
                </select>
              </div>
              <div
                ref={refDailyAnomaly}
                className="bg-white rounded-lg shadow-md w-full mt-4"
                style={{ minHeight: 420 }}
              />
            </div>
          </section>

          {/* Conclusions */}
          <section className="card bg-base-100 shadow-xl p-4">
            <div className="card-body items-center text-center space-y-4">
              <h2 className="card-title text-2xl font-semibold">Conclusions & Observations</h2>
              <p className="text-gray-700 leading-relaxed max-w-2xl">
                Arctic warming outpaces global trends, sea ice declines match rising CO₂, 
                and partial 2025 data might set new minima. Toggling lines, inverting anomalies,
                and selecting daily anomaly years help illustrate these findings.
              </p>
            </div>
          </section>
        </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer bg-neutral text-neutral-content justify-center p-4">
        <p>&copy; {new Date().getFullYear()} Climate Report. All rights reserved.</p>
      </footer>
    </div>
  );
}

/** Toggle UI for multi-line lines (Arctic, Global, CO2). */
function ToggleMultiLine({
  linesActive,
  setLinesActive
}: {
  linesActive: { Arctic: boolean; Global: boolean; CO2: boolean };
  setLinesActive: React.Dispatch<React.SetStateAction<{ Arctic: boolean; Global: boolean; CO2: boolean }>>;
}) {
  const toggle = (key: keyof typeof linesActive) => {
    setLinesActive(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const buttonClass = (active: boolean, color: string) =>
    classNames(
      "btn btn-sm shadow font-medium",
      active ? `${color} text-white` : "btn-outline"
    );

  return (
    <div className="flex flex-wrap items-center gap-2 justify-center">
      <button
        onClick={() => toggle("Arctic")}
        className={buttonClass(linesActive.Arctic, "bg-red-500 border-red-500")}
      >
        Arctic
      </button>
      <button
        onClick={() => toggle("Global")}
        className={buttonClass(linesActive.Global, "bg-blue-500 border-blue-500")}
      >
        Global
      </button>
      <button
        onClick={() => toggle("CO2")}
        className={buttonClass(linesActive.CO2, "bg-green-500 border-green-500")}
      >
        CO₂
      </button>
    </div>
  );
}


////////////////////////////////////////////////////////////////////////////////
// Chart-building D3 functions
////////////////////////////////////////////////////////////////////////////////

function computeZscores(data: AnnualRow[]): AnnualRow[] {
  const validArctic = data.filter(d => d["64N-90N"] != null) as Required<Pick<AnnualRow, "Year"|"64N-90N">>[];
  const validSeaIce = data.filter(d => d.SeaIceMean != null) as Required<Pick<AnnualRow, "Year"|"SeaIceMean">>[];
  const validCO2 = data.filter(d => d.GlobalCO2Mean != null) as Required<Pick<AnnualRow, "Year"|"GlobalCO2Mean">>[];

  const arcticVals = validArctic.map(d => d["64N-90N"]);
  const seaIceVals = validSeaIce.map(d => d.SeaIceMean);
  const co2Vals = validCO2.map(d => d.GlobalCO2Mean);

  const [mA, sA] = [d3.mean(arcticVals) ?? 0, d3.deviation(arcticVals) ?? 1];
  const [mS, sS] = [d3.mean(seaIceVals) ?? 0, d3.deviation(seaIceVals) ?? 1];
  const [mC, sC] = [d3.mean(co2Vals) ?? 0, d3.deviation(co2Vals) ?? 1];

  return data.map(row => {
    const arcVal = row["64N-90N"];
    const seaVal = row.SeaIceMean;
    const coVal = row.GlobalCO2Mean;
    const arcZ = arcVal != null ? (arcVal - mA) / sA : null;
    const seaZ = seaVal != null ? (seaVal - mS) / sS : null;
    const seaZInv = seaZ != null ? -seaZ : null;
    const coZ = coVal != null ? (coVal - mC) / sC : null;
    return {
      ...row,
      Arctic_z: arcZ,
      SeaIce_z: seaZ,
      SeaIce_z_inv: seaZInv,
      GlobCO2Mean_z: coZ
    };
  });
}

/**
 * 1) Multi-Line Chart (Arctic, Global, CO2).
 *    You had it as createMultiLineChart(...) 
 *    Same logic, numeric fallback if needed, etc.
 */
function createMultiLineChart(
  container: HTMLDivElement | null,
  data: AnnualRow[],
  linesActive: { Arctic: boolean; Global: boolean; CO2: boolean }
) {
  if (!container) return;
  container.innerHTML = "";

  // ... (identical logic from your snippet).
  // With "d.Extent ?? 0" or "line.accessor(d) ?? 0" if needed.
  // Please refer to your snippet for the complete code.
  // (We show the same approach with minimal changes.)
  
  const rect = container.getBoundingClientRect();
  const w = rect.width || 600;
  const h = rect.height || 400;
  const margin = { top: 30, right: 100, bottom: 40, left: 60 };

  const svg = d3.select(container).append("svg")
    .attr("width", w)
    .attr("height", h);

  const lines = [
    {
      key: "Arctic",
      label: "Arctic (64N-90N)",
      color: "#ef4444",
      active: linesActive.Arctic,
      accessor: (d: AnnualRow) => d["64N-90N"] ?? null
    },
    {
      key: "Global",
      label: "Global (Glob)",
      color: "#3b82f6",
      active: linesActive.Global,
      accessor: (d: AnnualRow) => d.Glob ?? null
    },
    {
      key: "CO2",
      label: "CO2 (GlobalCO2Mean)",
      color: "#10b981",
      active: linesActive.CO2,
      accessor: (d: AnnualRow) => d.GlobalCO2Mean ?? null
    }
  ];

  const valid = data.filter(d => d.Year !== undefined);
  valid.sort((a, b) => (a.Year ?? 0) - (b.Year ?? 0));

  const xExtent = d3.extent(valid, d => d.Year!) as [number, number];
  const xScale = d3.scaleLinear()
    .domain(xExtent)
    .range([margin.left, w - margin.right]);

  // gather combined Y values
  const combinedVals: number[] = [];
  lines.forEach(line => {
    if (!line.active) return;
    valid.forEach(d => {
      const val = line.accessor(d);
      if (val !== null) combinedVals.push(val);
    });
  });
  if (combinedVals.length === 0) {
    container.innerHTML = `<p class="text-gray-500 p-2">No lines active. Toggle them above!</p>`;
    return;
  }
  const [minY, maxY] = d3.extent(combinedVals) as [number, number];
  const yScale = d3.scaleLinear()
    .domain([minY, maxY])
    .range([h - margin.bottom, margin.top])
    .nice();

  const xAxis = d3.axisBottom<number>(xScale).tickFormat(d3.format("d")).ticks(6);
  const yAxis = d3.axisLeft<number>(yScale).ticks(6);

  svg.append("g")
    .attr("transform", `translate(0,${h - margin.bottom})`)
    .call(xAxis);
  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(yAxis);

  const tooltip = d3.select(container).append("div")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("background", "rgba(0, 0, 0, 0.7)")
    .style("color", "#fff")
    .style("padding", "6px 10px")
    .style("border-radius", "4px")
    .style("font-size", "0.75rem")
    .style("opacity", 0);

  lines.forEach(line => {
    if (!line.active) return;
    const accessor = line.accessor;
    const realLineGen = d3.line<AnnualRow>()
      .defined(d => accessor(d) !== null)
      .x(d => xScale(d.Year!))
      .y(d => yScale(accessor(d)!))
      .curve(d3.curveMonotoneX);

    // path with dashoffset transition
    const path = svg.append("path")
      .datum(valid)
      .attr("fill", "none")
      .attr("stroke", line.color)
      .attr("stroke-width", 2)
      .attr("d", realLineGen as any);

    const pathLength = (path.node() as SVGPathElement).getTotalLength();
    path
      .attr("stroke-dasharray", `${pathLength} ${pathLength}`)
      .attr("stroke-dashoffset", pathLength)
      .transition()
      .duration(1500)
      .ease(d3.easeCubicOut)
      .attr("stroke-dashoffset", 0);

    // circles
    svg.selectAll(`circle.${line.key}`)
      .data(valid.filter(d => accessor(d) !== null))
      .enter()
      .append("circle")
      .attr("class", line.key)
      .attr("cx", d => xScale(d.Year!))
      .attr("cy", d => yScale(accessor(d)!))
      .attr("r", 4)
      .attr("fill", line.color)
      .attr("opacity", 0.8)
      .on("mouseover", function() {
        d3.select(this).transition().duration(200).attr("r", 6);
      })
      .on("mouseout", function() {
        d3.select(this).transition().duration(200).attr("r", 4);
      })
      .on("mousemove", (event, d) => {
        const val = accessor(d)!.toFixed(2);
        tooltip
          .style("left", event.offsetX + 12 + "px")
          .style("top", event.offsetY - 12 + "px")
          .style("opacity", 1)
          .html(`
            <div class="font-semibold">${line.label}</div>
            <div>Year: ${d.Year}</div>
            <div>Value: ${val}</div>
          `);
      })
      .on("mouseleave", () => tooltip.style("opacity", 0));
  });

  // optional legend
  let offsetY = margin.top;
  lines.forEach(line => {
    if (!line.active) return;
    svg.append("rect")
      .attr("x", w - margin.right + 10)
      .attr("y", offsetY)
      .attr("width", 14)
      .attr("height", 14)
      .attr("fill", line.color);
    svg.append("text")
      .attr("x", w - margin.right + 30)
      .attr("y", offsetY + 12)
      .text(line.label)
      .style("font-size", "0.8rem")
      .attr("fill", "#333");
    offsetY += 20;
  });
}

////////////////////////////////////////////////////////////////////////////////
// 2) Z-score chart
////////////////////////////////////////////////////////////////////////////////
function createZScoreChart(
  container: HTMLDivElement | null,
  data: AnnualRow[],
  inverted: boolean
) {
  if (!container) return;
  container.innerHTML = "";

  const rect = container.getBoundingClientRect();
  const w = rect.width || 600;
  const h = rect.height || 400;
  const margin = { top: 30, right: 120, bottom: 40, left: 60 };

  const valid = data.filter(
    d => d.Year != null && d.Arctic_z != null && d.SeaIce_z != null && d.SeaIce_z_inv != null && d.GlobCO2Mean_z != null
  ) as Required<Pick<AnnualRow,"Year"|"Arctic_z"|"SeaIce_z"|"SeaIce_z_inv"|"GlobCO2Mean_z">>[];

  if (valid.length === 0) {
    container.innerHTML = `<p class="text-gray-500 p-2">No z-score data found.</p>`;
    return;
  }
  valid.sort((a, b) => a.Year - b.Year);

  const xExtent = d3.extent(valid, d => d.Year) as [number, number];
  const xScale = d3.scaleLinear()
    .domain(xExtent)
    .range([margin.left, w - margin.right]);

  let allVals: number[] = [];
  valid.forEach(d => {
    allVals.push(d.Arctic_z, d.GlobCO2Mean_z);
    if (inverted) {
      allVals.push(d.SeaIce_z_inv);
    } else {
      allVals.push(d.SeaIce_z);
    }
  });
  const [minV, maxV] = d3.extent(allVals) as [number, number];
  const yScale = d3.scaleLinear()
    .domain([minV, maxV])
    .range([h - margin.bottom, margin.top])
    .nice();

  const svg = d3.select(container).append("svg")
    .attr("width", w)
    .attr("height", h);

  const xAxis = d3.axisBottom<number>(xScale).tickFormat(d3.format("d")).ticks(6);
  const yAxis = d3.axisLeft<number>(yScale).ticks(6);

  svg.append("g")
    .attr("transform", `translate(0,${h - margin.bottom})`)
    .call(xAxis);
  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(yAxis);

  // lines for Arctic, SeaIce, CO2
  const lineArctic = d3.line<Required<typeof valid[0]>>()
    .x(d => xScale(d.Year))
    .y(d => yScale(d.Arctic_z))
    .curve(d3.curveCatmullRom.alpha(0.5));

  const lineSeaIce = d3.line<Required<typeof valid[0]>>()
    .x(d => xScale(d.Year))
    .y(d => yScale(inverted ? d.SeaIce_z_inv : d.SeaIce_z))
    .curve(d3.curveCatmullRom.alpha(0.5));

  const lineCO2 = d3.line<Required<typeof valid[0]>>()
    .x(d => xScale(d.Year))
    .y(d => yScale(d.GlobCO2Mean_z))
    .curve(d3.curveCatmullRom.alpha(0.5));

  // Arctic
  svg.append("path")
    .datum(valid)
    .attr("fill", "none")
    .attr("stroke", "red")
    .attr("stroke-width", 2)
    .attr("d", lineArctic as any);

  // Sea ice
  svg.append("path")
    .datum(valid)
    .attr("fill", "none")
    .attr("stroke", "blue")
    .attr("stroke-width", 2)
    .attr("d", lineSeaIce as any);

  // CO2
  svg.append("path")
    .datum(valid)
    .attr("fill", "none")
    .attr("stroke", "orange")
    .attr("stroke-width", 2)
    .attr("d", lineCO2 as any);

  // optional legend
  const legendItems = [
    { label: "Arctic Temp (z-score)", color: "red" },
    { label: inverted ? "Sea Ice (inverted,z)" : "Sea Ice (z-score)", color: "blue" },
    { label: "CO2 (z-score)", color: "orange" }
  ];
  let offsetY = margin.top;
  legendItems.forEach(item => {
    svg.append("rect")
      .attr("x", w - margin.right + 10)
      .attr("y", offsetY)
      .attr("width", 14)
      .attr("height", 14)
      .attr("fill", item.color);
    svg.append("text")
      .attr("x", w - margin.right + 30)
      .attr("y", offsetY + 12)
      .text(item.label)
      .style("font-size", "0.8rem")
      .attr("fill", "#333");
    offsetY += 20;
  });
}

////////////////////////////////////////////////////////////////////////////////
// 3) 2024 bar chart
////////////////////////////////////////////////////////////////////////////////
function createBar2024(
  container: HTMLDivElement | null,
  data: AnnualRow[]
) {
  if (!container) return;
  container.innerHTML = "";

  const row2024 = data.find(d => d.Year === 2024);
  if (!row2024 || row2024["64N-90N"] == null || row2024.Glob == null) {
    container.innerHTML = `<p class="text-gray-500 p-2">No 2024 data found for Arctic/Global.</p>`;
    return;
  }
  const summary = [
    { location: "Arctic", value: row2024["64N-90N"] },
    { location: "Global", value: row2024.Glob }
  ];

  const rect = container.getBoundingClientRect();
  const w = rect.width || 600;
  const h = rect.height || 400;
  const margin = { top: 20, right: 20, bottom: 40, left: 60 };

  const svg = d3.select(container).append("svg")
    .attr("width", w)
    .attr("height", h);

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

  const tooltip = d3.select(container).append("div")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("background", "rgba(0,0,0,0.7)")
    .style("color", "#fff")
    .style("padding", "6px 10px")
    .style("border-radius", "4px")
    .style("font-size", "0.75rem")
    .style("opacity", 0);

  svg.selectAll(".bar-2024")
    .data(summary)
    .enter()
    .append("rect")
    .attr("class", "bar-2024")
    .attr("x", d => xScale(d.location)!)
    .attr("width", xScale.bandwidth())
    .attr("y", yScale(0))
    .attr("height", 0)
    .attr("fill", d => colorMap[d.location])
    .on("mouseover", function() {
      d3.select(this).transition().duration(200).attr("opacity", 0.7);
    })
    .on("mouseout", function() {
      d3.select(this).transition().duration(200).attr("opacity", 1);
    })
    .on("mousemove", (event, d) => {
      tooltip
        .style("left", event.offsetX + 15 + "px")
        .style("top", event.offsetY - 15 + "px")
        .style("opacity", 1)
        .html(`
          <div class="font-semibold text-sm mb-1">${d.location}</div>
          <div>Value: <strong>${d.value.toFixed(3)}</strong></div>
        `);
    })
    .on("mouseleave", () => tooltip.style("opacity", 0))
    .transition()
    .duration(1000)
    .attr("y", d => yScale(d.value))
    .attr("height", d => Math.abs(yScale(d.value) - yScale(0)));
}

////////////////////////////////////////////////////////////////////////////////
// 4) Scatter + Trendline
////////////////////////////////////////////////////////////////////////////////
function createScatterChart(container: HTMLDivElement | null, data: AnnualRow[]) {
  if (!container) return;
  container.innerHTML = "";

  const valid = data.filter(d => d.Year && d.Glob != null && d.SeaIceMean != null) as Required<Pick<AnnualRow,"Year"|"Glob"|"SeaIceMean">>[];
  if (valid.length === 0) {
    container.innerHTML = `<p class="text-gray-500 p-2">No data for scatter.</p>`;
    return;
  }

  const rect = container.getBoundingClientRect();
  const w = rect.width || 600;
  const h = rect.height || 400;
  const margin = { top: 20, right: 20, bottom: 50, left: 60 };

  const svg = d3.select(container).append("svg")
    .attr("width", w)
    .attr("height", h);

  const xExtent = d3.extent(valid, d => d.Glob) as [number, number];
  const yExtent = d3.extent(valid, d => d.SeaIceMean) as [number, number];

  const xScale = d3.scaleLinear().domain(xExtent).range([margin.left, w - margin.right]).nice();
  const yScale = d3.scaleLinear().domain(yExtent).range([h - margin.bottom, margin.top]).nice();

  const xAxis = d3.axisBottom<number>(xScale).ticks(5);
  const yAxis = d3.axisLeft<number>(yScale).ticks(5);

  svg.append("g")
    .attr("transform", `translate(0,${h - margin.bottom})`)
    .call(xAxis);
  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(yAxis);

  // OLS for a trendline
  const xVals = valid.map(d => d.Glob);
  const yVals = valid.map(d => d.SeaIceMean);
  const { slope, intercept } = linearRegression(xVals, yVals);

  // draw line from xMin->xMax
  const [xMin, xMax] = xExtent;
  const yMinPred = slope * xMin + intercept;
  const yMaxPred = slope * xMax + intercept;
  svg.append("line")
    .attr("x1", xScale(xMin))
    .attr("y1", yScale(yMinPred))
    .attr("x2", xScale(xMax))
    .attr("y2", yScale(yMaxPred))
    .attr("stroke", "darkorange")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "3,3");

  const tooltip = d3.select(container).append("div")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("background", "rgba(0,0,0,0.7)")
    .style("color", "#fff")
    .style("padding", "6px 10px")
    .style("border-radius", "4px")
    .style("font-size", "0.75rem")
    .style("opacity", 0);

  svg.selectAll(".scatter-dot")
    .data(valid)
    .enter()
    .append("circle")
    .attr("class", "scatter-dot")
    .attr("cx", d => xScale(d.Glob))
    .attr("cy", d => yScale(d.SeaIceMean))
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
        .style("left", event.offsetX + 15 + "px")
        .style("top", event.offsetY - 15 + "px")
        .style("opacity", 1)
        .html(`
          <div class="font-semibold text-sm mb-1">Year: ${d.Year}</div>
          <div>Global Temp: ${d.Glob.toFixed(3)}</div>
          <div>Sea Ice: ${d.SeaIceMean.toFixed(3)}</div>
        `);
    })
    .on("mouseleave", () => tooltip.style("opacity", 0))
    .transition()
    .duration(800)
    .delay((_, i) => i * 10)
    .attr("r", 4);
}

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

////////////////////////////////////////////////////////////////////////////////
// 5) Correlation Heatmap
////////////////////////////////////////////////////////////////////////////////
function createCorrelationHeatmap(
  container: HTMLDivElement | null,
  data: AnnualRow[]
) {
  if (!container) return;
  container.innerHTML = "";

  const valid = data.filter(d => d.Glob != null && d["64N-90N"] != null && d.GlobalCO2Mean != null) as Required<Pick<AnnualRow,"Glob"|"64N-90N"|"GlobalCO2Mean">>[];
  if (valid.length === 0) {
    container.innerHTML = `<p class="text-gray-500 p-2">No data for correlation heatmap.</p>`;
    return;
  }

  const globVals = valid.map(d => d.Glob);
  const arcVals = valid.map(d => d["64N-90N"]);
  const co2Vals = valid.map(d => d.GlobalCO2Mean);

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

  const cGA = correlation(globVals, arcVals);
  const cGC = correlation(globVals, co2Vals);
  const cAC = correlation(arcVals, co2Vals);

  const matrix = [
    { row: "Glob", col: "Glob", val: 1 },
    { row: "Glob", col: "64N-90N", val: cGA },
    { row: "Glob", col: "GlobalCO2Mean", val: cGC },
    { row: "64N-90N", col: "Glob", val: cGA },
    { row: "64N-90N", col: "64N-90N", val: 1 },
    { row: "64N-90N", col: "GlobalCO2Mean", val: cAC },
    { row: "GlobalCO2Mean", col: "Glob", val: cGC },
    { row: "GlobalCO2Mean", col: "64N-90N", val: cAC },
    { row: "GlobalCO2Mean", col: "GlobalCO2Mean", val: 1 }
  ];

  const variables = ["Glob", "64N-90N", "GlobalCO2Mean"];
  const cellSize = 60;
  const size = cellSize * variables.length + 70;

  const svg = d3.select(container).append("svg")
    .attr("width", size)
    .attr("height", size);

  const xScale = d3.scaleBand()
    .domain(variables)
    .range([60, 60 + cellSize * variables.length])
    .padding(0);
  const yScale = d3.scaleBand()
    .domain(variables)
    .range([20, 20 + cellSize * variables.length])
    .padding(0);

  const colorScale = d3.scaleSequential(d3.interpolateRdBu).domain([1, -1]);

  svg.selectAll("rect")
    .data(matrix)
    .enter()
    .append("rect")
    .attr("x", d => xScale(d.col)!)
    .attr("y", d => yScale(d.row)!)
    .attr("width", xScale.bandwidth())
    .attr("height", yScale.bandwidth())
    .attr("fill", d => colorScale(d.val));

  // numeric text
  svg.selectAll(".corr-text")
    .data(matrix)
    .enter()
    .append("text")
    .attr("x", d => xScale(d.col)! + xScale.bandwidth() / 2)
    .attr("y", d => yScale(d.row)! + yScale.bandwidth() / 2)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .style("font-size", "0.8rem")
    .text(d => d.val.toFixed(2));

  // row labels
  variables.forEach((v, i) => {
    svg.append("text")
      .attr("x", 55)
      .attr("y", yScale(v)! + yScale.bandwidth() / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .text(v)
      .style("font-size", "0.8rem");
  });
  // col labels
  variables.forEach((v, i) => {
    svg.append("text")
      .attr("x", xScale(v)! + xScale.bandwidth() / 2)
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .text(v)
      .style("font-size", "0.8rem");
  });
}

////////////////////////////////////////////////////////////////////////////////
// 6) Seasonal lines
////////////////////////////////////////////////////////////////////////////////
function createSeasonalLines(
  container: HTMLDivElement | null,
  data: DailySeaIceRow[]
) {
  if (!container) return;
  container.innerHTML = "";

  const rect = container.getBoundingClientRect();
  const w = rect.width || 600;
  const h = rect.height || 400;
  const margin = { top: 30, right: 100, bottom: 40, left: 60 };

  const valid = data.filter(d => d.DayOfYear != null && d.Extent != null);

  const byYear = d3.group(valid, d => d.Year);
  const years = Array.from(byYear.keys()).sort();

  const xScale = d3.scaleLinear()
    .domain([1, 366])
    .range([margin.left, w - margin.right]);
  const extentVals = valid.map(d => d.Extent);
  const [minE, maxE] = d3.extent(extentVals) as [number, number];
  const yScale = d3.scaleLinear()
    .domain([minE, maxE])
    .range([h - margin.bottom, margin.top])
    .nice();

  const svg = d3.select(container).append("svg")
    .attr("width", w)
    .attr("height", h);

  const xAxis = d3.axisBottom<number>(xScale).tickFormat(d3.format("d")).ticks(12);
  const yAxis = d3.axisLeft<number>(yScale).ticks(6);

  svg.append("g")
    .attr("transform", `translate(0, ${h - margin.bottom})`)
    .call(xAxis);
  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(yAxis);

  const colorScale = d3.scaleSequential<number>()
    .domain([years[0], years[years.length - 1]])
    .interpolator(d3.interpolateTurbo);

  const lineGen = d3.line<DailySeaIceRow>()
    .x(d => xScale(d.DayOfYear))
    .y(d => yScale(d.Extent))
    .curve(d3.curveMonotoneX);

  const tooltip = d3.select(container).append("div")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("background", "rgba(0,0,0,0.7)")
    .style("color", "#fff")
    .style("padding", "6px 10px")
    .style("border-radius", "4px")
    .style("font-size", "0.75rem")
    .style("opacity", 0);

  years.forEach(year => {
    const arr = byYear.get(year)!;
    arr.sort((a, b) => a.DayOfYear - b.DayOfYear);

    svg.append("path")
      .datum(arr)
      .attr("fill", "none")
      .attr("stroke", colorScale(year))
      .attr("stroke-width", 1.5)
      .attr("d", lineGen as any)
      .on("mousemove", (event) => {
        d3.select(event.currentTarget).transition().duration(100).attr("stroke-width", 3);
        tooltip
          .style("left", event.offsetX + 15 + "px")
          .style("top", event.offsetY - 15 + "px")
          .style("opacity", 1)
          .html(`Year: <strong>${year}</strong>`);
      })
      .on("mouseleave", (event) => {
        d3.select(event.currentTarget).transition().duration(100).attr("stroke-width", 1.5);
        tooltip.style("opacity", 0);
      });
  });
}

////////////////////////////////////////////////////////////////////////////////
// 7) IQR
////////////////////////////////////////////////////////////////////////////////
function createIQRChart(container: HTMLDivElement | null, data: DailySeaIceRow[]) {
  if (!container) return;
  container.innerHTML = "";

  // Exclude 2025 from calculations, overlay partial 2025
  const main = data.filter(d => d.Year !== 2025);
  const partial2025 = data.filter(d => d.Year === 2025);

  // group by dayOfYear
  const grouped = d3.group(main, d => d.DayOfYear);
  interface Stats { dayOfYear: number; minVal: number; q25: number; q75: number; meanVal: number; }
  const stats: Stats[] = [];

  grouped.forEach((arr, doy) => {
    const exts = arr.map(d => d.Extent).sort((a,b) => a - b);
    stats.push({
      dayOfYear: +doy,
      minVal: d3.min(exts) ?? 0,
      q25: d3.quantile(exts, 0.25) ?? 0,
      q75: d3.quantile(exts, 0.75) ?? 0,
      meanVal: d3.mean(exts) ?? 0
    });
  });
  stats.sort((a,b) => a.dayOfYear - b.dayOfYear);

  const rect = container.getBoundingClientRect();
  const w = rect.width || 600;
  const h = rect.height || 400;
  const margin = { top: 30, right: 30, bottom: 40, left: 60 };

  const allVals = [
    ...stats.map(s => s.minVal),
    ...stats.map(s => s.q25),
    ...stats.map(s => s.q75),
    ...stats.map(s => s.meanVal)
  ];
  let [minY, maxY] = d3.extent(allVals) as [number, number];

  // incorporate partial 2025
  if (partial2025.length > 0) {
    const pMin = d3.min(partial2025, d => d.Extent) as number;
    const pMax = d3.max(partial2025, d => d.Extent) as number;
    if (pMin < minY) minY = pMin;
    if (pMax > maxY) maxY = pMax;
  }

  const xScale = d3.scaleLinear()
    .domain([1, 366])
    .range([margin.left, w - margin.right]);

  const yScale = d3.scaleLinear()
    .domain([minY, maxY])
    .range([h - margin.bottom, margin.top])
    .nice();

  const svg = d3.select(container).append("svg")
    .attr("width", w)
    .attr("height", h);

  const xAxis = d3.axisBottom<number>(xScale).tickFormat(d3.format("d")).ticks(12);
  const yAxis = d3.axisLeft<number>(yScale).ticks(6);

  svg.append("g")
    .attr("transform", `translate(0, ${h - margin.bottom})`)
    .call(xAxis);
  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(yAxis);

  const areaIQR = d3.area<Stats>()
    .x(d => xScale(d.dayOfYear))
    .y0(d => yScale(d.q25))
    .y1(d => yScale(d.q75))
    .curve(d3.curveMonotoneX);

  svg.append("path")
    .datum(stats)
    .attr("fill", "skyblue")
    .attr("opacity", 0.4)
    .attr("d", areaIQR as any);

  // mean line
  const lineMean = d3.line<Stats>()
    .x(d => xScale(d.dayOfYear))
    .y(d => yScale(d.meanVal))
    .curve(d3.curveMonotoneX);

  svg.append("path")
    .datum(stats)
    .attr("fill", "none")
    .attr("stroke", "black")
    .attr("stroke-width", 2)
    .attr("d", lineMean as any);

  // min line
  const lineMin = d3.line<Stats>()
    .x(d => xScale(d.dayOfYear))
    .y(d => yScale(d.minVal))
    .curve(d3.curveMonotoneX);

  svg.append("path")
    .datum(stats)
    .attr("fill", "none")
    .attr("stroke", "red")
    .attr("stroke-dasharray", "3,3")
    .attr("stroke-width", 2)
    .attr("d", lineMin as any);

  // partial 2025
  if (partial2025.length > 0) {
    partial2025.sort((a,b) => a.DayOfYear - b.DayOfYear);
    const line2025 = d3.line<DailySeaIceRow>()
      .x(d => xScale(d.DayOfYear))
      .y(d => yScale(d.Extent))
      .curve(d3.curveMonotoneX);

    svg.append("path")
      .datum(partial2025)
      .attr("fill", "none")
      .attr("stroke", "orange")
      .attr("stroke-width", 2)
      .attr("d", line2025 as any);
  }
}

////////////////////////////////////////////////////////////////////////////////
// 8) Rolling
////////////////////////////////////////////////////////////////////////////////
function createRollingChart(
  container: HTMLDivElement | null,
  data: DailySeaIceRow[]
) {
  if (!container) return;
  container.innerHTML = "";

  const rect = container.getBoundingClientRect();
  const w = rect.width || 600;
  const h = rect.height || 400;
  const margin = { top: 30, right: 30, bottom: 40, left: 60 };

  const valid = data.filter(d => d.DateStr && d.Extent != null)
    .map(d => ({
      ...d,
      dateObj: new Date(d.DateStr!)
    }));
  valid.sort((a,b) => a.dateObj.valueOf() - b.dateObj.valueOf());

  // 365-day rolling
  let sum = 0;
  let queue: number[] = [];
  const windowSize = 365;
  const rollingArr: { date: Date; rolling: number }[] = [];

  for (let i = 0; i < valid.length; i++) {
    sum += valid[i].Extent;
    queue.push(valid[i].Extent);
    if (queue.length > windowSize) {
      sum -= queue.shift()!;
    }
    const avg = sum / queue.length;
    rollingArr.push({ date: valid[i].dateObj, rolling: avg });
  }

  const xExtent = d3.extent(rollingArr, d => d.date) as [Date, Date];
  const yExtent = d3.extent(rollingArr, d => d.rolling) as [number, number];

  const xScale = d3.scaleTime()
    .domain(xExtent)
    .range([margin.left, w - margin.right]);
  const yScale = d3.scaleLinear()
    .domain(yExtent)
    .range([h - margin.bottom, margin.top])
    .nice();

  const svg = d3.select(container).append("svg")
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

  svg.append("text")
    .attr("x", margin.left)
    .attr("y", margin.top - 10)
    .attr("fill", "#333")
    .style("font-weight", "bold")
    .text("365-Day Rolling Average");
}

////////////////////////////////////////////////////////////////////////////////
// 9) Daily anomaly
////////////////////////////////////////////////////////////////////////////////
function createDailyAnomaly(
  container: HTMLDivElement | null,
  data: DailySeaIceRow[],
  chosenYear: number
) {
  if (!container) return;
  container.innerHTML = "";

  // exclude the chosen year from baseline
  const base = data.filter(d => d.Year !== chosenYear);
  const dayMap = d3.rollups(
    base,
    arr => d3.mean(arr, a => a.Extent),
    d => d.DayOfYear
  );
  const baseline = new Map(dayMap);

  const chosen = data.filter(d => d.Year === chosenYear && d.Extent != null && d.DayOfYear);
  if (chosen.length === 0) {
    container.innerHTML = `<p class="text-gray-500 p-2">No daily data for ${chosenYear}.</p>`;
    return;
  }
  const anomalies = chosen.map(d => ({
    dayOfYear: d.DayOfYear,
    anomaly: d.Extent - (baseline.get(d.DayOfYear) ?? 0)
  }));
  anomalies.sort((a,b) => a.dayOfYear - b.dayOfYear);

  const rect = container.getBoundingClientRect();
  const w = rect.width || 600;
  const h = rect.height || 400;
  const margin = { top: 30, right: 30, bottom: 40, left: 60 };

  const xExtent = d3.extent(anomalies, d => d.dayOfYear) as [number, number];
  const [minA, maxA] = d3.extent(anomalies, d => d.anomaly) as [number, number];

  const xScale = d3.scaleLinear()
    .domain(xExtent)
    .range([margin.left, w - margin.right]);

  const yScale = d3.scaleLinear()
    .domain([Math.min(0, minA), Math.max(0, maxA)])
    .range([h - margin.bottom, margin.top])
    .nice();

  const svg = d3.select(container).append("svg")
    .attr("width", w)
    .attr("height", h);

  const xAxis = d3.axisBottom<number>(xScale).tickFormat(d3.format("d")).ticks(12);
  const yAxis = d3.axisLeft<number>(yScale).ticks(6);

  svg.append("g")
    .attr("transform", `translate(0,${h - margin.bottom})`)
    .call(xAxis);
  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(yAxis);

  svg.append("line")
    .attr("x1", xScale(xExtent[0]))
    .attr("x2", xScale(xExtent[1]))
    .attr("y1", yScale(0))
    .attr("y2", yScale(0))
    .attr("stroke", "#333")
    .attr("stroke-dasharray", "2,2");

  const lineGen = d3.line<typeof anomalies[0]>()
    .x(d => xScale(d.dayOfYear))
    .y(d => yScale(d.anomaly))
    .curve(d3.curveMonotoneX);

  svg.append("path")
    .datum(anomalies)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2)
    .attr("d", lineGen as any);

  svg.append("text")
    .attr("x", margin.left)
    .attr("y", margin.top - 10)
    .style("font-weight", "bold")
    .text(`Daily Anomalies for Year ${chosenYear}`);
}
