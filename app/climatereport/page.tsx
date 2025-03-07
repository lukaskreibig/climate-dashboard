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

import { Title, Text, Space, Group, Button, Select, Divider, Card } from "@mantine/core";

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

  // For the "Z-Score Anomalies" chart's D3 version
  const [seaIceInverted, setSeaIceInverted] = useState(false);

  // For the "Daily Anomaly of a Selected Year" chart
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

  useEffect(() => {
    fetch("/api/data")
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
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1rem" }}>
      <Card shadow="sm" padding="10" radius="md" withBorder className="mx-auto" style={{ maxWidth: 1200 }}>
        <Card.Section pl="md" withBorder inheritPadding py="xs" >
          <Title order={2}>The Changing Arctic</Title>
        </Card.Section>
        <Text size="md" p="md" style={{ textAlign: "center" }}>
          This study aggregates data from three leading climate sources: NASA GISS provides annual temperature anomaly data, NOAA supplies daily measurements of Arctic sea ice extent, and Our World in Data compiles comprehensive CO₂ emissions records. Together, these datasets reveal the dramatic warming of the Arctic relative to global trends—highlighting a steady decline in sea ice coverage as temperatures rise. Use the interactive toggles to switch between D3 and Recharts charting libraries and explore the underlying trends driving these changes.
        </Text>
      </Card>
    </div>

      <Space h="xl" />

      {/* MULTI-LINE Chart */}
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
          This chart highlights Arctic (64N–90N) temperature anomalies versus global averages, along with
          rising CO₂ levels. Over the decades, the Arctic often shows larger temperature swings, illustrating
          polar amplification. Meanwhile, the CO₂ line or scale indicates a steady upward trend, underscoring
          the strong link between greenhouse gas emissions and warming.
        `}
      >
        {libMultiLine === "d3" ? (
          <MultiLineChartD3 data={annualData} linesActive={{ Arctic: true, Global: true, CO2: true }} />
        ) : (
          <MultiLineChartRecharts data={annualData} />
        )}
      </ChartContainer>

      <Space h="lg" />

      {/* Z-Score Chart */}
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
          By converting Arctic temperatures, sea ice extent, and CO₂ emissions into z-scores,
          we place them on a comparable scale. This reveals how each variable diverges from
          its historical average. Toggling the sea ice line to “inverted” underscores its
          negative correlation with warming: as z-scores for temperature rise, sea ice
          z-scores typically drop.
        `}
      >
        {libZscore === "d3" ? (
          <>
            {/* The local invert button is inside ZScoreChartD3 */}
            <ZScoreChartD3 data={annualData} inverted={seaIceInverted} />
          </>
        ) : (
          <>
            {/* If you want a separate invert toggle for Recharts, place it here. */}
            <ZScoreChartRecharts data={annualData} inverted={seaIceInverted} />
          </>
        )}
      </ChartContainer>

      <Space h="lg" />

   {/* 2024 Bar Chart with 50/50 split and vertical divider */}
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
  <Group align="center" >
    {/* Left side: descriptive text */}
    <div style={{ flex: 1, padding: "1rem" }}>
      <Text>
        In 2024, the disparity between Arctic and global temperature anomalies becomes striking.
        The bar chart on the right shows that the Arctic anomaly is significantly higher—an indicator
        of polar amplification. Notably, the Arctic is warming at roughly twice the rate of the global average,
        which has serious implications for regional and global climate dynamics.
      </Text>
    </div>
    {/* Vertical divider */}
    <Divider orientation="vertical" size="xs" />
    {/* Right side: the bar chart */}
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

      {/* SCATTER Chart */}
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
          Plotting global temperature anomalies against average sea ice extent reveals a clear
          inverse relationship. The trendline typically slopes downward: higher global temps coincide
          with reduced sea ice coverage. This underscores how warming conditions often erode the polar ice.
        `}
      >
        {libScatter === "d3" ? (
          <ScatterChartD3 data={annualData} />
        ) : (
          <ScatterChartRecharts data={annualData} />
        )}
      </ChartContainer>

      <Space h="lg" />

      {/* HEATMAP */}
      <ChartContainer
        title="Correlation Heatmap"
        headerExtra={null} // No toggles
        description=""
      >
        <Group align="center" >
    {/* Left side: descriptive text */}
    <div style={{ flex: 1, padding: "1rem" }}>
      <Text style={{ maxWidth: 800, margin: "0 auto" }}>
    This heatmap displays the Pearson correlation coefficients among Arctic temperature anomalies, global temperature anomalies, and CO₂ emissions. The values, indicate a remarkably strong linear relationship between these variables.  Overall, this visualization confirms that changes in greenhouse gas emissions and temperature anomalies are tightly coupled, reinforcing the link between rising CO₂ levels and accelerated warming, particularly in the Arctic.
  </Text>

    </div>
    {/* Vertical divider */}
    <Divider orientation="vertical" size="xs" />
    {/* Right side: the bar chart */}
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

      <Space h="lg" />

      {/* SEASONAL LINES Chart */}
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
          Each colored line traces daily sea ice extent for a given year. By overlaying decades
          of data, we can see consistent seasonal patterns but also note a gradual downward shift.
          This visual captures how recent years tend to have less ice, especially in late summer,
          reflecting a long-term thinning of the Arctic’s icy cap.
        `}
      >
        {libSeasonal === "d3" ? (
          <SeasonalLinesChartD3 data={dailyData} />
        ) : (
          <SeasonalLinesChartRecharts data={dailyData} />
        )}
      </ChartContainer>

      <Space h="lg" />

      {/* IQR Chart */}
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
          This envelope depicts the daily sea ice extent’s 25th–75th percentile range over the
          historical record (excluding 2025). The mean line shows a typical seasonal cycle. 
          An orange trace for 2025 (if available) indicates whether current observations are
          tracking within or below the historical band, highlighting potential record lows.
        `}
      >
        {libIQR === "d3" ? (
          <IQRChartD3 data={dailyData} />
        ) : (
          <IQRChartRecharts stats={iqrStats} partial2025={partial2025} />
        )}
      </ChartContainer>

      <Space h="lg" />

      {/* Rolling Chart */}
      <ChartContainer
        title="365-Day Rolling Average"
        headerExtra={null} // No toggles
        description={`
          A rolling average smooths out daily fluctuations, showing longer-term shifts in sea ice extent.
          This curve helps isolate sustained declines from short-lived anomalies, painting a clearer picture
          of how Arctic ice coverage evolves over multiple years.
        `}
      >
        <RollingChartD3 data={dailyData} />
      </ChartContainer>

      <Space h="lg" />

      {/* Annual Sea Ice Extent Anomalies */}
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
          Aggregating daily anomalies by year reveals overall trends in sea ice coverage.
          Blue bars represent years with more ice than the historical average, while red bars
          highlight years falling below that benchmark. A predominance of red in recent decades
          signals a consistent shortfall of ice coverage.
        `}
      >
        {libAnnualAnom === "d3" ? (
          <AnnualAnomalyBarChartD3 data={annualAnomaly} />
        ) : (
          <AnnualAnomalyBarChartRecharts data={annualAnomaly} />
        )}
      </ChartContainer>

      <Space h="lg" />

      {/* Daily Anomaly Chart */}
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
          By selecting a specific year, we can compare daily sea ice coverage against a
          multi-year average. Positive anomalies mean more ice than typical for that day;
          negative anomalies suggest a deficit. This daily-level perspective reveals
          when and how a year deviates from the norm.
        `}
      >
        {libDailyAnom === "d3" ? (
          <DailyAnomalyChartD3 data={dailyData} chosenYear={dailyAnomalyYear} />
        ) : (
          <DailyAnomalyChartRecharts data={dailyData} chosenYear={dailyAnomalyYear} />
        )}
      </ChartContainer>

      <Space h="xl" />

        <ChartContainer title="Conclusions & Observations">
      <Text style={{ maxWidth: 800, margin: "0 auto" }}>
        The Arctic stands out as a region experiencing disproportionate warming. 
        Many charts illustrate the persistent decline in sea ice coverage, particularly 
        in recent decades. Correlations between rising CO₂ and increasing temperature 
        anomalies reinforce the broader narrative: greenhouse gases are fueling warming, 
        with polar areas bearing the brunt. Meanwhile, daily, seasonal, and annual analyses 
        all point toward consistent ice shortfalls. 
        <br /><br />
        These findings underscore a pressing trend: 
        the Arctic is warming faster than the global average, sea ice is diminishing, 
        and each new year seems poised to break previous records. Whether looking at 
        daily anomalies or multi-year rolling averages, the message is clear: a smaller, 
        thinner ice cap is quickly becoming the new norm, with global implications for 
        weather patterns, ecosystems, and sea levels worldwide.
      </Text>
      </ChartContainer>

      <Space h="xl" />
    </div>
  );
}
