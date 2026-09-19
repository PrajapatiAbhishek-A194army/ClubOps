import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, Enum, ForeignKey, JSON, String
from sqlalchemy.orm import relationship
from app.database.session import Base


class AuditSource(str, enum.Enum):
    HUMAN = "HUMAN"
    AI = "AI"
    RULE_ENGINE = "RULE_ENGINE"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    actor_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)  # e.g., "CREATE_EVENT", "ASSIGN_TASK", "TRANSFER_HEAD"
    entity_type = Column(String(50), nullable=False, index=True)  # "EVENT", "TASK", "CLUB_HEAD"
    entity_id = Column(String(36), nullable=False, index=True)
    source = Column(Enum(AuditSource), default=AuditSource.HUMAN, nullable=False)
    metadata_json = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    actor = relationship("User")
