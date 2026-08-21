import math
from typing import List, Dict, Any, Optional

EARTH_RADIUS_KM = 6371.0
RADIUS_TIERS = [5.0, 10.0, 20.0, 50.0]


def calculate_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points on the Earth using Haversine formula."""
    try:
        lat1_rad = math.radians(float(lat1))
        lon1_rad = math.radians(float(lon1))
        lat2_rad = math.radians(float(lat2))
        lon2_rad = math.radians(float(lon2))

        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad

        a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return round(EARTH_RADIUS_KM * c, 2)
    except (ValueError, TypeError):
        return float("inf")


def get_bounding_box(lat: float, lon: float, radius_km: float) -> Dict[str, float]:
    """Calculates min/max latitude and longitude for fast spatial indexing."""
    lat_delta = radius_km / 111.0  # Approx 1 deg latitude = 111 km
    lon_delta = radius_km / (111.0 * math.cos(math.radians(lat)))
    return {
        "min_lat": lat - lat_delta,
        "max_lat": lat + lat_delta,
        "min_lon": lon - lon_delta,
        "max_lon": lon + lon_delta,
    }


def find_nearby_donors(
    donors: List[Dict[str, Any]],
    center_lat: float,
    center_lon: float,
    radius_km: float = 25.0
) -> List[Dict[str, Any]]:
    """Filters donors within the specified radius and annotates them with precise distance in km."""
    results = []
    for donor in donors:
        lat = donor.get("latitude")
        lon = donor.get("longitude")
        if lat is None or lon is None:
            continue

        distance = calculate_distance_km(center_lat, center_lon, lat, lon)
        if distance <= radius_km:
            donor_copy = dict(donor)
            donor_copy["distance_km"] = distance
            results.append(donor_copy)

    return sorted(results, key=lambda d: d["distance_km"])


def get_next_expansion_radius(current_radius: float) -> float:
    """Returns next tiered search radius for progressive expansion."""
    for tier in RADIUS_TIERS:
        if tier > current_radius:
            return tier
    return current_radius + 20.0
