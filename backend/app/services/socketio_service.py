from backend.app.extensions import socketio


def publish_event(request_id: str, event_type: str, data: dict) -> int:
    """Publish a real‑time event via Flask‑SocketIO.

    Args:
        request_id: Identifier of the emergency request.
        event_type: Name of the event (e.g., ``REQUEST_UPDATED``).
        data: Payload dictionary. ``requestId`` will be added automatically.

    Returns:
        The number of clients the event was emitted to (SocketIO does not expose this directly;
        we return ``1`` as a placeholder indicating the emit was performed).
    """
    payload = {"requestId": request_id, **data}
    # Emit to a room named after the request_id. Clients should join this room to receive updates.
    socketio.emit(event_type, payload, room=request_id)
    return 1


def broadcast(event_type: str, data: dict) -> int:
    """Broadcast an event to all connected clients.

    Args:
        event_type: Event name.
        data: Payload dictionary.
    """
    socketio.emit(event_type, data)
    return 1


def get_subscriber_count(request_id: str) -> int:
    """Return a placeholder subscriber count for a request.

    SocketIO does not provide a built‑in subscriber count per room, so we return ``0``.
    This mirrors the previous SSE placeholder behaviour.
    """
    return 0
