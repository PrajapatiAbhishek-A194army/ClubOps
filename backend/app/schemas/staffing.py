from typing import List, Optional
from pydantic import BaseModel, Field


class SkillRequirementItem(BaseModel):
    skill_name: str
    required_count: int
    assigned_count: int = 0


class SuggestedTaskAssignment(BaseModel):
    task_title: str
    task_description: Optional[str] = None
    priority: str = "MEDIUM"  # LOW, MEDIUM, HIGH, CRITICAL
    due_datetime: Optional[str] = None
    required_skill: Optional[str] = None
    suggested_volunteer_id: Optional[str] = None
    suggested_volunteer_name: Optional[str] = None
    match_reason: Optional[str] = None
    skill_match_pct: Optional[int] = None


class AIEventPlanResponse(BaseModel):
    event_id: str
    min_volunteers_required: int
    skill_requirements: List[SkillRequirementItem]
    proposed_tasks: List[SuggestedTaskAssignment]
    ai_explanation: str


class ApprovePlanRequest(BaseModel):
    tasks: List[SuggestedTaskAssignment]
    dispatch_notifications: bool = True
