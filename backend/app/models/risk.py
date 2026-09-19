import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from app.database.session import Base


class RiskSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class RiskStatus(str, enum.Enum):
    OPEN = "OPEN"
    MITIGATED = "MITIGATED"
    RESOLVED = "RESOLVED"


class RiskSource(str, enum.Enum):
    MANUAL = "MANUAL"
    RULE_ENGINE = "RULE_ENGINE"
    AI = "AI"


class Risk(Base):
    __tablename__ = "risks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    related_task_id = Column(String(36), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True, index=True)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(Enum(RiskSeverity), default=RiskSeverity.MEDIUM, nullable=False)
    status = Column(Enum(RiskStatus), default=RiskStatus.OPEN, nullable=False)
    source = Column(Enum(RiskSource), default=RiskSource.RULE_ENGINE, nullable=False)

    detected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    event = relationship("Event", back_populates="risks")
    related_task = relationship("Task")
