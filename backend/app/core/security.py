import hashlib
import hmac
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from functools import wraps
from flask import request, jsonify

from backend.app.core.config import settings

# Safe token creation using HMAC SHA256 or python-jose
try:
    from jose import jwt, JWTError
    USE_JOSE = True
except ImportError:
    USE_JOSE = False


def hash_password(password: str) -> str:
    """Secure SHA256 + salt password hashing (dependency-free fallback)."""
    salt = "lifelink_emergency_salt_2026"
    return hashlib.sha256(f"{salt}{password}".encode("utf-8")).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored hash."""
    return hash_password(plain_password) == hashed_password


def create_access_token(email: str, role: str = "donor", extra_data: Optional[Dict[str, Any]] = None) -> str:
    """Generates a signed JWT access token."""
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": email,
        "role": role,
        "exp": int(expire.timestamp()),
        "iat": int(datetime.utcnow().timestamp()),
    }
    if extra_data:
        payload.update(extra_data)

    if USE_JOSE:
        return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    else:
        # Simple signed token fallback if jose is unavailable
        import base64
        import json
        header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode().rstrip("=")
        body = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
        sig = hmac.new(settings.jwt_secret.encode(), f"{header}.{body}".encode(), hashlib.sha256).hexdigest()
        return f"{header}.{body}.{sig}"


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a JWT token."""
    if not token:
        return None
    try:
        if USE_JOSE:
            return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        else:
            import base64
            import json
            parts = token.split(".")
            if len(parts) != 3:
                return None
            header, body, sig = parts
            expected_sig = hmac.new(settings.jwt_secret.encode(), f"{header}.{body}".encode(), hashlib.sha256).hexdigest()
            if not hmac.compare_digest(sig, expected_sig):
                return None
            padded_body = body + "=" * (-len(body) % 4)
            payload = json.loads(base64.urlsafe_b64decode(padded_body.encode()).decode())
            if payload.get("exp") and payload["exp"] < time.time():
                return None
            return payload
    except Exception:
        return None


def auth_required(roles=None):
    """Decorator to require JWT authentication and optional RBAC on Flask endpoints."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                return jsonify({"success": False, "error": "Missing or invalid authorization token."}), 401
            
            token = auth_header.split(" ")[1]
            payload = decode_access_token(token)
            if not payload:
                return jsonify({"success": False, "error": "Token is invalid or expired."}), 401

            user_role = payload.get("role")
            if roles:
                allowed_roles = [r.lower() for r in (roles if isinstance(roles, list) else [roles])]
                if user_role and user_role.lower() not in allowed_roles:
                    return jsonify({"success": False, "error": "Unauthorized access for your role."}), 403

            # Attach user payload to request context
            request.user = payload
            return f(*args, **kwargs)
        return decorated_function
    return decorator
