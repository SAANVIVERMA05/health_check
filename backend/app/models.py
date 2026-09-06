from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    assessments: Mapped[list["Assessment"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    sleep_duration: Mapped[float] = mapped_column(Float)
    work_hours: Mapped[float] = mapped_column(Float)
    mood_level: Mapped[int] = mapped_column(Integer)
    screen_time: Mapped[float] = mapped_column(Float)
    physical_activity: Mapped[float] = mapped_column(Float)
    heart_rate: Mapped[int] = mapped_column(Integer)
    blood_oxygen: Mapped[float] = mapped_column(Float)
    stress_score: Mapped[int] = mapped_column(Integer)
    stress_level: Mapped[str] = mapped_column(String(20))
    summary: Mapped[str] = mapped_column(Text)
    factors: Mapped[str] = mapped_column(Text)
    recommendations: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    user: Mapped[User] = relationship(back_populates="assessments")
