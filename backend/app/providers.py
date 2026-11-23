"""Upstream data providers: Open-Meteo (modelled AQI) and WAQI (ground sensors)."""

from __future__ import annotations

import asyncio
import time
from typing import Any, Awaitable, Callable

import httpx

OPEN_METEO_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
WAQI_BOUNDS_URL = "https://api.waqi.info/v2/map/bounds"

CURRENT_FIELDS = [
    "us_aqi", "pm2_5", "pm10", "nitrogen_dioxide", "ozone",
    "carbon_monoxide", "sulphur_dioxide", "dust",
]
POLLUTANT_KEYS = {
    "pm2_5": "PM2.5", "pm10": "PM10", "nitrogen_dioxide": "NO₂", "ozone": "O₃",
    "carbon_monoxide": "CO", "sulphur_dioxide": "SO₂", "dust": "Dust",
}


class UpstreamError(RuntimeError):
    pass


class TTLCache:
    """Tiny async-safe TTL cache so we don't hammer the free upstream APIs."""

    def __init__(self, ttl_seconds: float):
        self.ttl = ttl_seconds
        self._data: dict[str, tuple[float, Any]] = {}
        self._locks: dict[str, asyncio.Lock] = {}

    async def get_or_set(self, key: str, factory: Callable[[], Awaitable[Any]]) -> Any:
        hit = self._data.get(key)
        if hit and time.monotonic() - hit[0] < self.ttl:
            return hit[1]
        lock = self._locks.setdefault(key, asyncio.Lock())
        async with lock:
            hit = self._data.get(key)
            if hit and time.monotonic() - hit[0] < self.ttl:
                return hit[1]
            value = await factory()
            self._data[key] = (time.monotonic(), value)
            return value

    def clear(self) -> None:
        self._data.clear()


def _parse_location(raw: dict) -> dict:
    cur = raw.get("current") or {}
    units = raw.get("current_units") or {}
    pollutants = [
        {"key": k, "label": label, "value": cur.get(k), "unit": units.get(k, "μg/m³")}
        for k, label in POLLUTANT_KEYS.items()
        if cur.get(k) is not None
    ]
    hourly = raw.get("hourly") or {}
    forecast = [
        {"time": t, "aqi": a}
        for t, a in zip(hourly.get("time", []), hourly.get("us_aqi", []))
        if a is not None
    ]
    aqi = cur.get("us_aqi")
    return {
        "aqi": round(aqi) if aqi is not None else None,
        "updated": cur.get("time"),
        "pollutants": pollutants,
        "forecast": forecast,
    }


async def fetch_open_meteo(client: httpx.AsyncClient, points: list[tuple[float, float]]) -> list[dict]:
    """Fetch current AQI + 48h hourly forecast for one or many points in a single request."""
    params = {
        "latitude": ",".join(f"{lat:.4f}" for lat, _ in points),
        "longitude": ",".join(f"{lng:.4f}" for _, lng in points),
        "current": ",".join(CURRENT_FIELDS),
        "hourly": "us_aqi",
        "past_days": 1,
        "forecast_days": 2,
        "timezone": "Asia/Kathmandu",
    }
    try:
        resp = await client.get(OPEN_METEO_URL, params=params, timeout=15)
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        raise UpstreamError(f"Open-Meteo request failed: {exc}") from exc
    body = resp.json()
    raw_list = body if isinstance(body, list) else [body]
    return [_parse_location(r) for r in raw_list]


async def fetch_waqi_stations(client: httpx.AsyncClient, token: str, bounds: tuple[float, float, float, float]) -> list[dict]:
    params = {"latlng": ",".join(str(b) for b in bounds), "networks": "all", "token": token}
    try:
        resp = await client.get(WAQI_BOUNDS_URL, params=params, timeout=15)
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        raise UpstreamError(f"WAQI request failed: {exc}") from exc
    body = resp.json()
    if body.get("status") != "ok":
        raise UpstreamError(f"WAQI error: {body.get('data')}")
    stations = []
    for s in body.get("data", []):
        try:
            aqi = int(s["aqi"])
        except (KeyError, TypeError, ValueError):
            continue  # WAQI uses "-" for stations without a reading
        stations.append({
            "uid": s.get("uid"),
            "name": (s.get("station") or {}).get("name", "Unknown station"),
            "lat": s["lat"],
            "lng": s["lon"],
            "aqi": aqi,
            "updated": (s.get("station") or {}).get("time"),
        })
    return stations
