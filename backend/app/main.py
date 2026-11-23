"""SkySentry API — air quality for Bagmati Province, Nepal."""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .aqi import CATEGORIES, category_dict
from .cities import BAGMATI_BOUNDS, CITIES, CITY_BY_SLUG
from .providers import TTLCache, UpstreamError, fetch_open_meteo, fetch_waqi_stations

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

WAQI_TOKEN = os.getenv("WAQI_TOKEN", "").strip()
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]
FRONTEND_DIST = Path(os.getenv("FRONTEND_DIST", Path(__file__).resolve().parents[2] / "frontend" / "dist"))

cache = TTLCache(ttl_seconds=600)  # upstream data refreshes hourly; 10 min is plenty


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http = httpx.AsyncClient(headers={"User-Agent": "SkySentry/2.0"})
    yield
    await app.state.http.aclose()


app = FastAPI(title="SkySentry API", version="2.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["GET"], allow_headers=["*"])


def _enrich(reading: dict) -> dict:
    return {**reading, "category": category_dict(reading["aqi"])}


async def _all_cities() -> list[dict]:
    async def load():
        readings = await fetch_open_meteo(app.state.http, [(c["lat"], c["lng"]) for c in CITIES])
        return [{**city, **_enrich(r)} for city, r in zip(CITIES, readings)]

    try:
        return await cache.get_or_set("cities", load)
    except UpstreamError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/api/health")
async def health():
    return {"status": "ok", "stations_enabled": bool(WAQI_TOKEN)}


@app.get("/api/scale")
async def scale():
    return [
        {"key": c.key, "label": c.label, "color": c.color, "max": c.max_aqi, "advice": c.advice}
        for c in CATEGORIES
    ]


@app.get("/api/cities")
async def list_cities(include_forecast: bool = False):
    cities = await _all_cities()
    if include_forecast:
        return cities
    return [{k: v for k, v in c.items() if k != "forecast"} for c in cities]


@app.get("/api/cities/{slug}")
async def get_city(slug: str):
    if slug not in CITY_BY_SLUG:
        raise HTTPException(status_code=404, detail=f"Unknown city '{slug}'")
    return next(c for c in await _all_cities() if c["slug"] == slug)


@app.get("/api/aqi")
async def aqi_at_point(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
):
    key = f"pt:{lat:.2f},{lng:.2f}"  # ~1 km grid; upstream model resolution is coarser anyway

    async def load():
        [reading] = await fetch_open_meteo(app.state.http, [(lat, lng)])
        return {"lat": lat, "lng": lng, **_enrich(reading)}

    try:
        return await cache.get_or_set(key, load)
    except UpstreamError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/api/stations")
async def stations():
    """Ground monitoring stations from WAQI (requires WAQI_TOKEN)."""
    if not WAQI_TOKEN:
        return {"enabled": False, "stations": []}

    async def load():
        found = await fetch_waqi_stations(app.state.http, WAQI_TOKEN, BAGMATI_BOUNDS)
        return [{**s, "category": category_dict(s["aqi"])} for s in found]

    try:
        return {"enabled": True, "stations": await cache.get_or_set("stations", load)}
    except UpstreamError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


# Serve the built React app (single-service deploy). Skipped when not built.
if FRONTEND_DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    async def spa(path: str):
        if path.startswith("api/"):
            raise HTTPException(status_code=404)
        file = FRONTEND_DIST / path
        if path and file.is_file() and FRONTEND_DIST in file.resolve().parents:
            return FileResponse(file)
        return FileResponse(FRONTEND_DIST / "index.html")
