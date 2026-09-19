import enum
import json
import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from app.database.session import Base


class ChatMessageType(str, enum.Enum):
    CHAT = "CHAT"
    SYSTEM_EVENT = "SYSTEM_EVENT"
    ANNOUNCEMENT = "ANNOUNCEMENT"
    URGENT_ALERT = "URGENT_ALERT"


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    club_id = Column(String(36), ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False, index=True)
    event_id = Column(String(36), ForeignKey("events.id", ondelete="SET NULL"), nullable=True, index=True)
    sender_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    channel = Column(String(50), default="general", nullable=False, index=True)
    content = Column(Text, nullable=False)
    message_type = Column(Enum(ChatMessageType), default=ChatMessageType.CHAT, nullable=False)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    club = relationship("Club")
    sender = relationship("User")
    event = relationship("Event")

    @property
    def metadata_dict(self):
        if not self.metadata_json:
            return {}
        try:
            return json.loads(self.metadata_json)
        except Exception:
            return {}
