# SkySentry

Live air-quality monitoring for **Bagmati Province, Nepal** — an interactive map, a province dashboard and
a 36-hour AQI forecast for 12 cities, plus an on-demand reading for any point you click.

- **City readings & forecast:** CAMS atmospheric model via [Open-Meteo](https://open-meteo.com/en/docs/air-quality-api) (free, no API key).
- **Ground sensors (optional):** real stations from [WAQI / aqicn.org](https://aqicn.org) when `WAQI_TOKEN` is set.
- **AQI scale:** US EPA, with health guidance per category.

## Stack

| Part | Tech |
| --- | --- |
| Backend | FastAPI, httpx (async), in-memory TTL cache |
| Frontend | React 19, Vite, Tailwind CSS v4, React-Leaflet |
| Deploy | Single service: FastAPI serves the built frontend (`render.yaml`) |

## Run locally

Requires Python 3.11+ and Node 20+.

```bash
# 1. Backend
cd backend
python -m venv .venv
.venv/Scripts/activate        # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env          # optional: add your WAQI_TOKEN
uvicorn app.main:app --reload --port 8000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173 (proxies /api to :8000)
```

Or build once and let FastAPI serve everything on http://localhost:8000:

```bash
cd frontend && npm run build
```

## Tests

```bash
cd backend && pytest
```

## API

| Endpoint | Description |
| --- | --- |
| `GET /api/health` | Status and whether the sensor layer is enabled |
| `GET /api/cities?include_forecast=true` | All cities: AQI, category, pollutants (+ hourly forecast) |
| `GET /api/cities/{slug}` | One city with forecast |
| `GET /api/aqi?lat=27.7&lng=85.3` | Reading for any coordinate |
| `GET /api/stations` | WAQI ground stations inside Bagmati Province |
| `GET /api/scale` | AQI categories, colours and advice |

Interactive docs at `/docs`.

## Deploy (Render)

Push to GitHub, create a **Blueprint** on Render from this repo (it reads `render.yaml`), and optionally set
`WAQI_TOKEN` in the service's environment.
