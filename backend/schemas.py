from pydantic import BaseModel
from typing import List, Optional


class SourceFreshness(BaseModel):
    """Freshness of a single upstream dataset.

    status is one of "current" | "lagging" | "stale" | "unknown" and is derived
    from ageDays against the per-source thresholds, which are reported alongside
    so the reader (and the frontend) can see the rule that was applied.
    """
    key: str                                  # "seaIce" | "temperature" | "co2" | "fjord"
    label: Optional[str] = None               # human-readable source name
    cadence: Optional[str] = None             # "daily" | "annual" | "seasonal"
    latestDate: Optional[str] = None          # ISO date of the newest observation
    latestYear: Optional[int] = None
    referenceDate: Optional[str] = None       # date ageDays is measured from
    ageDays: Optional[int] = None
    status: str = "unknown"
    laggingAfterDays: Optional[int] = None
    staleAfterDays: Optional[int] = None


class Freshness(BaseModel):
    checkedAt: Optional[str] = None
    status: str = "unknown"                   # worst status across sources
    sources: List[SourceFreshness] = []


class FjordDataMeta(BaseModel):
    latestDate: Optional[str] = None
    latestYear: Optional[int] = None
    source: Optional[str] = None
    baselineYears: Optional[str] = None
    generatedAt: Optional[str] = None
    # NOTE: this model strips undeclared keys, so every new payload field has to
    # be declared here or it silently disappears from /uummannaq.
    freshness: Optional[Freshness] = None

class FjordSpringAnomaly(BaseModel):
    year: int
    anomaly: Optional[float]

class FjordMeanFraction(BaseModel):
    year: int
    mean: Optional[float]
    # How firm that mean is. A season is an average over the days a satellite
    # happened to see, and the seasons are not equally observed: 2017 has 39
    # measured days against 102 to 107 for most others. Bootstrapped from the
    # measured days, so the charts can draw a band instead of a point.
    observedDays: Optional[int] = None
    standardError: Optional[float] = None
    ci95: Optional[List[float]] = None

class FjordFreezeBreakup(BaseModel):
    year: int
    freeze: Optional[int]
    breakup: Optional[int]

class FjordDailyRow(BaseModel):
    date: str
    year: int
    doy: int
    frac: Optional[float]                 # smoothed/gap-filled series the charts plot
    fracRaw: Optional[float] = None       # per-scene value; None = no usable scene that day

# NEW: zusammengeführte Season-Row für Early/Late
class FjordSeasonMerged(BaseModel):
    day: str                  # "DD-Mon"
    eMean: Optional[float]
    e25:  Optional[float]
    e75:  Optional[float]
    lMean: Optional[float]
    l25:  Optional[float]
    l75:  Optional[float]

class FjordDataBundle(BaseModel):
    spring: List[FjordSpringAnomaly]
    season: List[FjordSeasonMerged]    # <— jetzt merged
    frac:   List[FjordMeanFraction]
    freeze: List[FjordFreezeBreakup]
    daily:  List[FjordDailyRow]
    seasonLossPct: Optional[float] = None   # optionales Zusatzfeld
    meta: Optional[FjordDataMeta] = None
