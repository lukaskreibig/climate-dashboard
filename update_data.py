import pandas as pd
import numpy as np
import json
import os
from datetime import datetime
import requests
import io

def update_data():
    # 1) NASA GISS temperature data (annual)
    temp_df = pd.read_csv("https://data.giss.nasa.gov/gistemp/tabledata_v4/ZonAnn.Ts+dSST.csv")

    # 2) Daily sea ice extent data from NOAA
    df_ice = pd.read_excel(
        "https://noaadata.apps.nsidc.org/NOAA/G02135/seaice_analysis/Sea_Ice_Index_Daily_Extent_G02135_v3.0.xlsx",
        sheet_name="NH-5-Day-Extent"
    )
    
    # 3) CO2 from Our World in Data
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    }

    url = "https://ourworldindata.org/grapher/annual-co-emissions-by-region.csv?v=1&csvType=full&useColumnShortNames=true"
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        csv_data = io.StringIO(response.text)
        annual_co_emissions = pd.read_csv(csv_data)
    else:
        raise Exception(f"Failed to download data: {response.status_code}")
    
    # --- Clean Sea Ice Data ---
    df_ice.rename(columns={df_ice.columns[0]: "Month", df_ice.columns[1]: "Day"}, inplace=True)
    df_ice["Month"] = df_ice["Month"].ffill()
    if df_ice.shape[1] > 2:
        df_ice = df_ice.iloc[:, :-3]

    df_ice_long = pd.melt(
        df_ice,
        id_vars=["Month", "Day"],
        var_name="Year",
        value_name="Extent"
    )
    df_ice_long["Date"] = pd.to_datetime(
        df_ice_long["Day"].astype(str) + " " + df_ice_long["Month"] + " " + df_ice_long["Year"].astype(str),
        errors="coerce"
    )
    df_dropped = df_ice_long[df_ice_long["Extent"].isna()]
    os.makedirs("dataset/dropped", exist_ok=True)
    df_dropped.to_csv("dataset/dropped/dropped_ice.csv", index=False)

    df_ice_clean = df_ice_long.dropna(subset=["Extent"]).copy()
    df_ice_clean["Year"] = pd.to_numeric(df_ice_clean["Year"], errors="coerce")
    df_ice_clean = df_ice_clean[df_ice_clean["Year"].notna()]
    df_ice_clean["DayOfYear"] = df_ice_clean["Date"].dt.dayofyear
    df_ice_clean.sort_values(["Year", "DayOfYear"], inplace=True)

    # Summarize sea ice data by year for annual merges
    sea_ice_annual = df_ice_clean.groupby("Year")["Extent"].mean().reset_index(name="SeaIceMean")

    # Merge temperature & sea ice
    merged_tempice = pd.merge(temp_df, sea_ice_annual, on="Year", how="inner")

    # Process CO2 data
    annual_co_emissions["GlobalCO2Mean"] = (
        annual_co_emissions.groupby("Year")["emissions_total"]
        .transform("mean")
        .round()
    )
    co2_wide = annual_co_emissions.pivot(index="Year", columns="Entity", values="emissions_total")
    merged_all = pd.merge(merged_tempice, co2_wide, on="Year", how="left")
    global_co2 = annual_co_emissions[["Year", "GlobalCO2Mean"]].drop_duplicates()
    merged_all = pd.merge(merged_all, global_co2, on="Year", how="left")

    # Create z-score columns
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

    # Build correlation matrix [ "Glob", "64N-90N", "GlobalCO2Mean" ]
    corr_vars = ["Glob","64N-90N","GlobalCO2Mean"]
    subset_df = merged_all[corr_vars].dropna()
    corr_matrix = subset_df.corr(method="pearson")  # DataFrame
    # transform to a list: [ {row: 'Glob', col: '64N-90N', val: 0.92}, ...]
    heatmap_list = []
    for row_var in corr_vars:
        for col_var in corr_vars:
            val = corr_matrix.loc[row_var, col_var]
            heatmap_list.append({
                "rowLabel": row_var,
                "colLabel": col_var,
                "value": float(val)
            })

    # -------------- Daily sea ice data for the final JSON --------------
    df_ice_clean["DateStr"] = df_ice_clean["Date"].dt.strftime("%Y-%m-%d")
    daily_ice_records = df_ice_clean.drop(columns=["Date"]).to_dict(orient="records")

    # -------------- Precompute IQR stats --------------
    # exclude 2025
    main_iqr = df_ice_clean[df_ice_clean["Year"]!=2025]
    grouped = main_iqr.groupby("DayOfYear")["Extent"]
    min_series = grouped.min().rename("minVal")
    q25_series = grouped.quantile(0.25).rename("q25")
    q75_series = grouped.quantile(0.75).rename("q75")
    mean_series = grouped.mean().rename("meanVal")

    iqr_stats = pd.concat([min_series, q25_series, q75_series, mean_series], axis=1).reset_index()

    iqr_stats_list = iqr_stats.to_dict(orient="records")

    # partial 2025
    partial_2025_df = df_ice_clean[df_ice_clean["Year"]==2025].copy()
    if len(partial_2025_df)>0:
        partial_2025_list = partial_2025_df[["DayOfYear","Extent"]].to_dict(orient="records")
    else:
        partial_2025_list = []

    # -------------- Annual Sea Ice Extent Anomalies for Bar Chart --------------
    # from your snippet
    seasonal_mean = df_ice_clean.groupby("DayOfYear")["Extent"].mean().reset_index(name="Seasonal_Mean")
    merged_for_anomaly = df_ice_clean.merge(seasonal_mean, on="DayOfYear", how="left")
    merged_for_anomaly["DailyAnomaly"] = merged_for_anomaly["Extent"] - merged_for_anomaly["Seasonal_Mean"]
    df_annual_anomaly = merged_for_anomaly.groupby("Year", as_index=False)["DailyAnomaly"].mean()
    df_annual_anomaly.rename(columns={"DailyAnomaly":"AnnualAnomaly"}, inplace=True)
    
    annual_anomaly_list = df_annual_anomaly.to_dict(orient="records")

    # Replace NaN with None
    merged_all = merged_all.replace({np.nan: None})
    daily_ice_records = [
        {k: (None if pd.isna(v) else v) for k,v in row.items()}
        for row in daily_ice_records
    ]

    # Convert merged_all to list
    annual_records = merged_all.to_dict(orient="records")

    # final structure
    final_output = {
        "annual": annual_records,
        "dailySeaIce": daily_ice_records,
        # new items
        "corrMatrix": heatmap_list,     # for Recharts heatmap
        "iqrStats": iqr_stats_list,     # for Recharts IQR
        "partial2025": partial_2025_list,
        "annualAnomaly": annual_anomaly_list  # for the new bar chart
    }

    os.makedirs("data", exist_ok=True)
    output_path = os.path.join("data", "data.json")
    with open(output_path, "w") as f:
        json.dump(final_output, f, indent=2)

    print(f"Data updated at {datetime.now()} and saved to {output_path}")

if __name__ == "__main__":
    update_data()
