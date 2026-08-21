from flask import Blueprint, jsonify
from backend.app.services.analytics_service import get_analytics_overview

analytics_bp = Blueprint("analytics", __name__, url_prefix="/api/v1/analytics")


@analytics_bp.get("/overview")
def analytics_overview():
    return jsonify({
        "success": True,
        "data": get_analytics_overview()
    })
