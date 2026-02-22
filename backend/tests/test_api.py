from fastapi.testclient import TestClient

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
    assert isinstance(payload["annual"], list)


def test_health_endpoint_handles_missing_db(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert "status" in body
    assert "checks" in body
