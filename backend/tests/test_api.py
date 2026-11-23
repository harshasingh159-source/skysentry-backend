import pytest
from fastapi.testclient import TestClient

from app import main
from app.aqi import categorize
from app.cities import CITIES
from app.providers import UpstreamError


def fake_reading(aqi):
    return {
        "aqi": aqi,
        "updated": "2026-01-01T10:00",
        "pollutants": [{"key": "pm2_5", "label": "PM2.5", "value": 12.3, "unit": "μg/m³"}],
        "forecast": [{"time": "2026-01-01T11:00", "aqi": aqi}],
    }


@pytest.fixture
def client(monkeypatch):
    main.cache.clear()

    async def fake_fetch(_client, points):
        return [fake_reading(40 + i * 30) for i, _ in enumerate(points)]

    monkeypatch.setattr(main, "fetch_open_meteo", fake_fetch)
    with TestClient(main.app) as c:
        yield c
    main.cache.clear()


@pytest.mark.parametrize("aqi,key", [
    (None, "unknown"), (0, "good"), (50, "good"), (51, "moderate"), (150, "usg"),
    (151, "unhealthy"), (250, "very_unhealthy"), (450, "hazardous"),
])
def test_categorize(aqi, key):
    assert categorize(aqi).key == key


def test_health(client):
    assert client.get("/api/health").json()["status"] == "ok"


def test_cities(client):
    data = client.get("/api/cities").json()
    assert len(data) == len(CITIES)
    assert data[0]["slug"] == "kathmandu"
    assert data[0]["category"]["key"] == "good"
    assert "forecast" not in data[0]
    assert "forecast" in client.get("/api/cities?include_forecast=true").json()[0]


def test_city_detail_and_404(client):
    assert client.get("/api/cities/lalitpur").json()["aqi"] == 70
    assert client.get("/api/cities/atlantis").status_code == 404


def test_point(client):
    body = client.get("/api/aqi", params={"lat": 27.7, "lng": 85.3}).json()
    assert body["aqi"] == 40 and body["category"]["label"] == "Good"
    assert client.get("/api/aqi", params={"lat": 999, "lng": 85}).status_code == 422


def test_upstream_failure_returns_502(client, monkeypatch):
    async def broken(*_):
        raise UpstreamError("down")

    main.cache.clear()
    monkeypatch.setattr(main, "fetch_open_meteo", broken)
    assert client.get("/api/cities").status_code == 502


def test_stations_disabled_without_token(client, monkeypatch):
    monkeypatch.setattr(main, "WAQI_TOKEN", "")
    assert client.get("/api/stations").json() == {"enabled": False, "stations": []}
