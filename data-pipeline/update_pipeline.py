import pandas as pd
import numpy as np
import json
import os
from datetime import datetime
import requests
import io

# For inserting into Postgres
from sqlalchemy import create_engine

def update_data():
    """
    Download and process climate datasets to produce a unified JSON payload
    and optionally persist results into a Postgres database.  This version
    uses the v4 daily sea ice extent CSV from NSIDC (NOAA G02135) instead
    of the deprecated v3 Excel file.  All downstream calculations and
    output structures remain unchanged so that the frontend continues to
    receive the same camelCase keys.  When a DATABASE_URL is provided,
    each DataFrame is written into snake_case tables.
    """
    # ------------------------------------------------------------------
    # 1) NASA GISS temperature data (annual)
    temp_df = pd.read_csv(
        "https://data.giss.nasa.gov/gistemp/tabledata_v4/ZonAnn.Ts+dSST.csv"
    )
    os.makedirs("data", exist_ok=True)
    temp_df.to_csv(
        os.path.join("data", "original_temperature_nasa.csv"), index=False
    )

    # ------------------------------------------------------------------
    # 2) Daily sea ice extent data from NSIDC (NOAA G02135 v4)
    # The v3 Excel file is no longer available.  Version 4 publishes
    # CSVs per hemisphere.  We'll download the Northern Hemisphere
    # daily extent file and derive Date, Year and DayOfYear columns.
    V4_NH_DAILY_CSV = os.getenv(
        "SEA_ICE_DAILY_CSV_URL",
        "https://masie_web.apps.nsidc.org/pub/DATASETS/NOAA/G02135/north/daily/data/N_seaice_extent_daily_v4.0.csv",
    )
    df_raw = pd.read_csv(V4_NH_DAILY_CSV)
    # Filter to Northern Hemisphere rows if the 'hemi' column exists
    if "hemi" in df_raw.columns:
        df_raw = df_raw[df_raw["hemi"] == "N"].copy()
    # Construct a proper Date column
    df_raw["Date"] = pd.to_datetime(
        {
            "year": df_raw["year"],
            "month": df_raw["mo"],
            "day": df_raw["da"],
        },
        errors="coerce",
    )
    # Drop rows without valid date or extent value
    df_raw = df_raw.dropna(subset=["Date", "extent"]).copy()
    # Derive additional columns
    df_raw["Year"] = df_raw["Date"].dt.year.astype(int)
    df_raw["DayOfYear"] = df_raw["Date"].dt.dayofyear.astype(int)
    df_raw["Extent"] = df_raw["extent"].astype(float)
    # We only need Date, Year, DayOfYear, and Extent for downstream processing
    df_ice = df_raw[["Date", "Year", "DayOfYear", "Extent"]].copy()
    # Save raw CSV for reproducibility
    os.makedirs("data/csv", exist_ok=True)
    df_raw.to_csv(os.path.join("data", "original_ice_noaa.csv"), index=False)

    # ------------------------------------------------------------------
    # 3) CO₂ emissions data from Our World in Data
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/114.0.0.0 Safari/537.36",
    }
    url = (
        "https://ourworldindata.org/grapher/annual-co-emissions-by-region.csv?v=1"
        "&csvType=full&useColumnShortNames=true"
    )
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        csv_data = io.StringIO(response.text)
        annual_co_emissions = pd.read_csv(csv_data)
        annual_co_emissions.to_csv(
            os.path.join("data", "original_co2_worldindata.csv"), index=False
        )
    else:
        raise Exception(f"Failed to download CO₂ data: {response.status_code}")

    # ------------------------------------------------------------------
    # 4) Clean sea ice data and compute derived statistics
    # For v4 CSV the data is already long-format.  Remove NaN Extent rows.
    df_ice_clean = df_ice.dropna(subset=["Extent"]).copy()
    # Sorting ensures downstream calculations (e.g. rolling means) work as expected
    df_ice_clean.sort_values(["Year", "DayOfYear"], inplace=True)

    # Compute annual mean sea ice extent to merge with temperature data
    sea_ice_annual = (
        df_ice_clean.groupby("Year")["Extent"]
        .mean()
        .reset_index(name="SeaIceMean")
    )

    # ------------------------------------------------------------------
    # 5) Merge temperature & sea ice and process CO₂ data
    merged_tempice = pd.merge(temp_df, sea_ice_annual, on="Year", how="inner")

    if "emissions_total" not in annual_co_emissions.columns:
        raise KeyError(
            "Missing column 'emissions_total' in CO₂ data. "
            f"Check actual columns: {annual_co_emissions.columns}"
        )

    # Compute a global mean CO₂ per year
    annual_co_emissions["GlobalCO2Mean"] = (
        annual_co_emissions.groupby("Year")["emissions_total"]
        .transform("mean")
        .round()
    )
    # Pivot to wide form by region for correlation matrix
    co2_wide = annual_co_emissions.pivot(index="Year", columns="Entity", values="emissions_total")
    merged_all = pd.merge(merged_tempice, co2_wide, on="Year", how="left")
    global_co2 = annual_co_emissions[["Year", "GlobalCO2Mean"]].drop_duplicates()
    merged_all = pd.merge(merged_all, global_co2, on="Year", how="left")

    # ------------------------------------------------------------------
    # 6) Compute z-score columns
    arctic_series = merged_all["64N-90N"]
    seaice_series = merged_all["SeaIceMean"]
    co2_series = merged_all["GlobalCO2Mean"]

    arctic_mean, arctic_std = arctic_series.mean(), arctic_series.std()
    seaice_mean, seaice_std = seaice_series.mean(), seaice_series.std()
    co2_mean, co2_std = co2_series.mean(), co2_series.std()

    merged_all["Arctic_z"] = (arctic_series - arctic_mean) / arctic_std
    merged_all["SeaIce_z"] = (seaice_series - seaice_mean) / seaice_std
    merged_all["SeaIce_z_inv"] = -(merged_all["SeaIce_z"])
    merged_all["GlobCO2Mean_z"] = (co2_series - co2_mean) / co2_std

    # ------------------------------------------------------------------
    # 7) Build correlation matrix for Recharts heatmap
    corr_vars = ["Glob", "64N-90N", "GlobalCO2Mean"]
    subset_df = merged_all[corr_vars].dropna()
    corr_matrix = subset_df.corr(method="pearson")
    heatmap_list = []
    for row_var in corr_vars:
        for col_var in corr_vars:
            val = corr_matrix.loc[row_var, col_var]
            heatmap_list.append(
                {"rowLabel": row_var, "colLabel": col_var, "value": float(val)}
            )

    # ------------------------------------------------------------------
    # 8) Precompute IQR stats (exclude 2025)
    main_iqr = df_ice_clean[df_ice_clean["Year"] != 2025]
    grouped = main_iqr.groupby("DayOfYear")["Extent"]
    min_series = grouped.min().rename("minVal")
    q25_series = grouped.quantile(0.25).rename("q25")
    q75_series = grouped.quantile(0.75).rename("q75")
    mean_series = grouped.mean().rename("meanVal")
    iqr_stats = pd.concat(
        [min_series, q25_series, q75_series, mean_series], axis=1
    ).reset_index()
    iqr_stats_list = iqr_stats.to_dict(orient="records")

    # ------------------------------------------------------------------
    # 9) Partial 2025 data (if present)
    partial_2025_df = df_ice_clean[df_ice_clean["Year"] == 2025].copy()
    if len(partial_2025_df) > 0:
        partial_2025_list = partial_2025_df[["DayOfYear", "Extent"]].to_dict(
            orient="records"
        )
    else:
        partial_2025_list = []

    # ------------------------------------------------------------------
    # 10) Annual sea ice extent anomalies for bar chart
    seasonal_mean = (
        df_ice_clean.groupby("DayOfYear")["Extent"]
        .mean()
        .reset_index(name="Seasonal_Mean")
    )
    merged_for_anomaly = df_ice_clean.merge(
        seasonal_mean, on="DayOfYear", how="left"
    )
    merged_for_anomaly["DailyAnomaly"] = (
        merged_for_anomaly["Extent"] - merged_for_anomaly["Seasonal_Mean"]
    )
    df_annual_anomaly = merged_for_anomaly.groupby("Year", as_index=False)[
        "DailyAnomaly"
    ].mean()
    df_annual_anomaly.rename(
        columns={"DailyAnomaly": "AnnualAnomaly"}, inplace=True
    )
    annual_anomaly_list = df_annual_anomaly.to_dict(orient="records")

    # ------------------------------------------------------------------
    # 11) Daily sea ice records
    df_ice_clean["DateStr"] = df_ice_clean["Date"].dt.strftime("%Y-%m-%d")
    daily_ice_records = df_ice_clean.drop(columns=["Date"]).to_dict(
        orient="records"
    )
    # Replace NaNs with None for JSON serialization
    daily_ice_records = [
        {k: (None if pd.isna(v) else v) for k, v in row.items()}
        for row in daily_ice_records
    ]

    # ------------------------------------------------------------------
    # 12) Convert final DataFrames to Python dicts for JSON
    merged_all = merged_all.replace({np.nan: None})
    annual_records = merged_all.to_dict(orient="records")

    final_output = {
        "annual": annual_records,
        "dailySeaIce": daily_ice_records,
        "corrMatrix": heatmap_list,
        "iqrStats": iqr_stats_list,
        "partial2025": partial_2025_list,
        "annualAnomaly": annual_anomaly_list,
    }

    # ------------------------------------------------------------------
    # 13) Persist to CSV/JSON for local development
    annual_df = pd.DataFrame(annual_records)
    daily_df = pd.DataFrame(daily_ice_records)
    corr_df = pd.DataFrame(heatmap_list)
    iqr_df = pd.DataFrame(iqr_stats_list)
    p2025_df = pd.DataFrame(partial_2025_list)
    anomaly_df = pd.DataFrame(annual_anomaly_list)

    # Create directories if not present
    os.makedirs("data/csv", exist_ok=True)
    os.makedirs("data/csv/dropped", exist_ok=True)
    # Save CSVs
    annual_df.to_csv(os.path.join("data/csv", "annual.csv"), index=False)
    daily_df.to_csv(os.path.join("data/csv", "dailySeaIce.csv"), index=False)
    corr_df.to_csv(os.path.join("data/csv", "corrMatrix.csv"), index=False)
    iqr_df.to_csv(os.path.join("data/csv", "iqrStats.csv"), index=False)
    p2025_df.to_csv(os.path.join("data/csv", "partial2025.csv"), index=False)
    anomaly_df.to_csv(os.path.join("data/csv", "annualAnomaly.csv"), index=False)

    # Save combined JSON
    with open(os.path.join("data", "data.json"), "w") as f:
        json.dump(final_output, f, indent=2)

    # ------------------------------------------------------------------
    # 14) Optionally insert each DataFrame into Postgres if DATABASE_URL is set
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        engine = create_engine(database_url)
        print("[INFO] Inserting DataFrames into Postgres...")
        # Write into snake_case tables.  These names are mapped back to
        # camelCase in the API response for the frontend.
        annual_df.to_sql("annual", engine, if_exists="replace", index=False)
        daily_df.to_sql("daily_sea_ice", engine, if_exists="replace", index=False)
        corr_df.to_sql("corr_matrix", engine, if_exists="replace", index=False)
        iqr_df.to_sql("iqr_stats", engine, if_exists="replace", index=False)
        p2025_df.to_sql("partial_2025", engine, if_exists="replace", index=False)
        anomaly_df.to_sql(
            "annual_anomaly", engine, if_exists="replace", index=False
        )
        print("[INFO] Successfully inserted data into Postgres.")
    else:
        print("[INFO] No DATABASE_URL found, skipping Postgres insert.")

    print(
        f"Data updated at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} "
        f"and saved to data/data.json"
    )


if __name__ == "__main__":
    update_data()