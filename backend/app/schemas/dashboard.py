from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class EventMini(BaseModel):
    id: str
    title: str
    start_date: Optional[datetime] = None
    location: Optional[str] = None
    status: str
    progress_percent: int = 0
    days_until_event: int = 0

    model_config = ConfigDict(from_attributes=True)


class TaskMini(BaseModel):
    id: str
    title: str
    priority: str
    status: str
    due_datetime: Optional[datetime] = None
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    event_id: Optional[str] = None
    event_title: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ActionItemMini(BaseModel):
    id: str
    task_description: str
    suggested_owner: Optional[str] = None
    priority: str
    status: str
    meeting_title: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AnnouncementMini(BaseModel):
    id: str
    title: str
    category: str
    target_channel: str
    published_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PresidentDashboardData(BaseModel):
    active_events: List[EventMini] = []
    pending_join_requests_count: int = 0
    pending_announcements_count: int = 0
    total_tasks_count: int = 0
    completed_tasks_count: int = 0
    task_completion_rate: float = 0.0
    total_volunteers_count: int = 0
    total_risks_count: int = 0
    critical_risks_count: int = 0
    recent_risks: List[Dict[str, Any]] = []


class ClubHeadDashboardData(BaseModel):
    today_tasks: List[TaskMini] = []
    upcoming_tasks: List[TaskMini] = []
    total_active_events: int = 0
    volunteer_availability_stats: Dict[str, int] = {
        "available": 0,
        "busy": 0,
        "checked_in": 0,
        "total": 0,
    }
    meeting_action_items: List[ActionItemMini] = []
    recent_announcements: List[AnnouncementMini] = []


OrganizerDashboardData = ClubHeadDashboardData


class TeamMemberWorkload(BaseModel):
    user_id: str
    full_name: str
    role: str
    assigned_tasks_count: int = 0
    completed_tasks_count: int = 0
    in_progress_count: int = 0


class TeamLeadDashboardData(BaseModel):
    team_workload: List[TeamMemberWorkload] = []
    blocked_tasks: List[TaskMini] = []
    upcoming_deadlines: List[TaskMini] = []
    department_stats: Dict[str, Any] = {
        "total_squad_tasks": 0,
        "blocked_count": 0,
        "in_progress_count": 0,
        "completed_count": 0,
    }


class VolunteerDashboardData(BaseModel):
    my_tasks: List[TaskMini] = []
    my_checkin_status: str = "NOT_CHECKED_IN"
    today_shifts: List[Dict[str, Any]] = []
    active_event: Optional[EventMini] = None
    recent_announcements: List[AnnouncementMini] = []


class VolunteerCheckInRequest(BaseModel):
    status: str = Field("CHECKED_IN", description="CHECKED_IN or NOT_CHECKED_IN")
    event_id: Optional[str] = None


class UnifiedDashboardResponse(BaseModel):
    perspective: str
    club_id: str
    club_name: str
    data: Dict[str, Any]
