"""SSE Events API Blueprint — real-time Server-Sent Events stream for emergency requests.

Endpoint:
  GET /api/v1/events/requests/<req_id>
    → Streams real-time updates for donor/hospital/admin dashboards
    → Content-Type: text/event-stream
    → Automatically reconnects via EventSource API in browser

Event types emitted over the stream:
  CONNECTED           — connection established
  REQUEST_UPDATED     — units changed (partial acceptance)
  REQUEST_FULFILLED   — all units secured
  NOTIFICATION_CANCELLED — donor's pending notification cancelled
  heartbeat           — SSE comment to keep proxy connections alive
  TIMEOUT             — stream age limit reached (browser will auto-reconnect)
"""
from flask import Blueprint, jsonify
from backend.app.services.socketio_service import publish_event

events_bp = Blueprint("events", __name__, url_prefix="/api/v1/events")

@events_bp.get("/socket/<req_id>")
def socket_info(req_id: str):
    """Inform client to use SocketIO for real-time updates for this request."""
    return jsonify({
        "success": True,
        "request_id": req_id,
        "message": "Connect via SocketIO to receive real-time updates.",
    })

@events_bp.get("/requests/<req_id>/subscribers")
def get_subscriber_count(req_id: str):
    """Placeholder returning zero as SSE is deprecated."""
    return jsonify({
        "success": True,
        "request_id": req_id,
        "active_subscribers": 0,
    })
