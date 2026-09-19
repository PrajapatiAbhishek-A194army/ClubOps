import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, Text
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
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    published_at = Column(DateTime, nullable=True)

    # Relationships
    club = relationship("Club")
    event = relationship("Event")
    created_by = relationship("User")
