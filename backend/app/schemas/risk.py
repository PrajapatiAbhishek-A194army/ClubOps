from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.risk import RiskSeverity, RiskStatus, RiskSource


class RiskResponse(BaseModel):
    id: str
    event_id: str
    related_task_id: Optional[str] = None
    title: str
    description: str
    severity: RiskSeverity
    status: RiskStatus
    source: RiskSource
    detected_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RiskResolveRequest(BaseModel):
    status: RiskStatus = RiskStatus.RESOLVED
