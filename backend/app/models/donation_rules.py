"""DonationRules — centralized, admin-configurable waiting periods per donation type.

Seeded with default medically-referenced operational values:
  WHOLE_BLOOD  : 56 days (8 weeks)
  PLATELETS    : 7 days
  PLASMA       : 28 days
  DOUBLE_RED   : 112 days (16 weeks)

IMPORTANT: These are operational workflow defaults intended for use within the
blood bank / hospital's approved procedures. Final donor eligibility must follow
the institution's approved policies and applicable local health regulations.
These values should NOT be presented to donors as universal medical advice.
"""
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Integer, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base

# ── In-memory defaults (used as seed & fallback cache) ─────────────────────────
DEFAULT_DONATION_RULES = {
    "WHOLE_BLOOD": {
        "waiting_period_days": 56,
        "label": "Whole Blood",
        "description": "8 weeks / 56 days operational waiting period",
    },
    "PLATELETS": {
        "waiting_period_days": 7,
        "label": "Platelets",
        "description": "7 days operational waiting period",
    },
    "PLASMA": {
        "waiting_period_days": 28,
        "label": "Plasma",
        "description": "28 days operational waiting period",
    },
    "DOUBLE_RED": {
        "waiting_period_days": 112,
        "label": "Double Red Cells",
        "description": "16 weeks / 112 days operational waiting period",
    },
}


class DonationRule(Base):
    __tablename__ = "donation_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)

    # Donation type key — matches last_donation_type on Donor
    donation_type: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False, index=True
    )  # WHOLE_BLOOD | PLATELETS | PLASMA | DOUBLE_RED

    waiting_period_days: Mapped[int] = mapped_column(Integer, nullable=False)
    label: Mapped[str] = mapped_column(String(60), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Audit: who last changed this rule
    updated_by: Mapped[str | None] = mapped_column(String(200), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
