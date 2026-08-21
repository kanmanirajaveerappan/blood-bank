from datetime import datetime
from typing import Dict, Any, List, Optional
from uuid import uuid4

from backend.app.services.compatibility_service import get_compatible_candidates, validate_blood_group
from backend.app.services.geospatial_service import find_nearby_donors, get_next_expansion_radius
from backend.app.services.knn_service import rank_candidates_knn
from backend.app.services.eligibility_service import filter_eligible_donors
from backend.app.services import socketio_service


class EmergencyCoordinationAgent:
    """
    Controlled Agentic AI Coordinator for Emergency Blood Requests.
    Executes staged tools deterministically with full audit logging.
    """

    def __init__(self, request_id: Optional[str] = None):
        self.agent_id = str(uuid4())
        self.request_id = request_id or f"REQ-{uuid4().hex[:8].upper()}"
        self.state = "CREATED"
        self.logs: List[Dict[str, Any]] = []
        self.current_radius_km = 25.0
        self.log_action("AGENT_INITIALIZED", {"request_id": self.request_id, "state": self.state})

    def log_action(self, action: str, details: Dict[str, Any]) -> None:
        """Records an auditable trace of the agent's decision steps."""
        self.logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": action,
            "state": self.state,
            "details": details,
        })

    def run_full_coordination(
        self,
        blood_group: str,
        hospital_lat: float,
        hospital_lon: float,
        donor_pool: List[Dict[str, Any]],
        units_required: int = 1,
        urgency: str = "URGENT",
        k: int = 5,
        radius_km: float = 25.0
    ) -> Dict[str, Any]:
        """
        Executes the end-to-end agentic workflow:
        Validate -> Compatibility -> Availability -> Geospatial -> KNN Ranking -> Notification Dispatch -> Response Monitoring.
        """
        self.current_radius_km = radius_km
        
        # Step 1: Validate Emergency Request
        self.state = "VALIDATING"
        if not validate_blood_group(blood_group):
            self.state = "VALIDATION_FAILED"
            self.log_action("VALIDATION_ERROR", {"error": f"Invalid blood group: {blood_group}"})
            return {
                "success": False,
                "agent_id": self.agent_id,
                "request_id": self.request_id,
                "state": self.state,
                "error": f"Invalid blood group: {blood_group}",
                "logs": self.logs,
            }
        self.log_action("REQUEST_VALIDATED", {
            "blood_group": blood_group,
            "units_required": units_required,
            "urgency": urgency,
            "coordinates": (hospital_lat, hospital_lon)
        })

        # Step 2: Deterministic Compatibility Filtering
        self.state = "COMPATIBILITY_CHECK"
        compatible_groups = get_compatible_candidates(blood_group)
        compatible_donors = [
            d for d in donor_pool 
            if d.get("blood_group", d.get("bloodGroup")) in compatible_groups
        ]
        self.log_action("COMPATIBILITY_FILTERED", {
            "requested_group": blood_group,
            "compatible_groups": compatible_groups,
            "matched_donor_count": len(compatible_donors)
        })

        # Step 3: Eligibility Gate — HARD filter before availability
        self.state = "ELIGIBILITY_CHECK"
        donation_type = data.get("donation_type", "WHOLE_BLOOD") if isinstance(locals().get('data'), dict) else "WHOLE_BLOOD"
        eligible_donors, ineligible_donors = filter_eligible_donors(compatible_donors, donation_type)
        self.log_action("ELIGIBILITY_FILTERED", {
            "donation_type": donation_type,
            "compatible_count": len(compatible_donors),
            "eligible_count": len(eligible_donors),
            "ineligible_count": len(ineligible_donors),
            "note": "Ineligible donors will NOT receive notifications."
        })

        # Step 4: Availability & Consent Filtering
        self.state = "AVAILABILITY_CHECK"
        available_donors = [
            d for d in eligible_donors
            if d.get("availability") is True or str(d.get("availability_status", "")).upper() == "AVAILABLE"
        ]
        self.log_action("AVAILABILITY_FILTERED", {
            "active_available_count": len(available_donors)
        })

        # Step 4: Geospatial Search
        self.state = "GEOSPATIAL_SEARCH"
        nearby_donors = find_nearby_donors(
            available_donors,
            center_lat=hospital_lat,
            center_lon=hospital_lon,
            radius_km=self.current_radius_km
        )
        
        # Auto radius expansion if insufficient donors found
        expanded = False
        if len(nearby_donors) < max(k, units_required * 2) and self.current_radius_km < 50.0:
            old_radius = self.current_radius_km
            self.current_radius_km = get_next_expansion_radius(self.current_radius_km)
            nearby_donors = find_nearby_donors(
                available_donors,
                center_lat=hospital_lat,
                center_lon=hospital_lon,
                radius_km=self.current_radius_km
            )
            expanded = True
            self.log_action("SEARCH_RADIUS_EXPANDED", {
                "previous_radius_km": old_radius,
                "new_radius_km": self.current_radius_km,
                "expanded_donor_count": len(nearby_donors)
            })
        else:
            self.log_action("GEOSPATIAL_SEARCH_COMPLETED", {
                "radius_km": self.current_radius_km,
                "found_nearby_count": len(nearby_donors)
            })

        # Step 5: KNN Candidate Ranking
        self.state = "KNN_RANKING"
        ranked_candidates = rank_candidates_knn(
            nearby_donors,
            k=k,
            max_distance_km=self.current_radius_km
        )
        self.log_action("KNN_RANKING_COMPLETED", {
            "ranked_candidate_count": len(ranked_candidates),
            "top_candidate": ranked_candidates[0]["name"] if ranked_candidates else None
        })

        # Step 6: Dispatch Staged Notifications
        self.state = "NOTIFYING"
        notifications_sent = []
        for index, candidate in enumerate(ranked_candidates[:units_required * 2]):
            notif_id = f"NOTIF-{uuid4().hex[:6].upper()}"
            notifications_sent.append({
                "notification_id": notif_id,
                "donor_id": candidate.get("donor_id", candidate.get("id")),
                "donor_name": candidate.get("name"),
                "channel": "PUSH_AND_SMS",
                "priority": urgency,
                "batch_order": index + 1,
                "status": "SENT",
                "timestamp": datetime.utcnow().isoformat()
            })
        self.log_action("NOTIFICATIONS_DISPATCHED", {
            "total_notifications": len(notifications_sent),
            "channels": ["in-app", "sms", "push"]
        })

        # Step 7: Final State
        self.state = "MONITORING_RESPONSES"
        self.log_action("AGENT_AWAITING_RESPONSES", {
            "request_id": self.request_id,
            "status": "Ready for live donor responses"
        })

        return {
            "success": True,
            "agent_id": self.agent_id,
            "request_id": self.request_id,
            "state": self.state,
            "compatible_groups": compatible_groups,
            "search_radius_km": self.current_radius_km,
            "was_expanded": expanded,
            "total_compatible": len(compatible_donors),
            "total_eligible": len(eligible_donors),
            "total_ineligible": len(ineligible_donors),
            "total_nearby": len(nearby_donors),
            "ranked_candidates": ranked_candidates,
            "dispatched_notifications": notifications_sent,
            "agent_logs": self.logs,
        }

    # ── Agent Tools ───────────────────────────────────────────────────────────────

    def check_remaining_requirement(self, active_requests: list, request_id: str) -> Dict[str, Any]:
        """Agent tool: checks how many units are still needed for a request."""
        for req in active_requests:
            if req.get("id") == request_id:
                required = int(req.get("units_required", 1))
                accepted = int(req.get("accepted_units", 0))
                blood_bank = int(req.get("blood_bank_units", 0))
                remaining = max(0, required - accepted - blood_bank)
                return {
                    "request_id": request_id,
                    "required_units": required,
                    "accepted_units": accepted,
                    "blood_bank_units": blood_bank,
                    "remaining_units": remaining,
                    "fulfilled": remaining == 0,
                    "status": req.get("status", "OPEN"),
                }
        return {"error": f"Request {request_id} not found", "remaining_units": -1}

    def cancel_pending_notifications(self, request_id: str, reason: str = "REQUEST_FULFILLED") -> Dict[str, Any]:
        """Agent tool: publishes cancellation event to all pending donors via SSE."""
        from backend.app.services.acceptance_service import get_commitments
        commitments = get_commitments(request_id)
        cancelled_count = socketio_service.publish_event(
            request_id,
            "NOTIFICATION_CANCELLED",
            {
                "requestId": request_id,
                "reason": reason,
                "message": "Emergency request fulfilled. No action required from you. Thank you for being ready to help.",
            }
        )
        self.log_action("PENDING_NOTIFICATIONS_CANCELLED", {
            "request_id": request_id,
            "reason": reason,
            "sse_subscribers_notified": cancelled_count,
        })
        return {"cancelled": True, "notified_count": cancelled_count}
