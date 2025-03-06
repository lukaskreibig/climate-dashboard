import os
import requests

# Dictionary mapping filenames to their URLs.
urls = {
    "ZonAnn.Ts+dSST.csv": "https://data.giss.nasa.gov/gistemp/tabledata_v4/ZonAnn.Ts+dSST.csv",
    "Sea_Ice_Index_Daily_Extent_G02135_v3.0.xlsx": "https://noaadata.apps.nsidc.org/NOAA/G02135/seaice_analysis/Sea_Ice_Index_Daily_Extent_G02135_v3.0.xlsx",
    "annual-co-emissions-by-region.csv": "https://ourworldindata.org/grapher/annual-co-emissions-by-region.csv?v=1&csvType=full&useColumnShortNames=true"
}

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
}

# Ensure the 'dataset' directory exists.
os.makedirs("dataset", exist_ok=True)

for filename, url in urls.items():
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        with open(os.path.join("dataset", filename), "wb") as f:
            f.write(response.content)
        print(f"Downloaded {filename}")
    else:
        print(f"Failed to download {filename} (status code: {response.status_code})")
