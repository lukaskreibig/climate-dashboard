from settings import Settings


def test_settings_defaults():
    settings = Settings()

    assert settings.database_url is None
    assert settings.openai_api_key is None
    assert settings.seaice_yr_min == 1980
    assert settings.seaice_yr_max == 2100
    assert settings.seaice_smooth_window > 0
    assert settings.seaice_decadal_smooth > 0


def test_settings_env_override(monkeypatch):
    monkeypatch.setenv("SEAICE_YR_MIN", "1995")
    monkeypatch.setenv("SEAICE_YR_MAX", "2050")
    monkeypatch.setenv("SEAICE_SMOOTH_WINDOW", "9")

    settings = Settings()

    assert settings.seaice_yr_min == 1995
    assert settings.seaice_yr_max == 2050
    assert settings.seaice_smooth_window == 9
