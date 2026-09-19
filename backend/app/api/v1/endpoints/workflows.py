import logging
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_club_role
from app.models.club import ClubRole
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.workflow import WorkflowExecuteRequest, WorkflowExecutionResponse
from app.workflows.event_workflow import WorkflowExecutionService

logger = logging.getLogger(__name__)

router = APIRouter()

LEADERSHIP_ROLES = [
    ClubRole.PRESIDENT,
    ClubRole.CLUB_HEAD,
    getattr(ClubRole, "ORGANIZER", ClubRole.CLUB_HEAD),
]


@router.post(
    "/clubs/{club_id}/workflows/execute",
    response_model=ApiResponse[WorkflowExecutionResponse],
    status_code=status.HTTP_200_OK,
)
def execute_ai_workflow(
    club_id: str,
    req: WorkflowExecuteRequest,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(LEADERSHIP_ROLES)),
    db: Session = Depends(get_db),
):
    """
    Executes an autonomous AI operations workflow using LangGraph, LangChain tool calling,
    and Groq LLM. Extracts tasks, detects owners and deadlines, assigns volunteers,
    runs risk checks, and updates the dashboard without direct SQL access.
    """
    try:
        result = WorkflowExecutionService.execute_workflow(
            db=db,
            club_id=club_id,
            actor_id=current_user.id,
            input_text=req.prompt,
            event_id=req.event_id,
        )
    except Exception as e:
        logger.error(f"Workflow execution failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI Workflow execution failed: {str(e)}",
        )

    return ApiResponse(
        success=True,
        data=WorkflowExecutionResponse(**result),
        message=f"Workflow executed successfully: Stage {result['current_stage']}",
    )


@router.get(
    "/clubs/{club_id}/workflows/stages",
    response_model=ApiResponse[List[str]],
)
def list_workflow_stages(
    club_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns the ordered stages of the LangGraph workflow state machine."""
    stages = [
        "NEW",
        "AI_PROCESSED",
        "TASKS_CREATED",
        "ASSIGNED",
        "IN_PROGRESS",
        "COMPLETED",
        "KNOWLEDGE_ARCHIVED",
    ]
    return ApiResponse(
        success=True,
        data=stages,
        message="Workflow lifecycle stages retrieved",
    )
