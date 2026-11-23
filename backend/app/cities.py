"""Monitored cities in Bagmati Province, Nepal."""

CITIES: list[dict] = [
    {"slug": "kathmandu", "name": "Kathmandu", "lat": 27.7172, "lng": 85.3240},
    {"slug": "lalitpur", "name": "Lalitpur", "lat": 27.6644, "lng": 85.3188},
    {"slug": "bhaktapur", "name": "Bhaktapur", "lat": 27.6710, "lng": 85.4298},
    {"slug": "kirtipur", "name": "Kirtipur", "lat": 27.6787, "lng": 85.2775},
    {"slug": "banepa", "name": "Banepa", "lat": 27.6298, "lng": 85.5214},
    {"slug": "dhulikhel", "name": "Dhulikhel", "lat": 27.6253, "lng": 85.5561},
    {"slug": "bidur", "name": "Bidur", "lat": 27.9135, "lng": 85.1542},
    {"slug": "hetauda", "name": "Hetauda", "lat": 27.4277, "lng": 85.0312},
    {"slug": "bharatpur", "name": "Bharatpur", "lat": 27.6833, "lng": 84.4333},
    {"slug": "dhunche", "name": "Dhunche", "lat": 28.1100, "lng": 85.2970},
    {"slug": "charikot", "name": "Charikot", "lat": 27.6680, "lng": 86.0480},
    {"slug": "sindhuli", "name": "Sindhuli", "lat": 27.2560, "lng": 85.9690},
]

CITY_BY_SLUG = {c["slug"]: c for c in CITIES}

# Rough bounding box of Bagmati Province (south, west, north, east)
BAGMATI_BOUNDS = (27.1, 84.2, 28.4, 86.4)
