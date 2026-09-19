import enum
from datetime import datetime
from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class AvailabilityStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    BUSY = "BUSY"
    ON_SHIFT = "ON_SHIFT"
    UNAVAILABLE = "UNAVAILABLE"


class CheckInStatus(str, enum.Enum):
    CHECKED_IN = "CHECKED_IN"
    CHECKED_OUT = "CHECKED_OUT"


class VolunteerProfile(BaseModel):
    __tablename__ = "volunteer_profiles"

    club_id = Column(String(36), ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Skills array stored as JSON: ["Audio / Visual", "Python", "Crowd Control", etc.]
    skills = Column(JSON, default=list, nullable=False)
    department = Column(String(100), nullable=False, default="General Operations")
    
    availability_status = Column(
        Enum(AvailabilityStatus), 
        default=AvailabilityStatus.AVAILABLE, 
        nullable=False
    )
    availability_notes = Column(Text, nullable=True)
    available_hours_per_week = Column(Integer, default=10, nullable=False)
    
    check_in_status = Column(
        Enum(CheckInStatus), 
        default=CheckInStatus.CHECKED_OUT, 
        nullable=False
    )
    checked_in_at = Column(DateTime, nullable=True)
    phone_number = Column(String(30), nullable=True)
    rating = Column(Float, default=5.0, nullable=False)

    __table_args__ = (
        UniqueConstraint("club_id", "user_id", name="uq_club_user_volunteer_profile"),
    )

    # Relationships
    club = relationship("Club", backref="volunteer_profiles")
    user = relationship("User", backref="volunteer_profiles")
