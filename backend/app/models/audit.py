import enum
import json
import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, Enum, ForeignKey, JSON, String, Text
from sqlalchemy.orm import relationship
from app.database.session import Base


class AuditSource(str, enum.Enum):
    HUMAN = "HUMAN"
    AI = "AI"
    RULE_ENGINE = "RULE_ENGINE"


class AuditResult(str, enum.Enum):
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"
    DENIED = "DENIED"
    PENDING_APPROVAL = "PENDING_APPROVAL"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    club_id = Column(String(36), ForeignKey("clubs.id", ondelete="CASCADE"), nullable=True, index=True)
    actor_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    actor_name = Column(String(150), nullable=True)
    actor_email = Column(String(150), nullable=True)
    actor_role = Column(String(50), nullable=True)
    action = Column(String(100), nullable=False, index=True)  # e.g., "CREATE_EVENT", "ASSIGN_TASK", "DELETE_EVENT"
    entity_type = Column(String(50), nullable=False, index=True)  # "EVENT", "TASK", "MEMBER", "SECURITY"
    entity_id = Column(String(36), nullable=False, index=True)
    source = Column(Enum(AuditSource), default=AuditSource.HUMAN, nullable=False)
    result = Column(Enum(AuditResult), default=AuditResult.SUCCESS, nullable=False)
    diff_json = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    prev_hash = Column(String(64), nullable=True, index=True)
    integrity_hash = Column(String(64), nullable=True, index=True)
    metadata_json = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    actor = relationship("User")
    club = relationship("Club")

    @property
    def diff_dict(self):
        if not self.diff_json:
            return {}
        try:
            return json.loads(self.diff_json)
        except Exception:
            return {}
