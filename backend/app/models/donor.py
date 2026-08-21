from datetime import datetime

from sqlalchemy import String, DateTime, Boolean, Float, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.models.base import Base


class Donor(Base):
    __tablename__ = "donors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    blood_group: Mapped[str] = mapped_column(String(10), nullable=False)
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    date_of_birth: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    availability_status: Mapped[str] = mapped_column(String(30), default="UNAVAILABLE")
    availability_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    consent_status: Mapped[bool] = mapped_column(Boolean, default=False)
    profile_photo_url: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # --- New location & profile fields ---
    registered_address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    registered_city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    registered_state: Mapped[str | None] = mapped_column(String(120), nullable=True)
    registered_country: Mapped[str | None] = mapped_column(String(120), nullable=True)
    registered_pincode: Mapped[str | None] = mapped_column(String(20), nullable=True)

    location_sharing_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    location_permission_status: Mapped[str] = mapped_column(String(20), default="UNKNOWN")  # GRANTED/DENIED/UNKNOWN
    profile_completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_active: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_location_update: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    privacy_level: Mapped[str] = mapped_column(String(30), default="standard")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Donation Eligibility Fields ───────────────────────────────────────────
    last_donation_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_donation_type: Mapped[str | None] = mapped_column(
        String(30), nullable=True
    )  # WHOLE_BLOOD | PLATELETS | PLASMA | DOUBLE_RED
    next_eligible_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    eligibility_status: Mapped[str] = mapped_column(
        String(20), default="ELIGIBLE", nullable=False
    )  # ELIGIBLE | NOT_ELIGIBLE
    total_donations: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
