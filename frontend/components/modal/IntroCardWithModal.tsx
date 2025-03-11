"use client";
import React, { useState } from "react";
import { Modal, Button, Card, Title, Text, Group, Space, List, ThemeIcon } from "@mantine/core";
import {IconInfoCircle, IconExternalLink} from '@tabler/icons-react';

export default function IntroCardWithModal() {
  const [opened, setOpened] = useState(false);

  return (
    <>
      <Card shadow="sm" padding="lg" radius="md" withBorder style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Group justify="space-between" align="center" mb="xs">
          <Title order={2}>The Changing Arctic</Title>
          <Button variant="outline" size="xs" onClick={() => setOpened(true)} leftSection={<IconInfoCircle size={16} />}>
            About the Data
          </Button>
        </Group>

        <Text size="md" style={{ textAlign: "center", lineHeight: 1.6 }}>
          This study aggregates data from three leading climate sources: NASA GISS provides annual temperature anomaly data, NOAA supplies daily measurements of Arctic sea ice extent, and Our World in Data compiles comprehensive CO₂ emissions records. Together, these datasets reveal the dramatic warming of the Arctic relative to global trends—highlighting a steady decline in sea ice as temperatures rise. Explore the interactive charts below to understand seasonal cycles, long‐term trends, and the relationships among key climate indicators.
        </Text>
      </Card>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={<Title order={3}>How the Data is Aggregated</Title>}
        centered
        size="lg"
        padding="lg"
        transitionProps={{ transition: "pop", duration: 200 }}
      >
        <Card shadow="sm" padding="md" radius="md" withBorder style={{ backgroundColor: "#f9fafb" }}>
          <Text size="sm" style={{ lineHeight: 1.5 }}>
            The data presented in this dashboard is automatically updated daily by an automated workflow script that fetches the latest datasets, processes them, and transforms them for visualization.
          </Text>

          <Space h="md" />

          <Text size="sm" weight={600}>Data sources:</Text>
          <List spacing="xs" size="sm" icon={<ThemeIcon size={16} radius="xl" color="blue"><IconExternalLink size={14} /></ThemeIcon>}>
            <List.Item>
              <a href="https://data.giss.nasa.gov/gistemp/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "#007bff", fontWeight: 500 }}>
                NASA GISS - Annual Temperature Anomaly Data
              </a>
            </List.Item>
            <List.Item>
              <a href="https://nsidc.org/data/seaice_index" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "#007bff", fontWeight: 500 }}>
                NOAA - Daily Arctic Sea Ice Extent Data
              </a>
            </List.Item>
            <List.Item>
              <a href="https://ourworldindata.org/co2-emissions" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "#007bff", fontWeight: 500 }}>
                Our World in Data - Global CO₂ Emissions
              </a>
            </List.Item>
          </List>

          <Space h="md" />

          <Text size="sm">
            The data processing and aggregation are handled using Python and Pandas, ensuring consistency, reliability, and up-to-date insights into the evolving Arctic climate.
          </Text>
        </Card>
      </Modal>

      <Space h="lg" />
    </>
  );
}
