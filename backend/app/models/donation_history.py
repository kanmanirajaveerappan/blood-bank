"""DonationHistory — records every verified/pending donation per donor."""
from datetime import datetime

from sqlalchemy import String, DateTime, Integer, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.models.base import Base


class DonationHistory(Base):
    __tablename__ = "donation_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    donor_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)

    # Donation type determines the waiting period applied
    donation_type: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # WHOLE_BLOOD | PLATELETS | PLASMA | DOUBLE_RED

    donation_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    blood_group: Mapped[str | None] = mapped_column(String(10), nullable=True)

    # Waiting period applied at the time of this donation (snapshot from donation_rules)
    waiting_period_days: Mapped[int] = mapped_column(Integer, default=56, nullable=False)

    # Pre-calculated next eligible date stored for audit/display
    next_eligible_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Location context
    hospital_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)

    # Verification
    status: Mapped[str] = mapped_column(
        String(20), default="PENDING", nullable=False
    )  # PENDING | VERIFIED | REJECTED
    verified_by: Mapped[str | None] = mapped_column(String(200), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
