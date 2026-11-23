"""AQI categories, colours and health guidance (US EPA scale)."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Category:
    key: str
    label: str
    color: str
    max_aqi: int
    advice: str


CATEGORIES: tuple[Category, ...] = (
    Category("good", "Good", "#10b981", 50,
             "Air quality is good. Enjoy your outdoor activities."),
    Category("moderate", "Moderate", "#eab308", 100,
             "Acceptable. Unusually sensitive people should limit prolonged outdoor exertion."),
    Category("usg", "Unhealthy for Sensitive Groups", "#f97316", 150,
             "Children, older adults and people with heart or lung disease should reduce outdoor exertion."),
    Category("unhealthy", "Unhealthy", "#ef4444", 200,
             "Everyone should limit prolonged outdoor exertion. Consider an N95 mask outdoors."),
    Category("very_unhealthy", "Very Unhealthy", "#a855f7", 300,
             "Avoid outdoor activity. Keep windows closed and run an air purifier if you have one."),
    Category("hazardous", "Hazardous", "#7f1d1d", 10_000,
             "Health emergency. Stay indoors with filtered air and avoid all physical activity outside."),
)

UNKNOWN = Category("unknown", "No data", "#64748b", -1, "No recent reading is available for this location.")


def categorize(aqi: float | int | None) -> Category:
    if aqi is None:
        return UNKNOWN
    for cat in CATEGORIES:
        if aqi <= cat.max_aqi:
            return cat
    return CATEGORIES[-1]


def category_dict(aqi: float | int | None) -> dict:
    cat = categorize(aqi)
    return {"key": cat.key, "label": cat.label, "color": cat.color, "advice": cat.advice}
