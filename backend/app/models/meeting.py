import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from app.database.session import Base


class ActionItemStatus(str, enum.Enum):
    EXTRACTED = "EXTRACTED"
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"
    CONVERTED = "CONVERTED"


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    club_id = Column(String(36), ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False, index=True)
    event_id = Column(String(36), ForeignKey("events.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    title = Column(String(200), nullable=False)
    transcript_text = Column(Text, nullable=False)
    meeting_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    processed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    club = relationship("Club")
    event = relationship("Event")
    created_by = relationship("User")
    action_items = relationship("ActionItem", back_populates="meeting", cascade="all, delete-orphan")


class ActionItem(Base):
    __tablename__ = "action_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(String(36), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    suggested_owner = Column(String(120), nullable=True)
    suggested_deadline = Column(DateTime, nullable=True)
    confidence_score = Column(Float, default=0.0, nullable=False)
    status = Column(Enum(ActionItemStatus), default=ActionItemStatus.EXTRACTED, nullable=False)
    created_task_id = Column(String(36), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    meeting = relationship("Meeting", back_populates="action_items")
    created_task = relationship("Task")
