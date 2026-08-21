import os
import sys

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from flask import Flask, jsonify
from flask_cors import CORS

from backend.app.core.config import settings
from backend.app.core.database import init_app
from backend.app.api.auth import auth_bp
from backend.app.api.donors import donors_bp
from backend.app.api.hospitals import hospitals_bp
from backend.app.api.matching import matching_bp
from backend.app.api.blood_banks import blood_banks_bp
from backend.app.api.eligibility import eligibility_bp
from backend.app.api.events import events_bp
from backend.app.api.analytics import analytics_bp
from backend.app.api.admin import admin_bp


from backend.app.extensions import db, migrate, socketio


def create_app() -> Flask:
    """Application factory for LifeLink AI Flask backend."""
    app = Flask(__name__)
    app.config["SECRET_KEY"] = settings.jwt_secret
    app.config["JSON_SORT_KEYS"] = False

    # Enable CORS for frontend communication
    CORS(app, origins="*", supports_credentials=True)

    # Initialize database tables
    try:
        init_app(app)
    except Exception as exc:
        print(f"Database init warning: {exc}")

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(donors_bp)
    app.register_blueprint(hospitals_bp)
    app.register_blueprint(matching_bp)
    app.register_blueprint(blood_banks_bp)
    app.register_blueprint(eligibility_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(admin_bp)

    migrate.init_app(app, db)
    socketio.init_app(app, cors_allowed_origins="*")

    # Register Socket.IO event handlers
    import backend.app.socketio_events  # noqa: F401

    @app.route("/")
    def index():
        return jsonify({
            "app": "RedRadius",
            "version": "1.0.0",
            "framework": "Flask",
            "status": "online",
            "description": "AI-Powered Emergency Blood Donor Matching Using KNN and Geospatial Analysis"
        })

    @app.route("/api/v1/health")
    @app.route("/api/health")
    def health():
        return jsonify({
            "success": True,
            "message": "RedRadius Flask backend is running.",
            "service": "backend",
            "framework": "Flask",
            "version": "1.0.0",
        })

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"Starting RedRadius Flask server on port {port}...")
    socketio.run(app, host="0.0.0.0", port=port, debug=settings.debug, allow_unsafe_werkzeug=True)

