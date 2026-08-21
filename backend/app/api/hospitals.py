from datetime import datetime
from uuid import uuid4
from flask import Blueprint, request, jsonify

from backend.app.core.database import get_db_context
from backend.app.models.blood_request import BloodRequest
from backend.app.models.hospital import Hospital
from backend.app.models.audit_log import AuditLog
from backend.app.models.donor_commitment import DonorCommitment
from backend.app.models.donor import Donor
from backend.app.services.acceptance_service import accept_request
from backend.app.services.eligibility_service import check_donor_eligible
from backend.app.data.tamilnadu_locations import TAMILNADU_FACILITIES, TAMILNADU_CITIES

hospitals_bp = Blueprint("hospitals", __name__, url_prefix="/api/v1/hospitals")


@hospitals_bp.get("/search-locations")
def search_locations():
    query = request.args.get("q", "").strip().lower()
    if not query:
        return jsonify({
            "success": True, 
            "total": len(TAMILNADU_FACILITIES[:8]), 
            "data": TAMILNADU_FACILITIES[:8]
        })

    # 1. Identify if user query explicitly specifies any city/district
    detected_city = None
    for city_key, city_meta in TAMILNADU_CITIES.items():
        if city_key in query:
            detected_city = city_meta["name"].lower()
            break

    # 2. Score and rank facilities
    scored_results = []
    for f in TAMILNADU_FACILITIES:
        score = 0
        hosp_name_lower = f["hospital_name"].lower()
        addr_lower = f["address"].lower()
        city_lower = f["city"].lower()
        keywords = f.get("keywords", [])
        area_lower = f.get("area", "").lower()
        pincode = f.get("pincode", "")

        # Exact hospital name match
        if query in hosp_name_lower:
            score += 120
            if hosp_name_lower.startswith(query):
                score += 40

        # Keyword match
        for kw in keywords:
            if kw in query or query in kw:
                score += 35

        # Area & address match
        if area_lower and area_lower in query:
            score += 45
        if query in addr_lower:
            score += 25

        # Pincode match
        if pincode and pincode in query:
            score += 150

        # City match & Mismatch Protection
        if detected_city:
            if city_lower == detected_city or f.get("district", "").lower() == detected_city:
                score += 150
            else:
                score -= 300
        else:
            if city_lower in query:
                score += 50

        if score > 0:
            confidence = "High confidence"
            if score >= 200:
                confidence = "Exact place match"
            elif score >= 100:
                confidence = "High confidence"
            else:
                confidence = "Good match"

            scored_results.append({
                **f,
                "_score": score,
                "confidence_label": confidence,
            })

    scored_results.sort(key=lambda x: x["_score"], reverse=True)

    # 3. Fallback geocoded point if query has 3+ characters and no predefined match
    if not scored_results and len(query) >= 3:
        target_city = "Coimbatore" if detected_city == "coimbatore" else (detected_city.title() if detected_city else "Tamil Nadu")
        coords = TAMILNADU_CITIES.get(detected_city, {"lat": 11.0168 if detected_city == "coimbatore" else 13.0827, "lon": 76.9558 if detected_city == "coimbatore" else 80.2707})

        scored_results = [
            {
                "hospital_name": query.title() if any(w in query for w in ["hospital", "centre", "center", "clinic", "college"]) else f"{query.title()} Facility",
                "address": f"{query.title()}, {target_city}, Tamil Nadu, India",
                "area": query.title(),
                "city": target_city,
                "district": target_city,
                "state": "Tamil Nadu",
                "latitude": coords["lat"] + (hash(query) % 50) * 0.0003,
                "longitude": coords["lon"] + (hash(query + "lon") % 50) * 0.0003,
                "place_id": f"GEO-{uuid4().hex[:6]}",
                "place_type": "address",
                "place_type_label": "📍 Location / Address",
                "accuracy": "approximate",
                "confidence_label": "Approximate location",
            }
        ]

    return jsonify({
        "success": True,
        "total": len(scored_results),
        "data": scored_results[:12],
    })


@hospitals_bp.get("/requests")
def list_hospital_requests():
    """Returns real emergency blood requests stored in Neon PostgreSQL."""
    try:
        with get_db_context() as session:
            db_requests = session.query(BloodRequest).order_by(BloodRequest.created_at.desc()).all()
            results = []
            for r in db_requests:
                # Find hospital name if possible
                hosp = session.query(Hospital).filter(Hospital.id == r.hospital_id).first()
                hospital_name = hosp.hospital_name if hosp else (r.address or "Emergency Facility")

                results.append({
                    "id": r.id,
                    "hospital_name": hospital_name,
                    "blood_group": r.blood_group,
                    "units_required": r.units_required,
                    "urgency": r.emergency_level or "High",
                    "status": r.status or "Matching Donors",
                    "latitude": r.latitude,
                    "longitude": r.longitude,
                    "required_by": r.additional_info or "Immediate",
                    "created_at": r.created_at.isoformat() if r.created_at else datetime.utcnow().isoformat(),
                    "matched_donors_count": r.accepted_units or 0,
                    "address": r.address,
                    "city": r.city,
                    "place_id": r.place_id,
                })
            return jsonify({
                "success": True,
                "total": len(results),
                "data": results,
            })
    except Exception as e:
        return jsonify({
            "success": True,
            "total": 0,
            "data": [],
        })


