from typing import List, Dict, Any

from backend.app.services.compatibility_service import get_compatible_candidates
from backend.app.services.geospatial_service import find_nearby_donors


def run_matching(donors: List[Dict[str, Any]], blood_group: str, request_lat: float, request_lon: float, k: int = 5, radius_km: float = 25.0):
    compatible = get_compatible_candidates(blood_group)
    filtered = [donor for donor in donors if donor.get("bloodGroup") in compatible and donor.get("availability") is True]
    nearby = find_nearby_donors(filtered, request_lat, request_lon, radius_km)
    return nearby[:k]
