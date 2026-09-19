from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class AnnouncementCategory(str, Enum):
    REGISTRATION_REMINDER = "REGISTRATION_REMINDER"
    VENUE_UPDATE = "VENUE_UPDATE"
    EMERGENCY_NOTICE = "EMERGENCY_NOTICE"
    COMPLETION_MESSAGE = "COMPLETION_MESSAGE"
    GENERAL = "GENERAL"


class AnnouncementTone(str, Enum):
    PROFESSIONAL = "PROFESSIONAL"
    ENTHUSIASTIC = "ENTHUSIASTIC"
    URGENT = "URGENT"
    FRIENDLY = "FRIENDLY"


class AnnouncementChannel(str, Enum):
    EMAIL = "EMAIL"
    WHATSAPP = "WHATSAPP"
    DISCORD = "DISCORD"
    CAMPUS_PORTAL = "CAMPUS_PORTAL"


class AIGenerateAnnouncementRequest(BaseModel):
    event_id: Optional[str] = Field(None, description="Optional target event ID to provide operational context")
    category: AnnouncementCategory = Field(AnnouncementCategory.REGISTRATION_REMINDER, description="Core announcement category")
    tone: AnnouncementTone = Field(AnnouncementTone.ENTHUSIASTIC, description="Editorial voice and tone")
    target_channel: AnnouncementChannel = Field(AnnouncementChannel.EMAIL, description="Broadcast medium")
    custom_notes: Optional[str] = Field(None, description="Specific instructions, deadlines, or highlights to include")


class AIGenerateAnnouncementResponse(BaseModel):
    title: str
    content: str
    category: str
    call_to_action: Optional[str] = None
    channel_formatted: Optional[str] = None


class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    content: str = Field(..., min_length=5)
    event_id: Optional[str] = None
    category: str = "GENERAL"
    target_channel: str = "EMAIL"
    status: str = "DRAFT"
    created_source: str = "MANUAL"


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    content: Optional[str] = Field(None, min_length=5)
    category: Optional[str] = None
    target_channel: Optional[str] = None


class AnnouncementPublishRequest(BaseModel):
    broadcast_email: bool = Field(True, description="Send branded transactional emails to club members via Brevo")
    dispatch_in_app: bool = Field(True, description="Send in-app notification alerts to club members")


class AnnouncementResponse(BaseModel):
    id: str
    club_id: str
    event_id: Optional[str] = None
    event_title: Optional[str] = None
    title: str
    content: str
    created_by_id: Optional[str] = None
    creator_name: Optional[str] = None
    created_source: str
    status: str
    category: str
    target_channel: str
    email_broadcast_sent: bool = False
    email_sent_count: int = 0
    created_at: datetime
    published_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
