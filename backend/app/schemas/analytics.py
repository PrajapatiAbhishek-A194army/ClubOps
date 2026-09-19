from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class HealthScoreComponent(BaseModel):
    name: str
    weight_pct: int
    score: float
    max_score: float
    impact_note: str


class ClubHealthScore(BaseModel):
    overall_score: int = Field(..., ge=0, le=100)
    status_tier: str  # "EXCELLENT", "HEALTHY", "NEEDS_ATTENTION", "CRITICAL"
    status_label: str
    summary_message: str
    components: List[HealthScoreComponent]


class EventCadenceItem(BaseModel):
    month: str
    total_events: int
    completed: int
    on_track: int
    at_risk: int


class TaskStatusDistribution(BaseModel):
    status: str
    count: int
    percentage: float


class PriorityDistribution(BaseModel):
    priority: str
    count: int


class VolunteerLeaderboardItem(BaseModel):
    user_id: str
    full_name: str
    email: str
    role: str
    tasks_completed: int
    events_attended: int
    engagement_points: int


class RiskSeverityCount(BaseModel):
    severity: str
    count: int
    percentage: float


class AIExecutiveSummary(BaseModel):
    health_assessment: str
    operational_strengths: List[str]
    critical_bottlenecks: List[str]
    actionable_recommendations: List[str]
    generated_at: str


class FullAnalyticsReportResponse(BaseModel):
    club_id: str
    club_name: str
    generated_at: str
    total_events: int
    total_tasks: int
    total_volunteers: int
    active_risks_count: int
    health_score: ClubHealthScore
    event_cadence: List[EventCadenceItem]
    task_distribution: List[TaskStatusDistribution]
    priority_distribution: List[PriorityDistribution]
    volunteer_leaderboard: List[VolunteerLeaderboardItem]
    risk_breakdown: List[RiskSeverityCount]
    ai_insights: Optional[AIExecutiveSummary] = None
