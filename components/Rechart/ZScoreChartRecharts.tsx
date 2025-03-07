"use client";
import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { Switch, Group } from "@mantine/core";

export interface AnnualRowZ {
  Year: number;
  Arctic_z?: number | null;
  SeaIce_z?: number | null;
  SeaIce_z_inv?: number | null;
  GlobCO2Mean_z?: number | null;
}

interface ZScoreChartRechartsProps {
  data: AnnualRowZ[];
  inverted?: boolean;
}

export default function ZScoreChartRecharts({ data, inverted = false }: ZScoreChartRechartsProps) {
  // Local state for inversion; initial value from the prop inverted.
  const [localInverted, setLocalInverted] = useState<boolean>(inverted);

  // Compute the final data: include a new property SeaIceFinal that is either SeaIce_z or SeaIce_z_inv
  const finalData = useMemo(() => {
    return data.map(d => {
      const seaVal = localInverted ? d.SeaIce_z_inv : d.SeaIce_z;
      return { ...d, SeaIceFinal: seaVal };
    });
  }, [data, localInverted]);

  // State to allow hiding/showing lines via legend clicks.
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);

  function handleLegendClick(o: any) {
    const { dataKey } = o;
    if (hiddenKeys.includes(dataKey)) {
      setHiddenKeys(hiddenKeys.filter(k => k !== dataKey));
    } else {
      setHiddenKeys([...hiddenKeys, dataKey]);
    }
  }

  return (
    <div style={{ width: "100%", height: 400 }}>
      {/* Inversion toggle placed above the chart */}
      <Group justify="center" mb="md">
        <Switch 
          label="Invert Sea Ice" 
          checked={localInverted}
          onChange={(event) => setLocalInverted(event.currentTarget.checked)}
          color="blue"
        />
      </Group>
      <ResponsiveContainer>
        <LineChart data={finalData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="Year" tickFormatter={(v) => String(v)} />
          <YAxis />
          <Tooltip formatter={(val) => (typeof val === "number" ? val.toFixed(2) : val)} />
          <Legend onClick={handleLegendClick} />
          <Line 
            type="monotone"
            dataKey="Arctic_z"
            name="Arctic Temp (z)"
            stroke="red"
            hide={hiddenKeys.includes("Arctic_z")}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="SeaIceFinal"
            name={localInverted ? "Sea Ice (inverted, z)" : "Sea Ice (z)"}
            stroke="blue"
            hide={hiddenKeys.includes("SeaIceFinal")}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="GlobCO2Mean_z"
            name="CO₂ (z)"
            stroke="orange"
            hide={hiddenKeys.includes("GlobCO2Mean_z")}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
