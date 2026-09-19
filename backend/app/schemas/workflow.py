from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class WorkflowExecuteRequest(BaseModel):
    prompt: str = Field(..., min_length=3, description="Operational command, directive, or meeting transcript excerpt")
    event_id: Optional[str] = Field(None, description="Optional associated event ID")


class WorkflowToolCallTrace(BaseModel):
    timestamp: str
    tool: str
    args: Dict[str, Any]
    result_summary: str


class WorkflowExecutionResponse(BaseModel):
    club_id: str
    current_stage: str
    extracted_tasks: List[Dict[str, Any]] = Field(default_factory=list)
    assigned_volunteers: List[Dict[str, Any]] = Field(default_factory=list)
    audit_trail: List[Dict[str, Any]] = Field(default_factory=list)
    final_summary: str
