from datetime import datetime
from flask import Blueprint, request, jsonify

from backend.app.core.database import get_db_context
from backend.app.models.donor import Donor
from backend.app.services.compatibility_service import (
    get_compatible_candidates,
    validate_blood_group,
    get_compatibility_matrix,
)
from backend.app.services.geospatial_service import find_nearby_donors
from backend.app.services.knn_service import (
    rank_candidates_knn,
    compare_matching_algorithms,
)
from backend.app.services.agent_service import EmergencyCoordinationAgent

matching_bp = Blueprint("matching", __name__, url_prefix="/api/v1/matching")


def _get_live_donor_pool(compatible_groups: list = None) -> list:
    """Fetch live available donors directly from Neon PostgreSQL."""
    try:
        with get_db_context() as session:
            query = session.query(Donor).filter(Donor.availability_status == "AVAILABLE")
            if compatible_groups:
                query = query.filter(Donor.blood_group.in_(compatible_groups))
            
            db_donors = query.all()
            donors = []
            for d in db_donors:
                if d.latitude is not None and d.longitude is not None:
                    donors.append({
                        "donor_id": d.id,
                        "name": d.full_name,
                        "blood_group": d.blood_group,
                        "phone": d.phone,
                        "latitude": float(d.latitude),
                        "longitude": float(d.longitude),
                        "availability": True,
                        "availability_status": d.availability_status,
                        "response_rate": 0.90,
                        "last_active": d.last_active.isoformat() if d.last_active else datetime.utcnow().isoformat(),
                        "location_freshness": "FRESH",
                    })
            return donors
    except Exception as e:
        return []


@matching_bp.post("/rank")
def rank_matching_donors():
    """Ranks available compatible donors from database using multi-factor KNN algorithm."""
    data = request.get_json(silent=True) or {}
    blood_group = data.get("bloodGroup") or data.get("blood_group")
    lat = data.get("latitude")
    lon = data.get("longitude")
    k = int(data.get("k", 5))
    max_distance_km = float(data.get("maxDistanceKm") or data.get("max_distance_km") or 25.0)

    if not blood_group or lat is None or lon is None:
        return jsonify({
            "success": False,
            "error": "bloodGroup, latitude, and longitude are required."
        }), 400

    if not validate_blood_group(blood_group):
        return jsonify({
            "success": False,
            "error": f"Invalid or unsupported blood group: '{blood_group}'."
        }), 400

    compatible_groups = get_compatible_candidates(blood_group)

    # Fetch pool from real PostgreSQL database
    candidate_pool = _get_live_donor_pool(compatible_groups)

    # Geospatial search
    nearby = find_nearby_donors(candidate_pool, float(lat), float(lon), radius_km=max_distance_km)

    # Multi-factor KNN Ranking
    ranked = rank_candidates_knn(nearby, k=k, max_distance_km=max_distance_km) if nearby else []

    return jsonify({
        "success": True,
        "requested_blood_group": blood_group,
        "compatible_groups": compatible_groups,
        "total_compatible_in_pool": len(candidate_pool),
        "total_within_radius": len(nearby),
        "search_radius_km": max_distance_km,
        "data": ranked,
    })


@matching_bp.post("/agent-coordinate")
def trigger_agent_coordinate():
    """Triggers the full Agentic AI coordination workflow with real database donors."""
    data = request.get_json(silent=True) or {}
    blood_group = data.get("bloodGroup") or data.get("blood_group", "O+")
    lat = float(data.get("latitude", 11.0168))
    lon = float(data.get("longitude", 76.9558))
    units = int(data.get("unitsRequired", data.get("units_required", 2)))
    urgency = str(data.get("urgency", "CRITICAL")).upper()
    k = int(data.get("k", 5))
    radius_km = float(data.get("radiusKm", data.get("radius_km", 25.0)))

    compatible_groups = get_compatible_candidates(blood_group)
    donor_pool = _get_live_donor_pool(compatible_groups)

    agent = EmergencyCoordinationAgent()
    result = agent.run_full_coordination(
        blood_group=blood_group,
        hospital_lat=lat,
        hospital_lon=lon,
        donor_pool=donor_pool,
        units_required=units,
        urgency=urgency,
        k=k,
        radius_km=radius_km,
    )

    return jsonify(result)


@matching_bp.get("/compatibility-matrix")
def compatibility_matrix_endpoint():
    """Returns deterministic compatibility matrix for UI rendering."""
    return jsonify({
        "success": True,
        "matrix": get_compatibility_matrix()
    })


@matching_bp.post("/compare-algorithms")
def benchmark_algorithms():
    """Benchmarks Distance-only vs KNN Multi-Factor vs KNN+Geospatial Hybrid using real donor pool."""
    data = request.get_json(silent=True) or {}
    blood_group = data.get("bloodGroup") or data.get("blood_group", "O+")
    lat = float(data.get("latitude", 11.0168))
    lon = float(data.get("longitude", 76.9558))
    k = int(data.get("k", 5))
    radius_km = float(data.get("radiusKm", data.get("radius_km", 25.0)))

    compatible_groups = get_compatible_candidates(blood_group)
    candidate_pool = _get_live_donor_pool(compatible_groups)
    nearby = find_nearby_donors(candidate_pool, lat, lon, radius_km)

    comparison = compare_matching_algorithms(nearby, k=k, radius_km=radius_km) if nearby else []
    return jsonify({
        "success": True,
        "data": comparison
    })
