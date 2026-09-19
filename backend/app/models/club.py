import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database.session import Base


class ClubRole(str, enum.Enum):
    PRESIDENT = "PRESIDENT"
    CLUB_HEAD = "CLUB_HEAD"
    ORGANIZER = "ORGANIZER"
    TEAM_LEAD = "TEAM_LEAD"
    VOLUNTEER = "VOLUNTEER"
    MEMBER = "MEMBER"


class ClubStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ARCHIVED = "ARCHIVED"


class MembershipStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    SUSPENDED = "SUSPENDED"


class Club(Base):
    __tablename__ = "clubs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(150), unique=True, index=True, nullable=False)
    code = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    institution = Column(String(200), nullable=False, default="University Campus")
    logo_url = Column(String(500), nullable=True)
    status = Column(Enum(ClubStatus), default=ClubStatus.ACTIVE, nullable=False)
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    memberships = relationship("ClubMembership", back_populates="club", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="club", cascade="all, delete-orphan")
    join_requests = relationship("JoinRequest", back_populates="club", cascade="all, delete-orphan")


class ClubMembership(Base):
    __tablename__ = "club_memberships"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    club_id = Column(String(36), ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(Enum(ClubRole), default=ClubRole.VOLUNTEER, nullable=False)
    status = Column(Enum(MembershipStatus), default=MembershipStatus.ACTIVE, nullable=False)
    department = Column(String(80), nullable=True, default="General")
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("club_id", "user_id", name="uq_club_user_membership"),
    )

    # Relationships
    club = relationship("Club", back_populates="memberships")
    user = relationship("User", back_populates="memberships")
