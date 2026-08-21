"""DonorCommitment — atomic record of a donor accepting an emergency blood request."""
from datetime import datetime

from sqlalchemy import String, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.models.base import Base


class DonorCommitment(Base):
    __tablename__ = "donor_commitments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    request_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    donor_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    donor_name: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # How many units this donor is contributing (usually 1, configurable)
    units_committed: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Commitment lifecycle
    status: Mapped[str] = mapped_column(
        String(20), default="ACCEPTED", nullable=False
    )  # PENDING | ACCEPTED | CANCELLED | EXPIRED | NO_LONGER_REQUIRED

    accepted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # AI decision explanation (why this donor was selected/matched)
    match_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    priority_score: Mapped[str | None] = mapped_column(String(20), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
