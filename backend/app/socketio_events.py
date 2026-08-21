from flask import request
from flask_socketio import join_room, leave_room
from backend.app.extensions import socketio

# Connection / disconnection handling
@socketio.on('connect')
def handle_connect():
    return None

@socketio.on('disconnect')
def handle_disconnect():
    return None

# Client asks to join a private user room (e.g., after login)
@socketio.on('join_user')
def on_join_user(data):
    user_id = data.get('user_id') if isinstance(data, dict) else None
    if not user_id:
        return False
    room = f"user_{user_id}"
    join_room(room)
    return True

# Client asks to leave the private room (e.g., logout)
@socketio.on('leave_user')
def on_leave_user(data):
    user_id = data.get('user_id') if isinstance(data, dict) else None
    if not user_id:
        return False
    room = f"user_{user_id}"
    leave_room(room)
    return True


# Helper for joining a request‑specific room (optional – can be used by front‑end when viewing a request)
@socketio.on('join_request')
def on_join_request(data):
    request_id = data.get('request_id')
    if not request_id:
        return False
    room = f"request_{request_id}"
    socketio.enter_room(request.sid, room)
    return True

@socketio.on('leave_request')
def on_leave_request(data):
    request_id = data.get('request_id')
    if not request_id:
        return False
    room = f"request_{request_id}"
    socketio.leave_room(request.sid, room)
    return True
