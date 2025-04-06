"use client";
import React, { useEffect, useState } from "react";

// D3-based charts
import MultiLineChartD3 from "@/components/d3/MultiLineChart";
import ZScoreChartD3 from "@/components/d3/ZScoreChart";
import BarChart2024D3 from "@/components/d3/BarChart2024";
import ScatterChartD3 from "@/components/d3/ScatterChart";
import HeatmapChartD3 from "@/components/d3/HeatmapChart";
import SeasonalLinesChartD3 from "@/components/d3/SeasonalLinesChart";
import IQRChartD3 from "@/components/d3/IQRChart";
import RollingChartD3 from "@/components/d3/RollingChart";
import DailyAnomalyChartD3 from "@/components/d3/DailyAnomalyChart";
import AnnualAnomalyBarChartD3 from "@/components/d3/AnnualAnomalyBarChart";

// Recharts-based charts
import MultiLineChartRecharts from "@/components/Rechart/MultiLineRecharts";
import ZScoreChartRecharts from "@/components/Rechart/ZScoreChartRecharts";
import BarChart2024Recharts from "@/components/Rechart/BarChart2024Recharts";
import ScatterChartRecharts from "@/components/Rechart/ScatterChartRecharts";
import HeatmapChartRecharts from "@/components/Rechart/HeatMapChartRecharts";
import SeasonalLinesChartRecharts from "@/components/Rechart/SeasonalLinesChartRecharts";
import IQRChartRecharts from "@/components/Rechart/IQRChartRecharts";
import DailyAnomalyChartRecharts from "@/components/Rechart/DailyAnomalyChartRecharts";
import AnnualAnomalyBarChartRecharts from "@/components/Rechart/AnnualAnomalyBarChartRecharts";

import ChartContainer from "@/components/ChartContainer";

import { Text, Space, Group, Button, Select, Divider } from "@mantine/core";
import IntroCardWithModal from "@/components/modal/IntroCardWithModal";
import ChatBot from "@/components/ChatBot";

interface AnnualRow {
  Year: number;
  AnnualAnomaly?: number | null;
  // other properties...
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
  annualAnomaly: { Year: number; AnnualAnomaly: number | null }[];
  corrMatrix: any[];
  iqrStats: any[];
  partial2025: any[];
}

