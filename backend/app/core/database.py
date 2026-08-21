from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from backend.app.extensions import db
from backend.app.core.config import settings
from backend.app.models import (
    user,
    donor,
    hospital,
    blood_bank,
    blood_request,
    matching_result,
    notification,
    audit_log,
)  # noqa: F401
from contextlib import contextmanager


def init_app(app: Flask) -> None:
    """Initialise Flask‑SQLAlchemy with the Flask app and create tables."""
    app.config["SQLALCHEMY_DATABASE_URI"] = settings.database_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    
    # Engine options for cloud/serverless PostgreSQL (Neon)
    if "postgresql" in settings.database_url:
        app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
            "pool_pre_ping": True,
            "pool_recycle": 300,
        }

    db.init_app(app)
    with app.app_context():
        db.create_all()


_standalone_app = None


def get_standalone_app() -> Flask:
    global _standalone_app
    if _standalone_app is None:
        _standalone_app = Flask("lifelink_standalone")
        init_app(_standalone_app)
    return _standalone_app


def init_db() -> None:
    """Create tables without needing an existing Flask app (used by scripts)."""
    app = get_standalone_app()
    with app.app_context():
        db.create_all()


def get_db():
    """Return the scoped session from Flask‑SQLAlchemy."""
    return db.session


@contextmanager
def get_db_context():
    """Provide a transactional context manager for DB operations.

    Commits on success, rolls back on exception.
    """
    from flask import has_app_context

    if not has_app_context():
        app = get_standalone_app()
        with app.app_context():
            session = db.session
            try:
                yield session
                session.commit()
            except Exception:
                session.rollback()
                raise
    else:
        session = db.session
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise

