"""Eligibility API Blueprint — donor eligibility status, donation history, and donation rules.

Endpoints:
  GET  /api/v1/eligibility/rules                       → list all donation rules
  PATCH /api/v1/eligibility/rules/<type>              → admin: update waiting period
  GET  /api/v1/eligibility/donors/<donor_id>/status   → get eligibility status for a donor
  POST /api/v1/eligibility/donors/<donor_id>/donation → record a new donation (creates history)
  GET  /api/v1/eligibility/donors/<donor_id>/history  → get donation history list
"""
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from flask import Blueprint, request, jsonify

from backend.app.core.database import get_db_context
from backend.app.models.donor import Donor
from backend.app.services.eligibility_service import (
    get_donation_rules,
    update_rule_in_cache,
    invalidate_rules_cache,
    calculate_eligibility,
    build_eligibility_response,
)

eligibility_bp = Blueprint("eligibility", __name__, url_prefix="/api/v1/eligibility")

# ── Dynamic donation history store ─────────────────────────────────────────────
_donation_history: list = []


# ── DONATION RULES ───────────────────────────────────────────────────────────────

@eligibility_bp.get("/rules")
def get_rules():
    """Returns all configurable donation waiting period rules."""
    rules = get_donation_rules()
    return jsonify({
        "success": True,
        "disclaimer": (
            "Waiting periods shown are operational workflow defaults for this platform. "
            "Final eligibility is determined by clinical screening at the blood bank/hospital."
        ),
        "data": [
            {
                "donation_type": dtype,
                "label": meta["label"],
                "waiting_period_days": meta["waiting_period_days"],
                "waiting_weeks": round(meta["waiting_period_days"] / 7, 1),
            }
            for dtype, meta in rules.items()
        ],
    })


@eligibility_bp.patch("/rules/<donation_type>")
def update_rule(donation_type: str):
    """Admin: updates the waiting period for a donation type."""
    data = request.get_json(silent=True) or {}
    donation_type_upper = donation_type.upper()

    rules = get_donation_rules()
    if donation_type_upper not in rules:
        return jsonify({
            "success": False,
            "error": f"Unknown donation type '{donation_type_upper}'. "
                     f"Valid types: {list(rules.keys())}",
        }), 400

    new_days = data.get("waiting_period_days")
    if new_days is None or not isinstance(new_days, int) or new_days < 1 or new_days > 365:
        return jsonify({
            "success": False,
            "error": "waiting_period_days must be an integer between 1 and 365.",
        }), 400

    updated_by = data.get("updated_by", "admin")
    update_rule_in_cache(donation_type_upper, new_days)

    return jsonify({
        "success": True,
        "message": f"Donation rule for {donation_type_upper} updated to {new_days} days.",
        "donation_type": donation_type_upper,
        "waiting_period_days": new_days,
        "updated_by": updated_by,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })


# ── DONOR ELIGIBILITY STATUS ─────────────────────────────────────────────────────

@eligibility_bp.get("/donors/<donor_id>/status")
def get_donor_eligibility(donor_id: str):
    """Returns full eligibility status for a donor."""
    with get_db_context() as session:
        donor_db = session.query(Donor).filter((Donor.id == donor_id) | (Donor.user_id == donor_id)).first()
        if donor_db:
            donor = {
                "id": donor_db.id,
                "blood_group": donor_db.blood_group,
                "last_donation_date": donor_db.last_donation_date.isoformat() if donor_db.last_donation_date else None,
                "last_donation_type": "WHOLE_BLOOD",
                "total_donations": 0,
            }
        else:
            last_donation_date = request.args.get("last_donation_date")
            last_donation_type = request.args.get("last_donation_type", "WHOLE_BLOOD").upper()
            donor = {
                "id": donor_id,
                "blood_group": request.args.get("blood_group", "O+"),
                "last_donation_date": last_donation_date,
                "last_donation_type": last_donation_type,
                "total_donations": 0,
            }

    response = build_eligibility_response(donor)
    return jsonify({"success": True, "data": response})


