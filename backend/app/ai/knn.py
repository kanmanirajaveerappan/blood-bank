from typing import List, Dict, Any


def rank_candidates(candidates: List[Dict[str, Any]], k: int = 5):
    ranked = sorted(
        candidates,
        key=lambda donor: (
            donor.get("distance_km", float("inf")),
            0 if donor.get("availability") else 1,
        ),
    )
    return ranked[:k]
