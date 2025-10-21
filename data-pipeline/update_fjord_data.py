#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
update_fjord_data.py — compute season bands, spring anomalies, mean fractions
and freeze/breakup dates for the Uummannaq Fjord dataset and load them into
PostgreSQL.
"""

import os
import pandas as pd
from sqlalchemy import create_engine, text

# Constants matching the original front-end logic
SUN_START = 45     # 14-Feb
SUN_END   = 180    # 29-Jun
SPRING_A  = 60     # 1-Mar
SPRING_B  = 151    # 31-May
THRESHOLD = 0.15
EARLY_YRS = [2017, 2018, 2019, 2020]
LATE_YRS  = [2021, 2022, 2023, 2024, 2025]
FJORD_KM2 = 3450

engine = create_engine(os.environ["DATABASE_URL"])

def create_tables(engine):
    """Create tables if they do not already exist."""
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS fjord_daily (
                date date PRIMARY KEY,
                year integer NOT NULL,
                doy integer NOT NULL,
                frac double precision,
                frac_smooth double precision
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS fjord_season_band (
                doy integer NOT NULL,
                period text NOT NULL,
                mean double precision,
                p25 double precision,
                p75 double precision,
                PRIMARY KEY (doy, period)
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS fjord_spring_anomaly (
                year integer PRIMARY KEY,
                anomaly double precision
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS fjord_mean_fraction (
                year integer PRIMARY KEY,
                mean double precision
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS fjord_freeze_breakup (
                year integer PRIMARY KEY,
                freeze_doy integer,
                breakup_doy integer
            )
        """))

def ensure_schema(engine):
    """
    Migrate old column names/types if a previous run created different shapes.
    - Renames legacy columns "freeze" -> freeze_doy, "breakup" -> breakup_doy (quoted).
    - Adds *_doy columns if missing.
    - Ensures fjord_daily.date is DATE.
    """
    with engine.begin() as c:
        # Ensure fjord_freeze_breakup exists (in case create_tables wasn't called)
        c.execute(text("""
            CREATE TABLE IF NOT EXISTS fjord_freeze_breakup (
                year integer PRIMARY KEY,
                freeze_doy integer,
                breakup_doy integer
            )
        """))

        # Read existing columns
        cols = c.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'fjord_freeze_breakup'
        """)).scalars().all()
        cols = set(cols)

        # Safely rename legacy columns if present (quote legacy names)
        if "freeze_doy" not in cols and "freeze" in cols:
            c.execute(text('ALTER TABLE fjord_freeze_breakup RENAME COLUMN "freeze" TO freeze_doy'))
        if "breakup_doy" not in cols and "breakup" in cols:
            c.execute(text('ALTER TABLE fjord_freeze_breakup RENAME COLUMN "breakup" TO breakup_doy'))

        # Re-check and add columns if still missing
        cols = c.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'fjord_freeze_breakup'
        """)).scalars().all()
        cols = set(cols)
        if "freeze_doy" not in cols:
            c.execute(text("ALTER TABLE fjord_freeze_breakup ADD COLUMN freeze_doy integer"))
        if "breakup_doy" not in cols:
            c.execute(text("ALTER TABLE fjord_freeze_breakup ADD COLUMN breakup_doy integer"))

        # Ensure fjord_daily exists and date is DATE
        c.execute(text("""
            CREATE TABLE IF NOT EXISTS fjord_daily (
                date date PRIMARY KEY,
                year integer NOT NULL,
                doy integer NOT NULL,
                frac double precision,
                frac_smooth double precision
            )
        """))
        dtype = c.execute(text("""
            SELECT data_type
            FROM information_schema.columns
            WHERE table_name='fjord_daily' AND column_name='date'
        """)).scalar()
        if dtype and dtype.lower() != "date":
            c.execute(text("""
                ALTER TABLE fjord_daily
                ALTER COLUMN date TYPE date USING date::date
            """))

def update_fjord_data():
    """Compute derived metrics and write them to the database."""
    csv_path = os.getenv("FJORD_CSV_PATH", "/app/data/summary_test_cleaned.csv")
    rows = pd.read_csv(csv_path, parse_dates=['date'])
    rows.columns = [c.lower() for c in rows.columns]
    rows = rows[['date', 'year', 'doy', 'frac_smooth']].rename(columns={'frac_smooth': 'frac'}).copy()

    # ensure pure DATE before writing (not timestamp)
    rows['date'] = pd.to_datetime(rows['date']).dt.date

    # --- ensure DB schema is correct (handles upgrades)
    ensure_tables(engine)
    ensure_schema(engine)

    # 1) fjord_daily (truncate + append to keep PK/indexes intact)
    with engine.begin() as c:
        c.execute(text("TRUNCATE fjord_daily"))
    rows.to_sql('fjord_daily', engine, if_exists='append', index=False, method='multi')

    # helpers
    mean = lambda s: float(s.mean()) if len(s) else None
    pct  = lambda s,q: float(s.quantile(q)) if len(s) else None

    # 2) fjord_season_band
    records = []
    for doy in range(SUN_START, SUN_END + 1):
        for period, years in [('early', EARLY_YRS), ('late', LATE_YRS)]:
            vals = rows.query('year in @years and doy == @doy')['frac']
            records.append({
                'doy': doy,
                'period': period,
                'mean': mean(vals),
                'p25': pct(vals, 0.25),
                'p75': pct(vals, 0.75),
            })
    with engine.begin() as c:
        c.execute(text("TRUNCATE fjord_season_band"))
    pd.DataFrame(records).to_sql('fjord_season_band', engine, if_exists='append', index=False, method='multi')

    # 3) fjord_spring_anomaly
    spring_means = rows.query('doy >= @SPRING_A and doy <= @SPRING_B').groupby('year')['frac'].mean()
    baseline = spring_means.loc[[y for y in EARLY_YRS if y in spring_means.index]].mean()
    spring_anomaly = spring_means.subtract(baseline).mul(FJORD_KM2).round(1).reset_index()
    spring_anomaly.columns = ['year', 'anomaly']
    with engine.begin() as c:
        c.execute(text("TRUNCATE fjord_spring_anomaly"))
    spring_anomaly.to_sql('fjord_spring_anomaly', engine, if_exists='append', index=False, method='multi')

    # 4) fjord_mean_fraction
    mean_fraction = rows.query('doy >= @SUN_START and doy <= @SUN_END').groupby('year')['frac'].mean().round(4).reset_index()
    mean_fraction.columns = ['year', 'mean']
    with engine.begin() as c:
        c.execute(text("TRUNCATE fjord_mean_fraction"))
    mean_fraction.to_sql('fjord_mean_fraction', engine, if_exists='append', index=False, method='multi')

    # 5) fjord_freeze_breakup (write *_doy columns; schema is guaranteed by ensure_schema)
    fb_records = []
    for year, grp in rows.groupby('year'):
        frozen = grp.loc[grp['frac'] >= THRESHOLD, 'doy']
        freeze_doy  = int(frozen.min()) if len(frozen) else None
        breakup_doy = int(frozen.max()) if len(frozen) else None
        fb_records.append({'year': year, 'freeze_doy': freeze_doy, 'breakup_doy': breakup_doy})
    with engine.begin() as c:
        c.execute(text("TRUNCATE fjord_freeze_breakup"))
    pd.DataFrame(fb_records).to_sql('fjord_freeze_breakup', engine, if_exists='append', index=False, method='multi')

def ensure_tables(engine):
    """Ensure tables exist even in hosted environments where __main__ isn't run."""
    create_tables(engine)


if __name__ == '__main__':
    ensure_tables(engine)
    update_fjord_data()