# ── DONATION HISTORY ─────────────────────────────────────────────────────────────

@eligibility_bp.post("/donors/<donor_id>/donation")
def record_donation(donor_id: str):
    """Records a new donation for a donor. Updates their eligibility status."""
    data = request.get_json(silent=True) or {}

    donation_type = str(data.get("donation_type", "WHOLE_BLOOD")).upper()
    rules = get_donation_rules()

    if donation_type not in rules:
        return jsonify({
            "success": False,
            "error": f"Invalid donation type '{donation_type}'. Valid: {list(rules.keys())}",
        }), 400

    raw_date = data.get("donation_date")
    if raw_date:
        try:
            donation_date = datetime.fromisoformat(raw_date.replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError:
            return jsonify({"success": False, "error": "Invalid donation_date format. Use ISO 8601."}), 400
    else:
        donation_date = datetime.now(timezone.utc).replace(tzinfo=None)

    waiting_days = rules[donation_type]["waiting_period_days"]
    next_eligible = donation_date + timedelta(days=waiting_days)

    donation_id = f"DON-{uuid4().hex[:8].upper()}"
    history_entry = {
        "id": donation_id,
        "donor_id": donor_id,
        "donation_type": donation_type,
        "donation_type_label": rules[donation_type]["label"],
        "donation_date": donation_date.isoformat(),
        "donation_date_display": donation_date.strftime("%d-%b-%Y"),
        "blood_group": data.get("blood_group", ""),
        "hospital_name": data.get("hospital_name", ""),
        "location": data.get("location", ""),
        "city": data.get("city", ""),
        "waiting_period_days": waiting_days,
        "next_eligible_date": next_eligible.isoformat(),
        "next_eligible_date_display": next_eligible.strftime("%d-%b-%Y"),
        "status": "VERIFIED",
        "verified_by": data.get("verified_by", "LifeLink Admin"),
        "notes": data.get("notes", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _donation_history.append(history_entry)

    with get_db_context() as session:
        donor_db = session.query(Donor).filter((Donor.id == donor_id) | (Donor.user_id == donor_id)).first()
        if donor_db:
            donor_db.last_donation_date = donation_date
            session.commit()
            donor = {
                "id": donor_db.id,
                "blood_group": donor_db.blood_group,
                "last_donation_date": donation_date.isoformat(),
                "last_donation_type": donation_type,
            }
        else:
            donor = {
                "id": donor_id,
                "blood_group": data.get("blood_group", "O+"),
                "last_donation_date": donation_date.isoformat(),
                "last_donation_type": donation_type,
            }

    # Recalculate eligibility
    elig = calculate_eligibility(donor, donation_type)

    return jsonify({
        "success": True,
        "message": f"Donation recorded. Next eligible date: {next_eligible.strftime('%d-%b-%Y')}.",
        "data": history_entry,
        "eligibility": elig,
    }), 201


@eligibility_bp.get("/donors/<donor_id>/history")
def get_donation_history(donor_id: str):
    """Returns donation history for a donor."""
    donor_history = [h for h in _donation_history if h["donor_id"] == donor_id]
    donor_history.sort(key=lambda x: x["donation_date"], reverse=True)

    with get_db_context() as session:
        donor_db = session.query(Donor).filter((Donor.id == donor_id) | (Donor.user_id == donor_id)).first()
        if donor_db:
            donor = {
                "id": donor_db.id,
                "blood_group": donor_db.blood_group,
                "last_donation_date": donor_db.last_donation_date.isoformat() if donor_db.last_donation_date else None,
            }
        else:
            donor = {"id": donor_id, "last_donation_date": None}

    elig = calculate_eligibility(donor)

    return jsonify({
        "success": True,
        "donor_id": donor_id,
        "total_donations": len(donor_history),
        "current_eligibility": elig,
        "data": donor_history,
    })
