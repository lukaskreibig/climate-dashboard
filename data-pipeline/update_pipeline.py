# update_pipeline.py
import pandas as pd
import numpy as np
import requests
import io
import os
from datetime import datetime
from sqlalchemy import create_engine

def update_data():
    print("[INFO] Starting data update...")

    # -----------------------------------------------------
    # 1. Fetch data from NASA GISS
    # -----------------------------------------------------
    print("[INFO] Fetching NASA GISS data...")
    temp_df = pd.read_csv("https://data.giss.nasa.gov/gistemp/tabledata_v4/ZonAnn.Ts+dSST.csv")

    # -----------------------------------------------------
    # 2. Fetch daily sea ice data from NOAA
    # -----------------------------------------------------
    print("[INFO] Fetching NOAA sea ice data...")
    df_ice = pd.read_excel(
        "https://noaadata.apps.nsidc.org/NOAA/G02135/seaice_analysis/Sea_Ice_Index_Daily_Extent_G02135_v3.0.xlsx",
        sheet_name="NH-5-Day-Extent"
    )

    # -----------------------------------------------------
    # 3. Fetch CO₂ data from Our World in Data
    # -----------------------------------------------------
    print("[INFO] Fetching CO₂ data from OWID...")
    headers = {"User-Agent": "Mozilla/5.0"}
    owid_url = "https://ourworldindata.org/grapher/annual-co-emissions-by-region.csv?v=1&csvType=full"
    resp = requests.get(owid_url, headers=headers)
    if resp.status_code != 200:
        raise Exception(f"Failed to download CO₂ data. Status code: {resp.status_code}")
    co2_data = pd.read_csv(io.StringIO(resp.text))

    # -----------------------------------------------------
    # 4. Clean and transform NOAA sea ice data (example)
    # -----------------------------------------------------
    # Basic approach from your original code
    df_ice.rename(columns={df_ice.columns[0]: "Month", df_ice.columns[1]: "Day"}, inplace=True)
    df_ice["Month"] = df_ice["Month"].ffill()
    # Drop extraneous columns
    if df_ice.shape[1] > 2:
        df_ice = df_ice.iloc[:, :-3]
    # Reshape from wide to long
    df_ice_long = pd.melt(
        df_ice,
        id_vars=["Month", "Day"],
        var_name="Year",
        value_name="Extent"
    )
    # Create datetime
    df_ice_long["Date"] = pd.to_datetime(
        df_ice_long["Day"].astype(str) + " " + df_ice_long["Month"] + " " + df_ice_long["Year"].astype(str),
        errors="coerce"
    )
    df_ice_clean = df_ice_long.dropna(subset=["Extent"]).copy()
    df_ice_clean["Year"] = pd.to_numeric(df_ice_clean["Year"], errors="coerce")
    df_ice_clean = df_ice_clean[df_ice_clean["Year"].notna()]
    df_ice_clean["DayOfYear"] = df_ice_clean["Date"].dt.dayofyear
    df_ice_clean.sort_values(["Year", "DayOfYear"], inplace=True)

    # -----------------------------------------------------
    # 5. Summarize sea ice data by year and merge with NASA temp
    # -----------------------------------------------------
    sea_ice_annual = df_ice_clean.groupby("Year")["Extent"].mean().reset_index(name="SeaIceMean")
    merged_tempice = pd.merge(temp_df, sea_ice_annual, on="Year", how="inner")

    # -----------------------------------------------------
    # 6. Process CO₂ data (example)
    # -----------------------------------------------------
    co2_data["GlobalCO2Mean"] = co2_data.groupby("Year")["emissions_total"].transform("mean").round()
    global_co2 = co2_data[["Year", "GlobalCO2Mean"]].drop_duplicates()

    # Combine everything
    merged_all = pd.merge(merged_tempice, global_co2, on="Year", how="left")

    # -----------------------------------------------------
    # 7. Build correlation or compute z-scores, etc.
    # -----------------------------------------------------
    # Just an example of z-scores
    if "64N-90N" in merged_all.columns:
        arctic_series = merged_all["64N-90N"]
        merged_all["Arctic_z"] = (arctic_series - arctic_series.mean()) / arctic_series.std()

    # -----------------------------------------------------
    # 8. Write final dataframes to Postgres
    # -----------------------------------------------------
    print("[INFO] Connecting to PostgreSQL...")

    # Railway typically sets these environment variables if you add a Postgres reference
    PGHOST = os.getenv("PGHOST", "localhost")
    PGPORT = os.getenv("PGPORT", "5432")
    PGUSER = os.getenv("PGUSER", "postgres")
    PGPASSWORD = os.getenv("PGPASSWORD", "secret")
    PGDATABASE = os.getenv("PGDATABASE", "postgres")

    engine = create_engine(
        f"postgresql://{PGUSER}:{PGPASSWORD}@{PGHOST}:{PGPORT}/{PGDATABASE}"
    )

    print("[INFO] Inserting data into PostgreSQL tables...")

    # Example: store cleaned NOAA daily data
    df_ice_clean.to_sql("daily_sea_ice", engine, if_exists="replace", index=False)
    # Combined NASA + sea ice + CO₂
    merged_all.to_sql("merged_climate_data", engine, if_exists="replace", index=False)

    # Done!
    print(f"[INFO] Data pipeline completed at {datetime.now()}.")

if __name__ == "__main__":
    update_data()
