import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Float, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base


class Challenge(Base):
    __tablename__ = "challenges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    slug: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False)  # Beginner, Intermediate, Advanced, Expert
    category: Mapped[str] = mapped_column(String(50), default="Basic Queries", nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    target_dataset_slug: Mapped[str] = mapped_column(String(100), default="sales_demo", nullable=False)
    starter_sql: Mapped[str] = mapped_column(Text, nullable=False)
    solution_sql: Mapped[str] = mapped_column(Text, nullable=False)
    hints_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    ordinal_rank: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    points_xp: Mapped[int] = mapped_column(Integer, default=100, server_default="100", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    attempts = relationship("ChallengeAttempt", back_populates="challenge", cascade="all, delete-orphan")


class ChallengeAttempt(Base):
    __tablename__ = "challenge_attempts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    challenge_id: Mapped[str] = mapped_column(String(36), ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False, index=True)
    submitted_sql: Mapped[str] = mapped_column(Text, nullable=False)
    is_passed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    execution_time_ms: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    error_details: Mapped[str | None] = mapped_column(Text, nullable=True)
    attempted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user = relationship("User", back_populates="challenge_attempts")
    challenge = relationship("Challenge", back_populates="attempts")
