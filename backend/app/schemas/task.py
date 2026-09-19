from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.task import TaskPriority, TaskStatus


class UserSummary(BaseModel):
    id: str
    full_name: str
    email: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class EventSummary(BaseModel):
    id: str
    title: str
    slug: str

    class Config:
        from_attributes = True


class DependencySummary(BaseModel):
    id: str
    title: str
    status: TaskStatus

    class Config:
        from_attributes = True


class TaskBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    deadline: Optional[datetime] = None
    event_id: Optional[str] = None
    assignee_id: Optional[str] = None
    depends_on_task_id: Optional[str] = None


class TaskCreate(TaskBase):
    status: TaskStatus = TaskStatus.TODO


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    deadline: Optional[datetime] = None
    event_id: Optional[str] = None
    assignee_id: Optional[str] = None
    depends_on_task_id: Optional[str] = None


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


class TaskResponse(TaskBase):
    id: str
    club_id: str
    creator_id: Optional[str] = None
    status: TaskStatus
    created_at: datetime
    updated_at: datetime
    
    # Enriched computed properties
    assignee: Optional[UserSummary] = None
    event: Optional[EventSummary] = None
    depends_on: Optional[DependencySummary] = None
    is_blocked: bool = False
    blocking_reason: Optional[str] = None

    class Config:
        from_attributes = True


class AITaskSuggestRequest(BaseModel):
    event_id: Optional[str] = None
    goal_description: str = Field(..., min_length=3, max_length=500)
    committee_area: Optional[str] = "General Operations"


class AITaskSuggestItem(BaseModel):
    title: str
    description: str
    priority: TaskPriority = TaskPriority.MEDIUM
    suggested_role: str = "Lead"
    suggested_timeline: str = "1 Week Prior"


class AITaskSuggestResponse(BaseModel):
    tasks: List[AITaskSuggestItem]
