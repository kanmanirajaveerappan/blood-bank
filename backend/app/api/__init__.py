from backend.app.api.auth import auth_bp
from backend.app.api.donors import donors_bp
from backend.app.api.hospitals import hospitals_bp
from backend.app.api.matching import matching_bp
from backend.app.api.blood_banks import blood_banks_bp
from backend.app.api.admin import admin_bp
from backend.app.api.analytics import analytics_bp

__all__ = [
    "auth_bp",
    "donors_bp",
    "hospitals_bp",
    "matching_bp",
    "blood_banks_bp",
    "admin_bp",
    "analytics_bp",
]
