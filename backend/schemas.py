from pydantic import BaseModel
from typing import List, Optional

class FjordSpringAnomaly(BaseModel):
    year: int
    anomaly: Optional[float]

class FjordMeanFraction(BaseModel):
    year: int
    mean: Optional[float]

class FjordFreezeBreakup(BaseModel):
    year: int
    freeze: Optional[int]
    breakup: Optional[int]

class FjordDailyRow(BaseModel):
    date: str
    year: int
    doy: int
    frac: Optional[float]

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
