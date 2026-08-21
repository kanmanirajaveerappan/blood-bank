"""Acceptance Service — atomic donor acceptance for emergency blood requests.

Implements race-condition-safe acceptance using per-request threading.Lock.
Prevents:
  - Over-allocation (accepted_units exceeding required_units)
  - Duplicate acceptances from the same donor
  - Acceptance after request fulfillment or cancellation

On fulfillment:
  - Marks request status = FULFILLED
  - Publishes SSE REQUEST_FULFILLED event
  - Cancels all pending notifications via SSE

Architecture note:
  The current backend uses in-memory _active_requests (hospitals.py) for fast API
  responses, with commitments persisted to SQLAlchemy DonorCommitment table.
  The threading.Lock guarantees atomic read-check-write within a single process.
  For multi-process production: migrate to SELECT FOR UPDATE with PostgreSQL.
"""
import threading
import time
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import uuid4

from backend.app.services import socketio_service
from backend.app.services.eligibility_service import check_donor_eligible

# ── Per-request threading locks ─────────────────────────────────────────────────
_request_locks: Dict[str, threading.Lock] = {}
_locks_registry_lock = threading.Lock()

# ── In-memory commitment store (mirrors _active_requests in hospitals.py) ────────
# Structure: {request_id: [{commitment}]}
_commitments: Dict[str, list] = {}
_commitments_lock = threading.Lock()


def _get_request_lock(request_id: str) -> threading.Lock:
    """Returns (creating if needed) the per-request lock."""
    with _locks_registry_lock:
        if request_id not in _request_locks:
            _request_locks[request_id] = threading.Lock()
        return _request_locks[request_id]


def donor_already_committed(request_id: str, donor_id: str) -> bool:
    """Checks if a donor has already accepted this request (duplicate protection)."""
    with _commitments_lock:
        for c in _commitments.get(request_id, []):
            if c["donor_id"] == donor_id and c["status"] == "ACCEPTED":
                return True
    return False


def get_commitments(request_id: str) -> list:
    """Returns all commitments for a request."""
    with _commitments_lock:
        return list(_commitments.get(request_id, []))


def accept_request(
    request_id: str,
    donor_id: str,
    donor_name: str,
    donor: Optional[Dict[str, Any]] = None,
    active_requests: Optional[list] = None,
    donation_type: str = "WHOLE_BLOOD",
    units_to_commit: int = 1,
    priority_score: Optional[str] = None,
    match_reason: Optional[str] = None,
) -> Dict[str, Any]:
    """Atomically accepts an emergency blood request for a donor.

    Thread-safe: uses per-request lock to prevent race conditions.

    Args:
        request_id: Emergency request ID
        donor_id: Accepting donor's ID
        donor_name: Donor display name
        donor: Donor dict (for eligibility re-check)
        active_requests: Reference to the in-memory _active_requests list
        donation_type: Type of donation being requested
        units_to_commit: How many units this donor contributes (default: 1)
        priority_score: KNN score for audit logging
        match_reason: AI explanation for audit logging

    Returns:
        {
            success: bool,
            message: str,
            commitment_id: str,        # only if success
            accepted_units: int,
            remaining_units: int,
            required_units: int,
            status: str,               # request status after acceptance
            fulfilled: bool,
        }
    """
    lock = _get_request_lock(request_id)

    with lock:
        # ── 1. Find the request ──────────────────────────────────────────────
        req = None
        if active_requests is not None:
            for r in active_requests:
                if r.get("id") == request_id:
                    req = r
                    break

        if req is None:
            return {
                "success": False,
                "message": f"Emergency request '{request_id}' not found.",
                "fulfilled": False,
            }

        # ── 2. Check request is still open ───────────────────────────────────
        req_status = req.get("status", "OPEN")
        if req_status in ("FULFILLED", "CANCELLED", "EXPIRED", "CLOSED"):
            return {
                "success": False,
                "message": f"Request is already {req_status}. No more donors needed.",
                "fulfilled": req_status == "FULFILLED",
                "accepted_units": req.get("accepted_units", 0),
                "remaining_units": req.get("remaining_units", 0),
                "required_units": req.get("units_required", req.get("required_units", 1)),
                "status": req_status,
            }

        # ── 3. Check remaining units ─────────────────────────────────────────
        required = int(req.get("units_required", req.get("required_units", 1)))
        blood_bank_units = int(req.get("blood_bank_units", 0))
        accepted = int(req.get("accepted_units", 0))
        remaining = required - blood_bank_units - accepted

        if remaining <= 0:
            return {
                "success": False,
                "message": "Requirement already fulfilled. No more donors needed.",
                "fulfilled": True,
                "accepted_units": accepted,
                "remaining_units": 0,
                "required_units": required,
                "status": "FULFILLED",
            }

        # ── 4. Duplicate acceptance check ────────────────────────────────────
        if donor_already_committed(request_id, donor_id):
            return {
                "success": False,
                "message": "You have already accepted this emergency request.",
                "fulfilled": remaining <= 0,
                "accepted_units": accepted,
                "remaining_units": remaining,
                "required_units": required,
                "status": req_status,
            }

        # ── 5. Re-check donor eligibility ────────────────────────────────────
        if donor is not None:
            if not check_donor_eligible(donor, donation_type):
                return {
                    "success": False,
                    "message": "Donor is not currently eligible to donate.",
                    "fulfilled": False,
                    "eligibility_required": True,
                }

        # ── 6. Clamp units to remaining ──────────────────────────────────────
        actual_units = min(units_to_commit, remaining)

        # ── 7. Create commitment record ──────────────────────────────────────
        commitment_id = f"CMT-{uuid4().hex[:8].upper()}"
        now = datetime.utcnow()
        commitment = {
            "id": commitment_id,
            "request_id": request_id,
            "donor_id": donor_id,
            "donor_name": donor_name,
            "units_committed": actual_units,
            "status": "ACCEPTED",
            "accepted_at": now.isoformat(),
            "priority_score": priority_score,
            "match_reason": match_reason or f"Donor {donor_name} accepted via dashboard",
            "created_at": now.isoformat(),
        }

        with _commitments_lock:
            if request_id not in _commitments:
                _commitments[request_id] = []
            _commitments[request_id].append(commitment)

        # ── 8. Update the in-memory request atomically ───────────────────────
        new_accepted = accepted + actual_units
        new_remaining = max(0, remaining - actual_units)
        req["accepted_units"] = new_accepted
        req["remaining_units"] = new_remaining

        # Determine new request status
        if new_remaining <= 0:
            req["status"] = "FULFILLED"
        elif new_accepted > 0:
            req["status"] = "PARTIALLY_FULFILLED"

        new_status = req["status"]

        # ── 9. Publish real-time SSE event ───────────────────────────────────
        sse_payload = {
            "requestId": request_id,
            "hospitalName": req.get("hospital_name", ""),
            "bloodGroup": req.get("blood_group", ""),
            "requiredUnits": required,
            "acceptedUnits": new_accepted,
            "remainingUnits": new_remaining,
            "bloodBankUnits": blood_bank_units,
            "status": new_status,
            "lastDonorName": donor_name,
            "commitmentId": commitment_id,
            "timestamp": now.isoformat(),
        }

        if new_remaining <= 0:
            socketio_service.publish_event(request_id, "REQUEST_FULFILLED", {
                **sse_payload,
                "message": f"All {required} units secured. Emergency request fulfilled.",
            })
        else:
            socketio_service.publish_event(request_id, "REQUEST_UPDATED", {
                **sse_payload,
                "message": f"{new_accepted} of {required} units secured. {new_remaining} still needed.",
            })

        return {
            "success": True,
            "message": (
                f"Accepted! {new_accepted}/{required} units secured."
                if new_remaining > 0
                else f"All {required} units secured. Request fulfilled."
            ),
            "commitment_id": commitment_id,
            "units_committed": actual_units,
            "accepted_units": new_accepted,
            "remaining_units": new_remaining,
            "required_units": required,
            "status": new_status,
            "fulfilled": new_remaining <= 0,
        }


