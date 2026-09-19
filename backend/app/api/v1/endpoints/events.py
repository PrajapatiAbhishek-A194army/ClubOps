from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_club_role
from app.models.club import ClubRole
from app.models.event import EventStatus
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.event import (
    AIPlanRequest,
    AIPlanResponse,
    EventCreate,
    EventResponse,
    EventUpdate,
    MilestoneToggleRequest,
)
from app.services.event_service import EventService

router = APIRouter()


@router.get("/clubs/{club_id}/events", response_model=ApiResponse[List[EventResponse]])
def list_events(
    club_id: str,
    status: Optional[EventStatus] = Query(None, description="Filter events by operational status"),
    search: Optional[str] = Query(None, description="Search events by title, venue, or description"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role([ClubRole.PRESIDENT, ClubRole.ORGANIZER, ClubRole.TEAM_LEAD, ClubRole.VOLUNTEER, ClubRole.MEMBER])),
    db: Session = Depends(get_db),
):
    """Lists all events belonging to the specified club."""
    events = EventService.get_club_events(
        db=db,
        club_id=club_id,
        status=status,
        search=search,
        skip=skip,
        limit=limit,
    )
    return ApiResponse(
        success=True,
        data=[EventResponse.model_validate(e) for e in events],
        message="Club events retrieved",
    )


@router.post("/clubs/{club_id}/events", response_model=ApiResponse[EventResponse], status_code=status.HTTP_201_CREATED)
def create_event(
    club_id: str,
    event_in: EventCreate,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role([ClubRole.PRESIDENT, ClubRole.ORGANIZER])),
    db: Session = Depends(get_db),
):
    """Creates a new campus event with automated initial milestones and operational checklists."""
    try:
        event = EventService.create_event(
            db=db,
            club_id=club_id,
            creator_id=current_user.id,
            event_in=event_in,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return ApiResponse(
        success=True,
        data=EventResponse.model_validate(event),
        message=f"Event '{event.title}' successfully created",
    )


@router.get("/clubs/{club_id}/events/{event_id}", response_model=ApiResponse[EventResponse])
def get_event(
    club_id: str,
    event_id: str,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role([ClubRole.PRESIDENT, ClubRole.ORGANIZER, ClubRole.TEAM_LEAD, ClubRole.VOLUNTEER, ClubRole.MEMBER])),
    db: Session = Depends(get_db),
):
    """Retrieves full details, live milestone progress, and checklists for a single event."""
    event = EventService.get_event_by_id(db=db, event_id=event_id, club_id=club_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found in this club")

    return ApiResponse(
        success=True,
        data=EventResponse.model_validate(event),
    )


@router.put("/clubs/{club_id}/events/{event_id}", response_model=ApiResponse[EventResponse])
def update_event(
    club_id: str,
    event_id: str,
    event_update: EventUpdate,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role([ClubRole.PRESIDENT, ClubRole.ORGANIZER])),
    db: Session = Depends(get_db),
):
    """Updates event details, budget, dates, location, or status."""
    event = EventService.get_event_by_id(db=db, event_id=event_id, club_id=club_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found in this club")

    try:
        updated = EventService.update_event(db=db, event=event, event_update=event_update)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return ApiResponse(
        success=True,
        data=EventResponse.model_validate(updated),
        message=f"Event '{updated.title}' updated",
    )


@router.patch("/clubs/{club_id}/events/{event_id}/milestones", response_model=ApiResponse[EventResponse])
def toggle_milestone(
    club_id: str,
    event_id: str,
    req: MilestoneToggleRequest,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role([ClubRole.PRESIDENT, ClubRole.ORGANIZER, ClubRole.TEAM_LEAD])),
    db: Session = Depends(get_db),
):
    """Toggles milestone completion status and recalculates event overall health."""
    event = EventService.get_event_by_id(db=db, event_id=event_id, club_id=club_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found in this club")

    try:
        updated = EventService.toggle_milestone(
            db=db,
            event=event,
            milestone_id=req.milestone_id,
            completed=req.completed,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return ApiResponse(
        success=True,
        data=EventResponse.model_validate(updated),
        message="Milestone updated successfully",
    )


@router.delete("/clubs/{club_id}/events/{event_id}", response_model=ApiResponse[dict])
def delete_event(
    club_id: str,
    event_id: str,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role([ClubRole.PRESIDENT])),
    db: Session = Depends(get_db),
):
    """Deletes an event (Restricted to Club President)."""
    event = EventService.get_event_by_id(db=db, event_id=event_id, club_id=club_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found in this club")

    title = event.title
    EventService.delete_event(db=db, event=event)

    return ApiResponse(
        success=True,
        data={"deleted_event_id": event_id},
        message=f"Event '{title}' deleted",
    )


@router.post("/clubs/{club_id}/events/plan-ai", response_model=ApiResponse[AIPlanResponse])
def plan_event_with_ai(
    club_id: str,
    plan_req: AIPlanRequest,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role([ClubRole.PRESIDENT, ClubRole.ORGANIZER])),
):
    """Calls AI planner (Groq Llama 3.3) to formulate timeline milestones and operational checklists."""
    plan = EventService.generate_ai_plan(plan_req)
    return ApiResponse(
        success=True,
        data=plan,
        message="AI operational event plan generated successfully",
    )
