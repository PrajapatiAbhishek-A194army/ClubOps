from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from app.models.meeting import ActionItemStatus


class MeetingCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    transcript_text: str = Field(..., min_length=10)
    event_id: Optional[str] = None
    meeting_date: Optional[datetime] = None


class ActionItemResponse(BaseModel):
    id: str
    meeting_id: str
    title: str
    description: Optional[str] = None
    suggested_owner: Optional[str] = None
    suggested_deadline: Optional[datetime] = None
    confidence_score: float
    status: ActionItemStatus
    created_task_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MeetingResponse(BaseModel):
    id: str
    club_id: str
    event_id: Optional[str] = None
    title: str
    transcript_text: str
    meeting_date: datetime
    processed_at: Optional[datetime] = None
    created_at: datetime
    action_items: List[ActionItemResponse] = []

    class Config:
        from_attributes = True


class ConvertActionItemsRequest(BaseModel):
    action_item_ids: List[str]
    assignments: Optional[Dict[str, str]] = None  # map of action_item_id -> user_id
