from typing import Dict, Any


class EmergencyCoordinationAgent:
    def __init__(self):
        self.state = "CREATED"

    def validate_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        self.state = "VALIDATING"
        return {"status": "valid", "request": request}

    def run_matching(self, request: Dict[str, Any]) -> Dict[str, Any]:
        self.state = "MATCHING"
        return {"status": "matching_started", "request_id": request.get("id")}

    def notify_candidates(self, request: Dict[str, Any]) -> Dict[str, Any]:
        self.state = "NOTIFYING"
        return {"status": "notifications_sent", "request_id": request.get("id")}
