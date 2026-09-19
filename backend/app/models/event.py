import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, JSON, String, Text
from sqlalchemy.orm import relationship
from app.database.session import Base


class EventStatus(str, enum.Enum):
    PLANNING = "PLANNING"
    ON_TRACK = "ON_TRACK"
    AT_RISK = "AT_RISK"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class EventType(str, enum.Enum):
    HACKATHON = "HACKATHON"
    WORKSHOP = "WORKSHOP"
    SEMINAR = "SEMINAR"
    EXPO = "EXPO"
    CULTURAL = "CULTURAL"
    MEETING = "MEETING"
    OTHER = "OTHER"


class Event(Base):
    __tablename__ = "events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    club_id = Column(String(36), ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    title = Column(String(200), nullable=False)
    slug = Column(String(220), index=True, nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String(255), nullable=True, default="Campus Auditorium")
    
    event_type = Column(Enum(EventType), nullable=False, default=EventType.WORKSHOP)
    status = Column(Enum(EventStatus), nullable=False, default=EventStatus.PLANNING)
    
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    budget = Column(Float, nullable=False, default=0.0)

    # JSON fields for flexible milestone timelines & actionable checklists
    timeline = Column(JSON, nullable=False, default=list)
    checklists = Column(JSON, nullable=False, default=dict)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    club = relationship("Club")
    created_by = relationship("User")
