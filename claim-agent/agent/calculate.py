import csv
from functools import lru_cache
from math import radians, sin, cos, asin, sqrt
from pathlib import Path

AIRPORTS = Path(__file__).resolve().parent.parent / "data" / "airports.csv"
EARTH_KM = 6371.0

EU_COUNTRIES = {
    "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czech Republic",
    "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary",
    "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta",
    "Netherlands", "Poland", "Portugal", "Romania", "Slovakia", "Slovenia",
    "Spain", "Sweden","Iceland", "Norway", "Switzerland"
}


@lru_cache(maxsize=1)
def _coords() -> dict[str, tuple[float, float]]:
    out = {}
    with AIRPORTS.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            out[row["iata"]] = (float(row["lat"]), float(row["lon"]))
    return out


@lru_cache(maxsize=1)
def _countries() -> dict[str, str]:
    out = {}
    with AIRPORTS.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            out[row["iata"]] = row["country"]
    return out


def great_circle_km(a: str, b: str) -> float:
    coords = _coords()
    a, b = a.upper(), b.upper()
    if a not in coords:
        raise KeyError(f"unknown airport: {a}")
    if b not in coords:
        raise KeyError(f"unknown airport: {b}")
    (la1, lo1), (la2, lo2) = coords[a], coords[b]
    la1, lo1, la2, lo2 = map(radians, (la1, lo1, la2, lo2))
    h = sin((la2 - la1) / 2) ** 2 + cos(la1) * cos(la2) * sin((lo2 - lo1) / 2) ** 2
    return 2 * EARTH_KM * asin(sqrt(h))


def intra_eu(a: str, b: str) -> bool:
    countries = _countries()
    a, b = a.upper(), b.upper()
    if a not in countries:
        raise KeyError(f"unknown airport: {a}")
    if b not in countries:
        raise KeyError(f"unknown airport: {b}")
    return countries[a] in EU_COUNTRIES and countries[b] in EU_COUNTRIES


def band_for(distance_km: float, is_intra_eu: bool = False) -> int:
    """Article 7(1)."""
    if distance_km <= 1500:
        return 250                          # (a)
    if distance_km <= 3500:
        return 400                          # (b), second limb
    return 400 if is_intra_eu else 600      # (b) first limb vs (c)


def reduction_applies(band: int, reroute_arrive_late_hours: float) -> bool:
    """Article 7(2)."""
    window = {250: 2.0, 400: 3.0, 600: 4.0}[band]
    return reroute_arrive_late_hours <= window


def amount_for(origin: str, destination: str,
               reroute_arrive_late_hours: float | None = None) -> int:
    distance_km = great_circle_km(origin, destination)
    band = band_for(distance_km, intra_eu(origin, destination))
    if reroute_arrive_late_hours is not None and reduction_applies(band, reroute_arrive_late_hours):
        return band // 2
    return band


if __name__ == "__main__":
    d = great_circle_km("BOS", "FRA")
    print(f"BOS-FRA {d:.0f} km, intra_eu={intra_eu('BOS', 'FRA')}")
    print(f"  rerouted +3h -> EUR {amount_for('BOS', 'FRA', reroute_arrive_late_hours=3.0)}")
    print(f"  rerouted +5h -> EUR {amount_for('BOS', 'FRA', reroute_arrive_late_hours=5.0)}")

    d2 = great_circle_km("CGN", "FRA")
    print(f"\nCGN-FRA {d2:.0f} km, intra_eu={intra_eu('CGN', 'FRA')}")
    print(f"  no reroute -> EUR {amount_for('CGN', 'FRA')}")