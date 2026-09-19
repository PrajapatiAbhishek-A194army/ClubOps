from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from app.models.audit import AuditResult, AuditSource


class AuditLogEntry(BaseModel):
    id: str
    club_id: Optional[str] = None
    actor_user_id: Optional[str] = None
    actor_name: Optional[str] = None
    actor_email: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    entity_type: str
    entity_id: str
    source: AuditSource
    result: AuditResult
    diff_payload: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    prev_hash: Optional[str] = None
    integrity_hash: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChainIntegrityReport(BaseModel):
    club_id: str
    total_records: int
    verified_records: int
    is_valid: bool
    chain_head_hash: Optional[str] = None
    broken_at_id: Optional[str] = None
    verification_message: str
    verified_at: str


class GovernanceRule(BaseModel):
    operation: str
    category: str
    description: str
    president: str  # "ALLOW", "DENY", "APPROVAL_REQUIRED"
    organizer: str
    team_lead: str
    volunteer: str
    member: str
    requires_dual_approval: bool = False


class GovernanceMatrixResponse(BaseModel):
    club_id: str
    policy_name: str
    security_model: str  # "DENY_BY_DEFAULT"
    rules: List[GovernanceRule]


class SecuritySummaryResponse(BaseModel):
    club_id: str
    total_events_logged: int
    denied_access_attempts: int
    integrity_status: str
    last_audit_timestamp: Optional[str] = None
