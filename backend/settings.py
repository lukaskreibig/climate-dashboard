from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralised, typed application configuration."""

    model_config = SettingsConfigDict(
        # absolute path → found no matter which directory the app starts from
        env_file=Path(__file__).resolve().parent / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: Optional[str] = None
    database_public_url: Optional[str] = None
    openai_api_key: Optional[str] = None
    openrouter_api_key: Optional[str] = None

    seaice_yr_min: int = 1980
    seaice_yr_max: int = 2100
    seaice_anom_baseline_start: int = 1981
    seaice_anom_baseline_end: int = 2010
    seaice_smooth_window: int = 7
    seaice_decadal_smooth: int = 15


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance so we don't reload env files repeatedly."""

    return Settings()
