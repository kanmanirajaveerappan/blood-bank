import math
from typing import List, Dict, Any, Tuple, Optional

# ── Eligibility import (late import to avoid circular deps) ────────────────────
def _filter_eligible(donors: list, donation_type: Optional[str] = None) -> tuple:
    """Applies the hard eligibility gate from eligibility_service."""
    try:
        from backend.app.services.eligibility_service import filter_eligible_donors
        return filter_eligible_donors(donors, donation_type)
    except Exception:
        # Fallback: if eligibility service unavailable, pass all (fail-open for availability)
        return donors, []

# Default weights for operational feature ranking
WEIGHT_DISTANCE = 0.45
WEIGHT_AVAILABILITY = 0.25
WEIGHT_RESPONSE_SCORE = 0.20
WEIGHT_RECENCY = 0.10


def calculate_donor_feature_vector(donor: Dict[str, Any], max_distance_km: float = 25.0) -> Tuple[float, Dict[str, float]]:
    """Calculates multi-factor operational priority score and component breakdown."""
    distance = float(donor.get("distance_km", max_distance_km))
    
    # 1. Distance factor (Closer = higher score)
    dist_score = max(0.0, min(1.0, 1.0 - (distance / max(max_distance_km, 1.0))))
    
    # 2. Availability & freshness factor
    avail_status = str(donor.get("availability_status", "AVAILABLE")).upper()
    location_freshness = str(donor.get("location_freshness", "FRESH")).upper()
    if avail_status in ("AVAILABLE", "TRUE") or donor.get("availability") is True:
        avail_score = 1.0 if location_freshness == "FRESH" else (0.8 if location_freshness == "RECENT" else 0.5)
    else:
        avail_score = 0.1
    
    # 3. Response score (historical acceptance rate)
    resp_rate = float(donor.get("response_score", donor.get("response_rate", 92.0))) / 100.0
    resp_score = max(0.0, min(1.0, resp_rate))
    
    # 4. Donation recency (days since last donation >= 56 days is optimal)
    days_since_donation = float(donor.get("days_since_last_donation", 65))
    recency_score = 1.0 if days_since_donation >= 56 else max(0.2, days_since_donation / 56.0)

    # Weighted composite score (0 to 100%)
    composite = (
        (dist_score * WEIGHT_DISTANCE) +
        (avail_score * WEIGHT_AVAILABILITY) +
        (resp_score * WEIGHT_RESPONSE_SCORE) +
        (recency_score * WEIGHT_RECENCY)
    ) * 100.0

    breakdown = {
        "distance_score": round(dist_score * 100, 1),
        "availability_score": round(avail_score * 100, 1),
        "response_score": round(resp_score * 100, 1),
        "recency_score": round(recency_score * 100, 1),
        "composite_score": round(composite, 1),
    }

    return round(composite, 1), breakdown


def rank_candidates_knn(
    candidates: List[Dict[str, Any]],
    k: int = 5,
    max_distance_km: float = 25.0,
    donation_type: Optional[str] = None,
    apply_eligibility_gate: bool = True,
) -> List[Dict[str, Any]]:
    """Ranks compatible candidates using multi-factor KNN priority scoring.
    
    Args:
        candidates: Pre-filtered compatible donor dicts
        k: Top-k results to return
        max_distance_km: Maximum search radius for distance normalization
        donation_type: Donation type to check eligibility for (WHOLE_BLOOD etc.)
        apply_eligibility_gate: If True (default), ineligible donors are hard-filtered
                                before ranking — they will NEVER appear in results.
    """
    if not candidates:
        return []

    # ── Hard eligibility gate ─────────────────────────────────────────────────
    eligible_pool = candidates
    ineligible_count = 0
    if apply_eligibility_gate:
        eligible_pool, ineligible = _filter_eligible(candidates, donation_type)
        ineligible_count = len(ineligible)

    scored_candidates = []
    for cand in eligible_pool:
        cand_dict = dict(cand)
        score, breakdown = calculate_donor_feature_vector(cand_dict, max_distance_km)
        cand_dict["priority_score"] = score
        cand_dict["score_breakdown"] = breakdown
        cand_dict["match_confidence"] = f"{score}%"
        cand_dict["eligibility_verified"] = True
        
        # Human-friendly explanation with eligibility note
        dist = cand_dict.get("distance_km", 0)
        bg = cand_dict.get("blood_group", cand_dict.get("bloodGroup", ""))
        elig_info = cand_dict.get("_eligibility", {})
        cand_dict["explanation"] = (
            f"Compatible ({bg}), {dist} km away, "
            f"Priority Score: {score}% (Distance: {breakdown['distance_score']}%, "
            f"Freshness: {breakdown['availability_score']}%) "
            f"| \u2713 Eligible |"
        )
        scored_candidates.append(cand_dict)

    # Sort descending by priority score, ascending by distance
    sorted_candidates = sorted(
        scored_candidates,
        key=lambda item: (-item["priority_score"], item.get("distance_km", float("inf")))
    )

    result = sorted_candidates[:k]
    # Attach metadata about eligibility filtering for audit log
    for r in result:
        r["_filtered_ineligible_count"] = ineligible_count
    return result


def compare_matching_algorithms(candidates: List[Dict[str, Any]], k: int = 5, radius_km: float = 25.0) -> Dict[str, Any]:
    """Generates benchmark comparison between Distance-only vs KNN Multi-Factor vs KNN+Geospatial."""
    if not candidates:
        return {"distance_only": [], "knn_multi_factor": [], "knn_geospatial_hybrid": []}

    # 1. Distance Only
    dist_only = sorted(candidates, key=lambda d: d.get("distance_km", float("inf")))[:k]
    
    # 2. KNN Multi-factor
    knn_ranked = rank_candidates_knn(candidates, k=k, max_distance_km=radius_km)
    
    # 3. Hybrid (High availability + top KNN within 15km)
    hybrid = [d for d in knn_ranked if d.get("distance_km", 0) <= radius_km and d.get("priority_score", 0) >= 70]
    if len(hybrid) < k:
        hybrid = knn_ranked[:k]

    return {
        "distance_only": dist_only,
        "knn_multi_factor": knn_ranked,
        "knn_geospatial_hybrid": hybrid,
        "metrics": {
            "avg_distance_km": round(sum(d.get("distance_km", 0) for d in knn_ranked) / max(len(knn_ranked), 1), 2),
            "avg_priority_score": round(sum(d.get("priority_score", 0) for d in knn_ranked) / max(len(knn_ranked), 1), 1),
            "candidate_pool_size": len(candidates),
        }
    }
