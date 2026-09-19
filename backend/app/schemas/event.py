from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.models.event import EventStatus, EventType


class MilestoneItem(BaseModel):
    id: str
    title: str
    target_date: Optional[str] = None
    completed: bool = False
    assigned_to: Optional[str] = None


class ChecklistsData(BaseModel):
    sponsor_checklist: List[str] = Field(default_factory=list)
    judge_checklist: List[str] = Field(default_factory=list)
    volunteer_specs: List[str] = Field(default_factory=list)


class EventBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    location: Optional[str] = "Campus Auditorium"
    event_type: EventType = EventType.WORKSHOP
    start_date: datetime
    end_date: datetime
    budget: float = Field(default=0.0, ge=0.0)


class EventCreate(EventBase):
    timeline: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    checklists: Optional[Dict[str, Any]] = Field(default_factory=dict)


class EventUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = None
    location: Optional[str] = None
    event_type: Optional[EventType] = None
    status: Optional[EventStatus] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[float] = Field(None, ge=0.0)
    timeline: Optional[List[Dict[str, Any]]] = None
    checklists: Optional[Dict[str, Any]] = None


class MilestoneToggleRequest(BaseModel):
    milestone_id: str
    completed: bool


class EventResponse(EventBase):
    id: str
    club_id: str
    created_by_id: Optional[str] = None
    slug: str
    status: EventStatus
    timeline: List[Dict[str, Any]] = Field(default_factory=list)
    checklists: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    days_until_event: int = 0
    progress_percent: int = 0

    class Config:
        from_attributes = True


class AIPlanRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    event_type: EventType = EventType.WORKSHOP
    duration_days: int = Field(default=1, ge=1, le=14)
    expected_attendees: int = Field(default=100, ge=10, le=10000)
    focus_areas: Optional[str] = None


class AIPlanResponse(BaseModel):
    suggested_description: str
    suggested_budget: float
    timeline: List[Dict[str, Any]]
    checklists: Dict[str, Any]
