import pandas as pd
import numpy as np
import json
import os
from datetime import datetime

def update_data():
    # 1) Download the raw NASA GISS temperature data (annual).
    temp_df = pd.read_csv("https://data.giss.nasa.gov/gistemp/tabledata_v4/ZonAnn.Ts+dSST.csv")
    # Example columns: Year, Glob, NHem, SHem, 64N-90N, etc.

    # 2) Sea ice extent data from NOAA (Excel file) - daily coverage.
    df_ice = pd.read_excel(
        "https://noaadata.apps.nsidc.org/NOAA/G02135/seaice_analysis/Sea_Ice_Index_Daily_Extent_G02135_v3.0.xlsx",
        sheet_name="NH-5-Day-Extent"
    )
    
    # 3) CO₂ from Our World in Data
    annual_co_emissions = pd.read_csv(
        "https://ourworldindata.org/grapher/annual-co-emissions-by-region.csv?v=1&csvType=full&useColumnShortNames=true"
    )
    
    # --- Clean Sea Ice Data ---
    # The sheet is structured with Month, Day in first two columns, then columns for each year
    df_ice.rename(columns={df_ice.columns[0]: "Month", df_ice.columns[1]: "Day"}, inplace=True)
    df_ice["Month"] = df_ice["Month"].ffill()  # fill merged cells
    # Possibly remove the last 3 columns if they're footnotes or extraneous
    if df_ice.shape[1] > 2:
        df_ice = df_ice.iloc[:, :-3]

    # Reshape from wide to long
    df_ice_long = pd.melt(
        df_ice,
        id_vars=["Month", "Day"],
        var_name="Year",
        value_name="Extent"
    )
    
    # Build a proper date
    # Example date format: "1 January 1978"
    df_ice_long["Date"] = pd.to_datetime(
        df_ice_long["Day"].astype(str) + " " + df_ice_long["Month"] + " " + df_ice_long["Year"].astype(str),
        errors="coerce"
    )

    # Save the dropped (missing Extent) somewhere if wanted
    df_dropped = df_ice_long[df_ice_long["Extent"].isna()]
    os.makedirs("dataset/dropped", exist_ok=True)
    df_dropped.to_csv("dataset/dropped/dropped_ice.csv", index=False)

    # Keep only valid rows
    df_ice_clean = df_ice_long.dropna(subset=["Extent"]).copy()
    # Convert Year to numeric
    df_ice_clean["Year"] = pd.to_numeric(df_ice_clean["Year"], errors="coerce")
    df_ice_clean = df_ice_clean[df_ice_clean["Year"].notna()]
    df_ice_clean["DayOfYear"] = df_ice_clean["Date"].dt.dayofyear
    df_ice_clean.sort_values(["Year", "DayOfYear"], inplace=True)

    # Summarize sea ice data by year for annual merges
    sea_ice_annual = df_ice_clean.groupby("Year")["Extent"].mean().reset_index(name="SeaIceMean")

    # --- Merge Temperature & Sea Ice (annual) ---
    # NASA data has the "Year" column. We'll do an inner merge on Year => annual data
    merged_tempice = pd.merge(temp_df, sea_ice_annual, on="Year", how="inner")

    # --- Process CO₂ data ---
    # The data has columns: Entity, Code, Year, emissions_total, etc.
    # We'll create a "GlobalCO2Mean" by grouping by Year => mean of all "emissions_total"
    annual_co_emissions["GlobalCO2Mean"] = (
        annual_co_emissions.groupby("Year")["emissions_total"]
        .transform("mean")
        .round()
    )

    # Pivot wide to keep each Entity's emission in a separate column
    co2_wide = annual_co_emissions.pivot(index="Year", columns="Entity", values="emissions_total")
    # Merge with merged_tempice
    merged_all = pd.merge(merged_tempice, co2_wide, on="Year", how="left")

    # Also merge the single "GlobalCO2Mean"
    global_co2 = annual_co_emissions[["Year", "GlobalCO2Mean"]].drop_duplicates()
    merged_all = pd.merge(merged_all, global_co2, on="Year", how="left")

    # Now we have: 
    #  - columns from NASA GISS data (Year, Glob, 64N-90N, etc.)
    #  - a SeaIceMean (annual) 
    #  - columns for each Entity's emissions, plus GlobalCO2Mean

    # --- We also want daily sea ice for the final JSON ---
    # We'll keep the daily data in a separate dictionary structure so we can do daily-based charts.
    # For each row in df_ice_clean, we have (Year, Date, DayOfYear, Extent, etc.)
    df_ice_clean["DateStr"] = df_ice_clean["Date"].dt.strftime("%Y-%m-%d")

    # Convert daily sea ice data to a list of dicts
    daily_ice_records = df_ice_clean.drop(columns=["Date"]).to_dict(orient="records")

    # Replace any np.nan with None in merged_all
    merged_all = merged_all.replace({np.nan: None})
    daily_ice_records = [
        {k: (None if pd.isna(v) else v) for k,v in row.items()}
        for row in daily_ice_records
    ]

    # Convert merged_all (annual data) to a list of dict
    annual_records = merged_all.to_dict(orient="records")

    # Combine them in one final structure
    # so data.json => { "annual": [...], "dailySeaIce": [...] }
    final_output = {
        "annual": annual_records,
        "dailySeaIce": daily_ice_records
    }

    os.makedirs("data", exist_ok=True)
    output_path = os.path.join("data", "data.json")

    with open(output_path, "w") as f:
        json.dump(final_output, f, indent=2)

    print(f"Data updated at {datetime.now()} and saved to {output_path}")

if __name__ == "__main__":
    update_data()