@hospitals_bp.post("/requests")
def create_emergency_request():
    """Creates and persists an emergency blood request in Neon PostgreSQL."""
    data = request.get_json(silent=True) or {}
    blood_group = data.get("bloodGroup") or data.get("blood_group")
    hospital_name = data.get("hospitalName") or data.get("hospital_name", "City General Hospital")
    address = data.get("address", "Coimbatore, Tamil Nadu")
    city = data.get("city", "Coimbatore")
    units = int(data.get("unitsRequired", data.get("units_required", 1)))
    urgency = data.get("urgency", "High")
    
    try:
        lat = float(data.get("latitude", 11.0168))
        lon = float(data.get("longitude", 76.9558))
    except (ValueError, TypeError):
        return jsonify({"success": False, "error": "Invalid coordinates provided."}), 400

    if not blood_group:
        return jsonify({"success": False, "error": "bloodGroup is required."}), 400

    req_id = f"REQ-{uuid4().hex[:6].upper()}"

    with get_db_context() as session:
        # Find or create hospital
        hosp = session.query(Hospital).filter(Hospital.hospital_name == hospital_name).first()
        if not hosp:
            hosp = Hospital(
                id=str(uuid4()),
                user_id=str(uuid4()),
                hospital_name=hospital_name,
                city=city,
                latitude=lat,
                longitude=lon,
                verification_status="verified",
                is_active=True,
            )
            session.add(hosp)
            session.flush()

        new_db_req = BloodRequest(
            id=req_id,
            hospital_id=hosp.id,
            blood_group=blood_group,
            units_required=units,
            emergency_level=urgency,
            status="Matching Donors",
            latitude=lat,
            longitude=lon,
            address=address,
            city=city,
            place_id=data.get("placeId") or data.get("place_id", f"PLC-{uuid4().hex[:6]}"),
            location_source=data.get("locationSource") or "google_places",
            location_accuracy=data.get("locationAccuracy") or "good",
            additional_info=data.get("requiredBy") or data.get("required_by", "Within 1 hour"),
            created_at=datetime.utcnow(),
            remaining_units=units,
        )
        session.add(new_db_req)

        # Audit log
        audit = AuditLog(
            id=f"LOG-{uuid4().hex[:6].upper()}",
            user_id=hosp.id,
            action="CREATE_EMERGENCY_REQUEST",
            entity="BloodRequest",
            entity_id=req_id,
            details=f"Hospital '{hospital_name}' created emergency request for {units} units of {blood_group} blood ({urgency} priority).",
            created_at=datetime.utcnow(),
        )
        session.add(audit)
        session.commit()

        response_data = {
            "id": req_id,
            "hospital_name": hospital_name,
            "blood_group": blood_group,
            "units_required": units,
            "urgency": urgency,
            "status": "Matching Donors",
            "latitude": lat,
            "longitude": lon,
            "required_by": new_db_req.additional_info,
            "created_at": new_db_req.created_at.isoformat(),
            "matched_donors_count": 0,
            "address": address,
            "city": city,
        }

        return jsonify({
            "success": True,
            "message": f"Emergency request {req_id} committed to database.",
            "data": response_data,
        }), 201


@hospitals_bp.get("/requests/<req_id>")
def get_request_details(req_id: str):
    """Retrieve single emergency request from database."""
    with get_db_context() as session:
        r = session.query(BloodRequest).filter(BloodRequest.id == req_id).first()
        if not r:
            return jsonify({"success": False, "error": "Emergency request not found."}), 404
        
        hosp = session.query(Hospital).filter(Hospital.id == r.hospital_id).first()
        hospital_name = hosp.hospital_name if hosp else (r.address or "Emergency Facility")

        return jsonify({
            "success": True,
            "data": {
                "id": r.id,
                "hospital_name": hospital_name,
                "blood_group": r.blood_group,
                "units_required": r.units_required,
                "urgency": r.emergency_level or "High",
                "status": r.status or "Matching Donors",
                "latitude": r.latitude,
                "longitude": r.longitude,
                "required_by": r.additional_info or "Immediate",
                "created_at": r.created_at.isoformat() if r.created_at else datetime.utcnow().isoformat(),
                "matched_donors_count": r.accepted_units or 0,
                "address": r.address,
                "city": r.city,
            }
        })


@hospitals_bp.patch("/requests/<req_id>/status")
def update_request_status(req_id: str):
    """Update emergency request status in PostgreSQL."""
    data = request.get_json(silent=True) or {}
    new_status = data.get("status", "RESOLVED")

    with get_db_context() as session:
        r = session.query(BloodRequest).filter(BloodRequest.id == req_id).first()
        if not r:
            return jsonify({"success": False, "error": "Request not found."}), 404

        r.status = new_status
        session.commit()

        return jsonify({
            "success": True,
            "message": f"Status updated to {new_status}",
            "data": {"id": r.id, "status": new_status},
        })
