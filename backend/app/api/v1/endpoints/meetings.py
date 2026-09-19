from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.meeting import Meeting
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.meeting import ConvertActionItemsRequest, MeetingCreate, MeetingResponse
from app.services.meeting_service import MeetingService

router = APIRouter()


@router.post("", response_model=ApiResponse[MeetingResponse], status_code=status.HTTP_201_CREATED)
def create_meeting_and_extract(
    club_id: str = Query(..., description="Club ID"),
    meeting_in: MeetingCreate = ...,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Ingests meeting transcript/notes and triggers AI action item extraction.
    """
    meeting_resp = MeetingService.create_and_process_meeting(
        db=db,
        club_id=club_id,
        user_id=current_user.id,
        title=meeting_in.title,
        transcript_text=meeting_in.transcript_text,
        event_id=meeting_in.event_id,
        meeting_date=meeting_in.meeting_date,
    )
    return ApiResponse(
        success=True,
        data=meeting_resp,
        message="Meeting transcript processed and action items extracted",
    )


@router.get("", response_model=ApiResponse[List[MeetingResponse]])
def list_club_meetings(
    club_id: str = Query(..., description="Club ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists recent meetings and parsed action items."""
    meetings = (
        db.query(Meeting)
        .filter(Meeting.club_id == club_id)
        .order_by(Meeting.created_at.desc())
        .all()
    )
    return ApiResponse(
        success=True,
        data=[MeetingResponse.model_validate(m) for m in meetings],
        message="Meetings retrieved",
    )


@router.post("/{meeting_id}/convert-items", response_model=ApiResponse[dict])
def convert_action_items(
    meeting_id: str,
    req: ConvertActionItemsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Converts approved extracted action items directly into atomic tasks on the Kanban board.
    """
    try:
        tasks = MeetingService.convert_action_items_to_tasks(
            db=db,
            meeting_id=meeting_id,
            action_item_ids=req.action_item_ids,
            creator_id=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return ApiResponse(
        success=True,
        data={"converted_task_count": len(tasks), "task_ids": [t.id for t in tasks]},
        message=f"Converted {len(tasks)} action items into active Kanban tasks",
    )
