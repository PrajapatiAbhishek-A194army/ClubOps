from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.notification import NotificationType


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: NotificationType
    is_read: bool
    link_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationUnreadCount(BaseModel):
    unread_count: int


class TestEmailRequest(BaseModel):
    recipient_email: Optional[str] = None
    subject: Optional[str] = "ClubOps Notification Test"
    message: Optional[str] = "This is a test notification from your ClubOps platform."


class AIBriefingRequest(BaseModel):
    club_id: str
    title: Optional[str] = "🤖 AI Operations Briefing: Event Logistics & Staffing Ready"
    message: Optional[str] = "AI Staffing analysis complete: 3 events scheduled, volunteer skill matches verified with 0 schedule overlap."
    link_url: Optional[str] = "/app/events"
