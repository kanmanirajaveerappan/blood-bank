import os
from functools import lru_cache
from typing import List
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
env_path = Path(__file__).resolve().parent.parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


class Settings:
    app_name: str = "RedRadius"
    api_v1_prefix: str = "/api/v1"
    debug: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")
    
    # Raw database URL from environment
    _raw_db_url: str = os.getenv("DATABASE_URL", "sqlite:///./redradius.db")
    
    # Normalize postgres:// to postgresql:// for SQLAlchemy compatibility
    if _raw_db_url.startswith("postgres://"):
        database_url: str = _raw_db_url.replace("postgres://", "postgresql://", 1)
    else:
        database_url: str = _raw_db_url

    jwt_secret: str = os.getenv("JWT_SECRET", "redradius-emergency-secret-key-2026")
    jwt_algorithm: str = "HS256"
    google_client_id: str = os.getenv("GOOGLE_CLIENT_ID", "274041429116-9fdr2u1not8fk93uq9o98212u6kms66s.apps.googleusercontent.com")
    google_maps_api_key: str = os.getenv("GOOGLE_MAPS_API_KEY", "YOUR_API_KEY")
    access_token_expire_minutes: int = 60 * 24  # 24 hours for convenience
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ]
    # SMTP Email Configuration
    smtp_host: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_user: str = os.getenv("SMTP_USER", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")
    smtp_from_email: str = os.getenv("SMTP_FROM_EMAIL", os.getenv("SMTP_USER", ""))
    smtp_from_name: str = os.getenv("SMTP_FROM_NAME", "RedRadius Emergency System")

    # Freshness thresholds in minutes (LIVE, RECENT, STALE, OLD)
    LOCATION_FRESHNESS_THRESHOLDS: dict = {
        "LIVE": 5,
        "RECENT": 30,
        "STALE": 120,
        "OLD": 1440,
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

