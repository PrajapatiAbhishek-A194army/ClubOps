from typing import List, Optional
from pydantic import BaseModel, Field


class SkillRequirementItem(BaseModel):
    skill_name: str
    required_count: int
    assigned_count: int = 0


class SuggestedTaskAssignment(BaseModel):
    task_id: Optional[str] = None
    task_title: str
    task_description: Optional[str] = None
    priority: str = "MEDIUM"  # LOW, MEDIUM, HIGH, CRITICAL
    due_datetime: Optional[str] = None
    required_skill: Optional[str] = None
    suggested_volunteer_id: Optional[str] = None
    suggested_volunteer_name: Optional[str] = None
    match_reason: Optional[str] = None
    skill_match_pct: Optional[int] = None
    status: Optional[str] = "TODO"
    # Which milestone (from event.timeline[].id) this task belongs to
    milestone_id: Optional[str] = None
    milestone_title: Optional[str] = None


class AIEventPlanResponse(BaseModel):
    event_id: str
    min_volunteers_required: int
    skill_requirements: List[SkillRequirementItem]
    proposed_tasks: List[SuggestedTaskAssignment]
    ai_explanation: str
    is_approved: bool = False
    approved_at: Optional[str] = None
    task_count: int = 0
    completed_task_count: int = 0


class ApprovePlanRequest(BaseModel):
    tasks: Optional[List[SuggestedTaskAssignment]] = None
    dispatch_notifications: bool = True
