from datetime import datetime

from sqlalchemy import String, DateTime, Float, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.models.base import Base


class BloodRequest(Base):
    __tablename__ = "blood_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    hospital_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    blood_group: Mapped[str] = mapped_column(String(10), nullable=False)
    units_required: Mapped[int] = mapped_column(Integer, default=1)
    emergency_level: Mapped[str] = mapped_column(String(30), default="URGENT")
    status: Mapped[str] = mapped_column(String(30), default="CREATED")
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    place_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    location_source: Mapped[str | None] = mapped_column(String(50), default="google_places", nullable=True)
    location_accuracy: Mapped[str | None] = mapped_column(String(50), default="good", nullable=True)
    required_by: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    additional_info: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # ── Fulfillment Tracking ─────────────────────────────────────────────────────
    accepted_units: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # blood_bank_units: units already sourced from blood bank stock
    blood_bank_units: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # remaining_units = units_required - accepted_units - blood_bank_units
    remaining_units: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    notification_batch: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # Possible statuses: OPEN | MATCHING | PARTIALLY_FULFILLED | FULFILLED | EXPIRED | CANCELLED | CLOSED