def cancel_donor_acceptance(
    request_id: str, donor_id: str, active_requests: Optional[list] = None
) -> Dict[str, Any]:
    """Cancels a donor's accepted commitment (e.g. donor becomes unavailable)."""
    lock = _get_request_lock(request_id)

    with lock:
        commitment = None
        with _commitments_lock:
            for c in _commitments.get(request_id, []):
                if c["donor_id"] == donor_id and c["status"] == "ACCEPTED":
                    commitment = c
                    break

        if commitment is None:
            return {"success": False, "message": "No active commitment found for this donor."}

        commitment["status"] = "CANCELLED"
        commitment["cancelled_at"] = datetime.utcnow().isoformat()

        # Restore remaining units in the request
        if active_requests is not None:
            for req in active_requests:
                if req.get("id") == request_id:
                    units = commitment["units_committed"]
                    req["accepted_units"] = max(0, req.get("accepted_units", 0) - units)
                    req["remaining_units"] = (
                        int(req.get("units_required", 1))
                        - int(req.get("blood_bank_units", 0))
                        - int(req.get("accepted_units", 0))
                    )
                    if req["remaining_units"] > 0 and req.get("status") in ("FULFILLED",):
                        req["status"] = "PARTIALLY_FULFILLED"
                    break

        return {"success": True, "message": "Commitment cancelled."}


def get_request_summary(request_id: str, active_requests: Optional[list] = None) -> Dict[str, Any]:
    """Returns fulfillment summary for a request — used by hospital & admin dashboards."""
    req = None
    if active_requests:
        for r in active_requests:
            if r.get("id") == request_id:
                req = r
                break

    if req is None:
        return {"success": False, "message": "Request not found"}

    commitments = get_commitments(request_id)
    accepted_donors = [c for c in commitments if c["status"] == "ACCEPTED"]
    cancelled_donors = [c for c in commitments if c["status"] == "CANCELLED"]

    required = int(req.get("units_required", req.get("required_units", 1)))
    blood_bank = int(req.get("blood_bank_units", 0))
    accepted = int(req.get("accepted_units", 0))
    remaining = max(0, required - blood_bank - accepted)

    return {
        "success": True,
        "request_id": request_id,
        "hospital_name": req.get("hospital_name", ""),
        "blood_group": req.get("blood_group", ""),
        "required_units": required,
        "blood_bank_units": blood_bank,
        "accepted_units": accepted,
        "remaining_units": remaining,
        "donor_required_units": required - blood_bank,
        "status": req.get("status", "OPEN"),
        "urgency": req.get("urgency", ""),
        "accepted_donors": accepted_donors,
        "cancelled_donors": cancelled_donors,
        "total_commitments": len(commitments),
        "active_sse_subscribers": socketio_service.get_subscriber_count(request_id),
    }
