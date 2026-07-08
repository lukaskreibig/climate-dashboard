import json

from fastapi.testclient import TestClient

import main
from main import app


client = TestClient(app)


def test_get_data_returns_payload():
    resp = client.get("/data")
    assert resp.status_code == 200
    assert resp.headers.get("x-climate-route") == "/data"
    assert resp.headers.get("x-climate-data-source") in {"database", "json-fallback"}
    assert resp.headers.get("x-climate-db-status") in {"ok", "error", "not-configured"}

    payload = resp.json()
    assert "annual" in payload
    assert "dailySeaIce" in payload
    assert "latestSeaIceSeason" in payload
    assert "meta" in payload
    assert isinstance(payload["annual"], list)
    assert payload["meta"]["latestSeaIceYear"] is not None


def test_get_uummannaq_returns_payload_with_meta(tmp_path, monkeypatch):
    fjord_file = tmp_path / "fjord_data.json"
    fjord_file.write_text(
        json.dumps(
            {
                "spring": [],
                "season": [],
                "frac": [],
                "freeze": [],
                "daily": [
                    {"date": "2025-06-01", "year": 2025, "doy": 152, "frac": 0.2}
                ],
                "seasonLossPct": 11.9,
            }
        )
    )
    monkeypatch.setattr(main, "FJORD_DATA_FILE", fjord_file)
    monkeypatch.setattr(main, "_resolved_database_url", lambda: None)

    resp = client.get("/uummannaq")
    assert resp.status_code == 200
    assert resp.headers.get("x-climate-route") == "/uummannaq"
    assert resp.headers.get("x-climate-data-source") in {"database", "json-fallback"}

    payload = resp.json()
    assert "daily" in payload
    assert "meta" in payload
    assert payload["meta"]["latestYear"] is not None


def test_get_uummannaq_uses_csv_fallback_when_json_is_missing(tmp_path, monkeypatch):
    csv_file = tmp_path / "summary_test_cleaned.csv"
    csv_file.write_text(
        "\n".join(
            [
                "date,year,doy,frac,frac_filled,frac_smooth",
                "2017-03-01 00:00:00+00:00,2017,60,0.8,0.8,0.8",
                "2021-03-01 00:00:00+00:00,2021,60,0.5,0.5,0.5",
                "2025-06-01 00:00:00+00:00,2025,152,0.2,0.2,0.2",
            ]
        )
    )
    monkeypatch.setattr(main, "FJORD_DATA_FILE", tmp_path / "missing.json")
    monkeypatch.setattr(main, "FJORD_CSV_CANDIDATES", [csv_file])
    monkeypatch.setattr(main, "_resolved_database_url", lambda: None)

    resp = client.get("/uummannaq")
    assert resp.status_code == 200
    assert resp.headers.get("x-climate-data-source") == "csv-fallback"

    payload = resp.json()
    assert len(payload["daily"]) == 3
    assert len(payload["season"]) == 136
    assert payload["meta"]["latestYear"] == 2025


def test_health_endpoint_handles_missing_db(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert "status" in body
    assert "checks" in body
