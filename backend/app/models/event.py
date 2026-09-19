import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database.session import Base


class EventStatus(str, enum.Enum):
    PLANNING = "PLANNING"
    ON_TRACK = "ON_TRACK"
    AT_RISK = "AT_RISK"
    DRAFT = "DRAFT"
    PLANNED = "PLANNED"
    ONGOING = "ONGOING"
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


class EventMemberRole(str, enum.Enum):
    EVENT_COORDINATOR = "EVENT_COORDINATOR"
    VOLUNTEER = "VOLUNTEER"


class EventMemberStatus(str, enum.Enum):
    CONFIRMED = "CONFIRMED"
    INVITED = "INVITED"
    DECLINED = "DECLINED"


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
    status = Column(Enum(EventStatus), nullable=False, default=EventStatus.DRAFT)
    
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    budget = Column(Float, nullable=False, default=0.0)

    # AI Staffing breakdown fields
    min_volunteers_required = Column(Integer, nullable=False, default=1)
    skill_requirements = Column(JSON, nullable=False, default=list)  # e.g. [{"skill_name": "Power BI", "required_count": 3}]

    # JSON fields for flexible milestone timelines & actionable checklists
    timeline = Column(JSON, nullable=False, default=list)
    checklists = Column(JSON, nullable=False, default=dict)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    club = relationship("Club", back_populates="events")
    created_by = relationship("User")
    members = relationship("EventMember", back_populates="event", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="event", cascade="all, delete-orphan")
    risks = relationship("Risk", back_populates="event", cascade="all, delete-orphan")


class EventMember(Base):
    __tablename__ = "event_members"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(Enum(EventMemberRole), default=EventMemberRole.VOLUNTEER, nullable=False)
    status = Column(Enum(EventMemberStatus), default=EventMemberStatus.CONFIRMED, nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_event_user_member"),
    )

    # Relationships
    event = relationship("Event", back_populates="members")
    user = relationship("User")
