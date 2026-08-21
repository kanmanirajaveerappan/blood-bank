from datetime import datetime
from sqlalchemy import String, Float, DateTime, Enum, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.models.base import Base

class DonorLocation(Base):
    __tablename__ = "donor_locations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    donor_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=True)
    city: Mapped[str] = mapped_column(String(120), nullable=True)
    state: Mapped[str] = mapped_column(String(120), nullable=True)
    country: Mapped[str] = mapped_column(String(120), nullable=True)
    source: Mapped[str] = mapped_column(
        Enum("CURRENT_GPS", "LAST_KNOWN_GPS", "MAP_SELECTED", "ADMIN_VERIFIED", name="location_source"),
        nullable=False,
        default="CURRENT_GPS",
    )
    accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    confidence: Mapped[str] = mapped_column(
        Enum("HIGH", "MEDIUM", "LOW", "UNKNOWN", name="location_confidence"),
        nullable=False,
        default="UNKNOWN",
    )
