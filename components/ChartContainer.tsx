"use client";
import React from "react";
import { Card, Title, Text, Divider } from "@mantine/core";

interface ChartContainerProps {
  title: string;
  description?: string;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}

export default function ChartContainer({
  title,
  description,
  headerExtra,
  children,
}: ChartContainerProps) {
  return (
    <Card shadow="sm" radius="md" withBorder p="lg" mb="xl">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Title order={3} style={{ margin: 0 }}>{title}</Title>
        {headerExtra && <div>{headerExtra}</div>}
      </div>
      {description && (
        <Text size="sm" mb="md" pt="md">
          {description}
        </Text>
      )}
      <Divider mb="md" />
      {children}
    </Card>
  );
}
