from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

from app.models.volunteer import AvailabilityStatus, CheckInStatus


# Standard skill taxonomy suggestions for frontend tags
STANDARD_SKILL_CATEGORIES = {
    "Technical": [
        "Audio / Visual (AV)",
        "Network & Wi-Fi Setup",
        "Python / Backend",
        "Web & Frontend",
        "Hardware & Robotics",
        "Cloud & DevOps",
    ],
    "Logistics": [
        "Registration Desk",
        "Crowd Management",
        "Stage Setup & Mic Testing",
        "Food & Catering",
        "Equipment Transport",
    ],
    "Design & Media": [
        "Photography",
        "Videography",
        "Graphic Design",
        "Social Media & Live PR",
        "Emcee & Anchoring",
    ],
    "Administration": [
        "Speaker Liaison",
        "VIP Hospitality",
        "First Aid & Safety",
        "Sponsor Coordinator",
    ],
}


class AssignedTaskBrief(BaseModel):
    id: str
    title: str
    status: str
    priority: str
    deadline: Optional[datetime] = None
    event_title: Optional[str] = None


class VolunteerBase(BaseModel):
    skills: List[str] = []
    department: str = "General Operations"
    availability_status: AvailabilityStatus = AvailabilityStatus.AVAILABLE
    availability_notes: Optional[str] = None
    available_hours_per_week: int = 10
    phone_number: Optional[str] = None


class VolunteerCreate(VolunteerBase):
    user_id: str


class VolunteerUpdate(BaseModel):
    skills: Optional[List[str]] = None
    department: Optional[str] = None
    availability_status: Optional[AvailabilityStatus] = None
    availability_notes: Optional[str] = None
    available_hours_per_week: Optional[int] = None
    phone_number: Optional[str] = None


class VolunteerAvailabilityUpdate(BaseModel):
    availability_status: AvailabilityStatus
    availability_notes: Optional[str] = None


class VolunteerCheckInUpdate(BaseModel):
    check_in_status: CheckInStatus


class VolunteerResponse(BaseModel):
    id: str
    club_id: str
    user_id: str
    full_name: str
    email: str
    avatar_url: Optional[str] = None
    role: str
    skills: List[str]
    department: str
    availability_status: AvailabilityStatus
    availability_notes: Optional[str] = None
    available_hours_per_week: int
    check_in_status: CheckInStatus
    checked_in_at: Optional[datetime] = None
    phone_number: Optional[str] = None
    rating: float
    active_tasks_count: int = 0
    completed_tasks_count: int = 0
    assigned_tasks: List[AssignedTaskBrief] = []
    created_at: datetime
    updated_at: datetime


class AIVolunteerMatchRequest(BaseModel):
    task_id: Optional[str] = None
    task_title: Optional[str] = None
    task_description: Optional[str] = None
    required_skills: List[str] = Field(default_factory=list)
    event_id: Optional[str] = None


class AIVolunteerMatchItem(BaseModel):
    volunteer_id: str
    user_id: str
    full_name: str
    avatar_url: Optional[str] = None
    match_score: int  # 0 to 100
    matching_skills: List[str]
    match_rationale: str
    availability_status: AvailabilityStatus
    active_tasks_count: int
    department: str


class AIVolunteerMatchResponse(BaseModel):
    task_title: str
    required_skills: List[str]
    recommendations: List[AIVolunteerMatchItem]
    summary: str


class VolunteerAssignRequest(BaseModel):
    task_id: str
    volunteer_user_id: str
