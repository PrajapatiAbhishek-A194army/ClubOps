from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.models.collaboration import ChatMessageType


class ChatMessageSender(BaseModel):
    id: str
    full_name: str
    email: str
    role: Optional[str] = None

    class Config:
        from_attributes = True


class ChatMessageCreate(BaseModel):
    channel: str = Field(default="general", max_length=50)
    content: str = Field(..., min_length=1, max_length=5000)
    message_type: ChatMessageType = Field(default=ChatMessageType.CHAT)
    event_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ChatMessageResponse(BaseModel):
    id: str
    club_id: str
    channel: str
    content: str
    message_type: ChatMessageType
    event_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    sender: ChatMessageSender

    class Config:
        from_attributes = True


class ChannelSummary(BaseModel):
    id: str
    name: str
    label: str
    description: str
    is_event: bool = False
    event_id: Optional[str] = None
    icon: Optional[str] = None


class OnlineUserSummary(BaseModel):
    user_id: str
    full_name: str
    email: str
    role: str
    connected_at: str


class PresenceRosterResponse(BaseModel):
    club_id: str
    total_online: int
    online_users: List[OnlineUserSummary]


class SystemEventBroadcast(BaseModel):
    event_type: str  # e.g. "TASK_UPDATED", "RISK_ALERT", "VOLUNTEER_CHECKIN", "ANNOUNCEMENT_POSTED"
    title: str
    description: str
    actor_name: str
    channel: str = "general"
    metadata: Optional[Dict[str, Any]] = None
