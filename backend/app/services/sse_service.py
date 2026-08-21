"""SSE Service — Server-Sent Events real-time broadcast for LifeLink AI.

Provides a lightweight pub/sub system using threading.Queue per request_id.
Flask routes yield events from subscribe() as a streaming response.

Architecture:
  - Publisher: backend business logic calls publish_event()
  - Subscribers: donor/hospital/admin dashboards connect via GET /api/v1/events/requests/<id>
  - Auto-cleanup: subscribers removed after timeout or disconnect

Events emitted:
  REQUEST_UPDATED         → units changed (partial acceptance)
  REQUEST_FULFILLED       → all units secured, no more donors needed
  NOTIFICATION_CANCELLED  → donor's pending notification cancelled
  ELIGIBILITY_UPDATED     → donor eligibility status changed
  REQUEST_EXPIRED         → request timed out
"""
import json
import queue
import threading
import time
from typing import Any, Dict, Generator

# ── Subscriber registry ─────────────────────────────────────────────────────────
# Structure: {request_id: [queue.Queue, ...]}
_subscribers: Dict[str, list] = {}
_sub_lock = threading.Lock()

# Heartbeat interval to keep SSE connections alive through proxies
_HEARTBEAT_SECONDS = 20
# Max age for a subscriber queue (auto-cleanup)
_SUBSCRIBER_TIMEOUT = 3600  # 1 hour


def _get_or_create_list(request_id: str) -> list:
    with _sub_lock:
        if request_id not in _subscribers:
            _subscribers[request_id] = []
        return _subscribers[request_id]


def publish_event(request_id: str, event_type: str, data: Dict[str, Any]) -> int:
    """Publishes a real-time event to all active subscribers for a request.

    Args:
        request_id: The emergency request ID (e.g. "REQ-2048")
        event_type: One of REQUEST_UPDATED, REQUEST_FULFILLED, etc.
        data: Dict of event payload — will be JSON-serialized

    Returns:
        Number of subscribers notified.
    """
    payload = {
        "event": event_type,
        "requestId": request_id,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        **data,
    }
    message = _format_sse(event_type, payload)

    with _sub_lock:
        queues = list(_subscribers.get(request_id, []))

    delivered = 0
    dead_queues = []
    for q in queues:
        try:
            q.put_nowait(message)
            delivered += 1
        except queue.Full:
            dead_queues.append(q)

    # Clean up full/dead queues
    if dead_queues:
        with _sub_lock:
            current = _subscribers.get(request_id, [])
            _subscribers[request_id] = [q for q in current if q not in dead_queues]

    return delivered


def subscribe(request_id: str, timeout_seconds: int = _SUBSCRIBER_TIMEOUT) -> Generator[str, None, None]:
    """Generator that yields SSE-formatted strings for a Flask streaming response.

    Usage in Flask route:
        return Response(sse_service.subscribe(req_id), content_type='text/event-stream')
    """
    q: queue.Queue = queue.Queue(maxsize=50)
    sub_list = _get_or_create_list(request_id)

    with _sub_lock:
        sub_list.append(q)

    try:
        start_time = time.time()
        # Send initial connection confirmation
        yield _format_sse("CONNECTED", {"requestId": request_id, "message": "SSE stream connected"})

        while True:
            elapsed = time.time() - start_time
            if elapsed > timeout_seconds:
                yield _format_sse("TIMEOUT", {"message": "Stream timeout — reconnect to resume"})
                break

            try:
                message = q.get(timeout=_HEARTBEAT_SECONDS)
                yield message
            except queue.Empty:
                # Send heartbeat comment to keep connection alive
                yield ": heartbeat\n\n"
    finally:
        # Unregister this subscriber
        with _sub_lock:
            current = _subscribers.get(request_id, [])
            if q in current:
                current.remove(q)


def _format_sse(event: str, data: Dict[str, Any]) -> str:
    """Formats a Server-Sent Event string."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def get_subscriber_count(request_id: str) -> int:
    """Returns how many active SSE clients are watching a request."""
    with _sub_lock:
        return len(_subscribers.get(request_id, []))


def broadcast_to_all(event_type: str, data: Dict[str, Any]) -> int:
    """Broadcasts an event to ALL active request subscribers (e.g. global alerts)."""
    with _sub_lock:
        all_request_ids = list(_subscribers.keys())
    total = 0
    for request_id in all_request_ids:
        total += publish_event(request_id, event_type, data)
    return total