export default function ClimateReportPage() {
  const [annualData, setAnnualData] = useState<AnnualRow[]>([]);
  const [dailyData, setDailyData] = useState<DailySeaIceRow[]>([]);
  const [annualAnomaly, setAnnualAnomaly] = useState<{ Year: number; AnnualAnomaly: number | null }[]>([]);
  const [corrMatrix, setCorrMatrix] = useState<any[]>([]);
  const [iqrStats, setIQRStats] = useState<any[]>([]);
  const [partial2025, setPartial2025] = useState<any[]>([]);

  // For the Z-Score Anomalies chart
  const [seaIceInverted, setSeaIceInverted] = useState(false);

  // For the Daily Anomaly chart
  const [dailyAnomalyYear, setDailyAnomalyYear] = useState(2024);

  // Toggles for D3 vs Recharts
  const [libMultiLine, setLibMultiLine] = useState<"d3" | "recharts">("recharts");
  const [libZscore, setLibZscore] = useState<"d3" | "recharts">("recharts");
  const [libBar2024, setLibBar2024] = useState<"d3" | "recharts">("recharts");
  const [libScatter, setLibScatter] = useState<"d3" | "recharts">("d3");
  const [libHeatmap, setLibHeatmap] = useState<"d3" | "recharts">("d3");
  const [libSeasonal, setLibSeasonal] = useState<"d3" | "recharts">("d3");
  const [libIQR, setLibIQR] = useState<"d3" | "recharts">("recharts");
  const [libRolling, setLibRolling] = useState<"d3" | "recharts">("d3");
  const [libDailyAnom, setLibDailyAnom] = useState<"d3" | "recharts">("recharts");
  const [libAnnualAnom, setLibAnnualAnom] = useState<"d3" | "recharts">("recharts");

  // Modal State 
  const [modalOpened, setModalOpened] = useState(false)
  
  useEffect(() => {
    fetch(`api/data`)
      .then((res) => res.json())
      .then((json: DataJSON) => {
        setAnnualData(json.annual);
        setDailyData(json.dailySeaIce);
        setAnnualAnomaly(json.annualAnomaly || []);
        setCorrMatrix(json.corrMatrix);
        setPartial2025(json.partial2025);
        setIQRStats(json.iqrStats);
      })
      .catch(err => console.error("Error fetching data:", err));
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1rem" }}>

      <IntroCardWithModal />

      <Space h="xl" />

      {/* 1. Seasonal Sea Ice Lines (Daily) */}
      <ChartContainer
        title="Seasonal Sea Ice Lines (Daily)"
        headerExtra={
          <Group spacing="xs">
            <Button variant={libSeasonal === "d3" ? "filled" : "outline"} onClick={() => setLibSeasonal("d3")}>
              D3
            </Button>
            <Button variant={libSeasonal === "recharts" ? "filled" : "outline"} onClick={() => setLibSeasonal("recharts")}>
              Recharts
            </Button>
          </Group>
        }
        description={`
          This chart displays daily measurements of Arctic sea ice extent over the course of a year. Sea ice extent refers to the area of ocean where there is at least some sea ice—typically measured in million square kilometers. This chart not only reveals the natural seasonal cycle—where ice grows in winter and melts in summer—but also provides a critical baseline to detect long-term changes. By understanding these cycles, we can better appreciate how shifts in temperature and other climatic factors are gradually reducing the overall ice cover in the Arctic.
        `}
      >
        {libSeasonal === "d3" ? (
          <SeasonalLinesChartD3 data={dailyData} />
        ) : (
          <SeasonalLinesChartRecharts data={dailyData} />
        )}
      </ChartContainer>

      <Space h="lg" />

      {/* 2. 365-Day Rolling Average */}
      <ChartContainer
        title="365-Day Rolling Average"
        headerExtra={null}
        description={`
          By averaging each day's sea ice extent with the previous 364 days, this rolling average chart smooths out daily variability. It highlights the persistent decline in Arctic ice over multiple years, providing a clear view of long-term trends.
        `}
      >
        <RollingChartD3 data={dailyData} />
      </ChartContainer>

      <Space h="lg" />

      {/* 3. Annual Sea Ice Extent Anomalies */}
      <ChartContainer
        title="Annual Sea Ice Extent Anomalies"
        headerExtra={
          <Group spacing="xs">
            <Button variant={libAnnualAnom === "d3" ? "filled" : "outline"} onClick={() => setLibAnnualAnom("d3")}>
              D3
            </Button>
            <Button variant={libAnnualAnom === "recharts" ? "filled" : "outline"} onClick={() => setLibAnnualAnom("recharts")}>
              Recharts
            </Button>
          </Group>
        }
        description={`
          This chart aggregates daily anomalies by year, illustrating how each year’s sea ice extent deviates from its long-term average. A predominance of negative anomalies in recent years signals an ongoing loss of ice.
        `}
      >
        {libAnnualAnom === "d3" ? (
          <AnnualAnomalyBarChartD3 data={annualAnomaly} />
        ) : (
          <AnnualAnomalyBarChartRecharts data={annualAnomaly} />
        )}
      </ChartContainer>

      <Space h="lg" />

      {/* 4. Daily IQR Envelope */}
      <ChartContainer
        title="Daily IQR Envelope"
        headerExtra={
          <Group spacing="xs">
            <Button variant={libIQR === "d3" ? "filled" : "outline"} onClick={() => setLibIQR("d3")}>
              D3
            </Button>
            <Button variant={libIQR === "recharts" ? "filled" : "outline"} onClick={() => setLibIQR("recharts")}>
              Recharts
            </Button>
          </Group>
        }
        description={`
          This envelope captures the 25th to 75th percentile range of daily sea ice extent, outlining the typical seasonal variability. An overlay for partial 2025 data shows whether current conditions fall within or below historical norms.
        `}
      >
        {libIQR === "d3" ? (
          <IQRChartD3 data={dailyData} />
        ) : (
          <IQRChartRecharts stats={iqrStats} partial2025={partial2025} />
        )}
      </ChartContainer>

      <Space h="lg" />

      {/* 5. Daily Anomaly of a Selected Year */}
      <ChartContainer
        title="Daily Anomaly of a Selected Year"
        headerExtra={
          <Group spacing="xs">
            <Group>
              <Text>Year:</Text>
              <Select
                value={String(dailyAnomalyYear)}
                onChange={(val) => setDailyAnomalyYear(Number(val))}
                data={[
                  ...Array.from({ length: 50 }, (_, i) => {
                    const yr = 1975 + i;
                    return { value: String(yr), label: String(yr) };
                  }),
                  { value: "2025", label: "2025" },
                ]}
                searchable
                clearable={false}
              />
            </Group>
            <Group>
              <Button variant={libDailyAnom === "d3" ? "filled" : "outline"} onClick={() => setLibDailyAnom("d3")}>
                D3
              </Button>
              <Button variant={libDailyAnom === "recharts" ? "filled" : "outline"} onClick={() => setLibDailyAnom("recharts")}>
                Recharts
              </Button>
            </Group>
          </Group>
        }
        description={`
          Focus on one year to see how daily sea ice extent deviates from a multi-year average.
          Positive anomalies indicate higher-than-average ice coverage, while negative values reveal deficits.
          This detailed view helps pinpoint seasonal shifts and record-breaking lows.
        `}
      >
        {libDailyAnom === "d3" ? (
          <DailyAnomalyChartD3 data={dailyData} chosenYear={dailyAnomalyYear} />
        ) : (
          <DailyAnomalyChartRecharts data={dailyData} chosenYear={dailyAnomalyYear} />
        )}
      </ChartContainer>

      <Space h="lg" />

      {/* 6. Temperature & CO₂ Over Time */}
      <ChartContainer
        title="Temperature & CO₂ Over Time"
        headerExtra={
          <Group spacing="xs">
            <Button variant={libMultiLine === "d3" ? "filled" : "outline"} onClick={() => setLibMultiLine("d3")}>
              D3
            </Button>
            <Button variant={libMultiLine === "recharts" ? "filled" : "outline"} onClick={() => setLibMultiLine("recharts")}>
              Recharts
            </Button>
          </Group>
        }
        description={`
          This multivariate chart shows Arctic temperature anomalies against global averages, while simultaneously tracking rising CO₂ levels.
          The data reveal that the Arctic experiences much larger temperature swings—a clear sign of polar amplification—while CO₂ concentrations steadily climb.
        `}
      >
        {libMultiLine === "d3" ? (
          <MultiLineChartD3 data={annualData} linesActive={{ Arctic: true, Global: true, CO2: true }} />
        ) : (
          <MultiLineChartRecharts data={annualData} />
        )}
      </ChartContainer>

      <Space h="lg" />

      {/* 7. Z-Score Anomalies */}
      <ChartContainer
        title="Z-Score Anomalies"
        headerExtra={
          <Group spacing="xs">
            <Button variant={libZscore === "d3" ? "filled" : "outline"} onClick={() => setLibZscore("d3")}>
              D3
            </Button>
            <Button variant={libZscore === "recharts" ? "filled" : "outline"} onClick={() => setLibZscore("recharts")}>
              Recharts
            </Button>
          </Group>
        }
        description={`
          Converting temperature and CO₂ measurements into z-scores puts them on a common scale.
          This chart makes it easy to compare how far current values deviate from historical averages,
          with a special focus on the pronounced drop in sea ice as temperatures rise.
        `}
      >
        {libZscore === "d3" ? (
          <ZScoreChartD3 data={annualData} inverted={seaIceInverted} />
        ) : (
          <ZScoreChartRecharts data={annualData} inverted={seaIceInverted} />
        )}
      </ChartContainer>

      <Space h="lg" />

      {/* 8. 2024 Bar Chart with 50/50 split and vertical divider */}
      <ChartContainer
        title="2024 Arctic vs. Global"
        headerExtra={
          <Group spacing="xs">
            <Button variant={libBar2024 === "d3" ? "filled" : "outline"} onClick={() => setLibBar2024("d3")}>
              D3
            </Button>
            <Button variant={libBar2024 === "recharts" ? "filled" : "outline"} onClick={() => setLibBar2024("recharts")}>
              Recharts
            </Button>
          </Group>
        }
        description=""
      >
        <Group align="center">
          {/* Left: Descriptive text */}
          <div style={{ flex: 1, padding: "1rem" }}>
            <Text>
              In 2024, the gap between Arctic and global temperature anomalies is big. The bar chart on the right
              demonstrates that the Arctic is warming at nearly twice the rate of the global average—an unmistakable
              sign of polar amplification with far-reaching climate consequences.
            </Text>
          </div>
          {/* Vertical divider */}
          <Divider orientation="vertical" size="xs" />
          {/* Right: Bar Chart */}
          <div style={{ flex: 1, padding: "1rem" }}>
            {libBar2024 === "d3" ? (
              <BarChart2024D3 data={annualData} />
            ) : (
              <BarChart2024Recharts data={annualData} />
            )}
          </div>
        </Group>
      </ChartContainer>

      <Space h="lg" />

      {/* 9. Scatter Chart */}
      <ChartContainer
        title="Scatter: Global Temp vs. Sea Ice (Trendline)"
        headerExtra={
          <Group spacing="xs">
            <Button variant={libScatter === "d3" ? "filled" : "outline"} onClick={() => setLibScatter("d3")}>
              D3
            </Button>
            <Button variant={libScatter === "recharts" ? "filled" : "outline"} onClick={() => setLibScatter("recharts")}>
              Recharts
            </Button>
          </Group>
        }
        description={`
          This scatter plot reveals an inverse relationship between global temperature anomalies and Arctic sea ice extent.
          The downward-sloping trendline underscores that higher temperatures are consistently linked with diminished ice cover.
        `}
      >
        {libScatter === "d3" ? (
          <ScatterChartD3 data={annualData} />
        ) : (
          <ScatterChartRecharts data={annualData} />
        )}
      </ChartContainer>

      <Space h="lg" />

      {/* 10. Correlation Heatmap */}
      <ChartContainer
        title="Correlation Heatmap"
        headerExtra={null}
        description={``}
      >
        <Group align="center">
          {/* Left: Explanation */}
          <div style={{ flex: 1, padding: "1rem" }}>
            <Text style={{ maxWidth: 800, margin: "0 auto" }}>
            This heatmap displays Pearson correlation coefficients among global temperature, Arctic temperature,
          and CO₂ emissions. The exceptionally high coefficients (ranging from 0.90 to 0.92) emphasize a strong,
          linear relationship among these variables—reinforcing the tight coupling between greenhouse gas emissions and
          rapid polar warming.
            </Text>
          </div>
          {/* Vertical divider */}
          <Divider orientation="vertical" size="xs" />
          {/* Right: Heatmap */}
          <div style={{ flex: 1, padding: "1rem" }}>
            {libHeatmap === "d3" ? (
              <HeatmapChartD3 data={annualData} />
            ) : (
              <HeatmapChartRecharts
                data={corrMatrix}
                rowDomain={["Global Temp", "Arctic Temp", "CO₂"]}
                colDomain={["Global Temp", "Arctic Temp", "CO₂"]}
              />
            )}
          </div>
        </Group>
      </ChartContainer>
      

      <Space h="xl" />

      {/* 13. Conclusions & Observations */}
      <ChartContainer title="Conclusions & Observations">
        <Text style={{ maxWidth: 800, margin: "0 auto" }}>
          The data reveal a dramatic shift in the Arctic climate. Seasonal analyses clearly show a persistent decline in sea ice,
          while rolling averages and annual anomaly charts confirm that this loss is part of a long-term trend. Multivariate
          comparisons—through temperature records, z-scores, and correlation heatmaps—underscore the strong linkage between
          rising CO₂ emissions and accelerated warming in polar regions.
          <br /><br />
          In summary, the Arctic is warming far faster than the global average, and its ice cover is diminishing rapidly.
          These changes have profound implications for weather patterns, ecosystems, and sea levels worldwide. The evidence
          presented here makes it clear: the transformation of the Arctic is not only real, but also a indicator of global
          climate disruption.
        </Text>
      </ChartContainer>
      <ChatBot API_URL={API_URL!} />

      <Space h="xl" />
    </div>
  );
}
