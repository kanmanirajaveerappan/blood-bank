from datetime import datetime

from sqlalchemy import String, DateTime, Float, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.models.base import Base


class MatchingResult(Base):
    __tablename__ = "matching_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    request_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    donor_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    candidate_priority_score: Mapped[float] = mapped_column(Float, default=0.0)
    distance_km: Mapped[float] = mapped_column(Float, default=0.0)
    compatibility_status: Mapped[str] = mapped_column(String(30), default="eligible")
    availability_status: Mapped[str] = mapped_column(String(30), default="available")
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
