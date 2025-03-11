# Climate Dashboard

An interactive, data-driven dashboard that visualizes climate data—including temperature anomalies, sea ice extent, and CO₂ emissions—to illustrate how the Arctic is changing compared to global trends. The project leverages Next.js for the web framework, D3.js and Recharts for interactive charting, and Mantine for UI components. **Data is updated daily** via an automated GitHub workflow using a Python script.

<img width="1201" alt="Bildschirmfoto 2025-03-07 um 08 36 22" src="https://github.com/user-attachments/assets/983ba157-e598-42a6-944a-82161b72d1c7" />

## Deployed Version

Explore the live version of the Climate Dashboard:

👉 [View Live Dashboard](climate-dashboard-three.vercel.app)

## Overview

The Climate Dashboard provides a visual story of how climate variables evolve over time. The dashboard:
- Compares Arctic temperature anomalies against global averages.
- Tracks changes in sea ice extent using daily and annual data.
- Illustrates CO₂ emission trends and their correlation with temperature anomalies.
- Offers interactive toggles to switch between different charting libraries (D3.js vs. Recharts) for a flexible visualization experience.

## Features

- **Multi-Line Charts:** Compare multiple variables (e.g., Arctic, global, CO₂) on a single chart with interactive legends and tooltips.
- **Z-Score Visualizations:** Standardize values to compare disparate scales and reveal underlying trends.
- **Bar Charts:** A snapshot view of anomalies for a specific year (e.g., 2024) that highlights polar amplification.
- **Scatter Plots with Trendlines:** Visualize relationships between global temperature and sea ice extent.
- **Correlation Heatmaps:** Understand how key climate indicators correlate over time.
- **Seasonal & Daily Anomaly Charts:** Drill down into seasonal patterns and daily deviations.
- **Toggle & Switch Controls:** Seamlessly switch between D3.js and Recharts versions of each chart for comparison.
- **Responsive Design:** Built using Next.js and Mantine for a modern, responsive user interface.

## Technologies Used

- **Pandas & Python:** For data processing and transformation.
- **GitHub Actions:** For automating daily data updates via a Python script.
- **Next.js:** Server-side rendering and routing.
- **React:** Component-based UI development.
- **D3.js:** Custom, low-level data visualizations.
- **Recharts:** High-level charting components for React.
- **Mantine UI:** Modern React component library for styling.

## Data Sources

This project relies on **scientifically verified** datasets from trusted institutions. The data is automatically updated daily.

### Primary Data Sources:
- **<a href="https://data.giss.nasa.gov/gistemp/" target="_blank" rel="noopener noreferrer">NASA GISS - Annual Temperature Anomaly Data</a>**
- **<a href="https://nsidc.org/data/seaice_index" target="_blank" rel="noopener noreferrer">NOAA - Daily Arctic Sea Ice Extent Data</a>**
- **<a href="https://ourworldindata.org/co2-emissions" target="_blank" rel="noopener noreferrer">Our World in Data - Global CO₂ Emissions</a>**

Each dataset undergoes preprocessing to ensure consistency and accuracy before being visualized.

## Data Processing
This project uses an automated data workflow to ensure that the visualizations are always up-to-date with the latest climate data. The update-data.py script (triggered daily via a GitHub Actions workflow) performs the following tasks:

## Data Cleaning and Transformation:

- Cleans and reshapes NOAA sea ice data.
- Merges temperature and sea ice datasets to create a unified view.
- Processes CO₂ data to compute global averages and pivot data by entity.
- Computes z-scores for temperature and CO₂ data to standardize different scales.
- Generates a Pearson correlation matrix and precomputes IQR statistics.
- Aggregates daily anomalies for annual bar chart visualization.
- Final transformed data is saved as a JSON file (data/data.json), which is then consumed by the dashboard for rendering the interactive charts.
