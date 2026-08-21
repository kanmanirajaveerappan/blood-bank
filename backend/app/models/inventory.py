from datetime import datetime
from sqlalchemy import String, DateTime, Integer, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.models.base import Base


class BloodInventory(Base):
    __tablename__ = "blood_inventory"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    blood_bank_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    blood_group: Mapped[str] = mapped_column(String(10), nullable=False)
    units_available: Mapped[int] = mapped_column(Integer, default=0)
    units_reserved: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(30), default="Healthy")  # Healthy, Low, Critical
    expiry_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
