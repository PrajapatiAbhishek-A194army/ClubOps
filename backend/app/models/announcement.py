import enum
import uuid
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from app.database.session import Base


class AnnouncementStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"


class AnnouncementSource(str, enum.Enum):
    MANUAL = "MANUAL"
    AI_DRAFTED = "AI_DRAFTED"


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    club_id = Column(String(36), ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False, index=True)
    event_id = Column(String(36), ForeignKey("events.id", ondelete="SET NULL"), nullable=True, index=True)

    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_source = Column(Enum(AnnouncementSource), default=AnnouncementSource.MANUAL, nullable=False)
    status = Column(Enum(AnnouncementStatus), default=AnnouncementStatus.DRAFT, nullable=False)
    category = Column(String(50), default="GENERAL", nullable=False)
    target_channel = Column(String(50), default="EMAIL", nullable=False)
    email_broadcast_sent = Column(Boolean, default=False, nullable=False)
    email_sent_count = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    published_at = Column(DateTime, nullable=True)

    # Relationships
    club = relationship("Club")
    event = relationship("Event")
    created_by = relationship("User")
