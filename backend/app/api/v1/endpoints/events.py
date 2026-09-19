from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_club_role
from app.models.club import ClubRole
from app.models.event import Event, EventStatus
from app.models.task import AssignmentSource, AssignmentStatus, Task, TaskAssignment, TaskCreatedSource, TaskPriority, TaskStatus
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
from app.schemas.staffing import AIEventPlanResponse, ApprovePlanRequest
from app.services.event_service import EventService
from app.services.notification_service import NotificationService
from app.services.staffing_service import StaffingService

router = APIRouter()

LEADERSHIP_ROLES = [ClubRole.PRESIDENT, ClubRole.CLUB_HEAD, getattr(ClubRole, "ORGANIZER", ClubRole.CLUB_HEAD)]
ALL_ROLES = [ClubRole.PRESIDENT, ClubRole.CLUB_HEAD, ClubRole.VOLUNTEER, ClubRole.MEMBER, getattr(ClubRole, "ORGANIZER", ClubRole.CLUB_HEAD), getattr(ClubRole, "TEAM_LEAD", ClubRole.VOLUNTEER)]


@router.get("/clubs/{club_id}/events", response_model=ApiResponse[List[EventResponse]])
def list_events(
    club_id: str,
    status: Optional[EventStatus] = Query(None, description="Filter events by operational status"),
    search: Optional[str] = Query(None, description="Search events by title, venue, or description"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(ALL_ROLES)),
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
    membership=Depends(require_club_role(LEADERSHIP_ROLES)),
    db: Session = Depends(get_db),
):
    """Creates a new campus event."""
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


@router.post("/clubs/{club_id}/events/plan-ai", response_model=ApiResponse[AIPlanResponse])
def plan_event_with_ai(
    club_id: str,
    plan_req: AIPlanRequest,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(LEADERSHIP_ROLES)),
    db: Session = Depends(get_db),
):
    """Generates an AI event plan using Groq LLM with deterministic fallback."""
    plan = EventService.generate_ai_plan(plan_req)
    return ApiResponse(
        success=True,
        data=plan,
        message="AI event plan generated successfully",
    )


@router.get("/clubs/{club_id}/events/{event_id}", response_model=ApiResponse[EventResponse])
def get_event(
    club_id: str,
    event_id: str,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(ALL_ROLES)),
    db: Session = Depends(get_db),
):
    """Retrieves full details for a single event."""
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
    membership=Depends(require_club_role(LEADERSHIP_ROLES)),
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
    toggle_req: MilestoneToggleRequest,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(LEADERSHIP_ROLES)),
    db: Session = Depends(get_db),
):
    """Toggles completion state of an event timeline milestone."""
    event = EventService.get_event_by_id(db=db, event_id=event_id, club_id=club_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found in this club")

    try:
        updated = EventService.toggle_milestone(
            db=db,
            event=event,
            milestone_id=toggle_req.milestone_id,
            completed=toggle_req.completed,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return ApiResponse(
        success=True,
        data=EventResponse.model_validate(updated),
        message="Milestone updated successfully",
    )


@router.get("/clubs/{club_id}/events/{event_id}/staffing-plan", response_model=ApiResponse[AIEventPlanResponse])
@router.post("/clubs/{club_id}/events/{event_id}/staffing-plan", response_model=ApiResponse[AIEventPlanResponse])
def generate_staffing_plan(
    club_id: str,
    event_id: str,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(LEADERSHIP_ROLES)),
    db: Session = Depends(get_db),
):
    """
    AI Event Planning & Staffing Estimator:
    - Calculates minimum volunteers required.
    - Calculates count of volunteers required with particular skills.
    - Matches proposed tasks to eligible club volunteers based on skills and availability.
    """
    event = EventService.get_event_by_id(db=db, event_id=event_id, club_id=club_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found in this club")

    plan = StaffingService.estimate_event_staffing_and_plan(db=db, event=event)
    return ApiResponse(
        success=True,
        data=plan,
        message="AI staffing estimation and candidate proposal generated",
    )


@router.post("/clubs/{club_id}/events/{event_id}/approve-plan", response_model=ApiResponse[dict])
def approve_staffing_plan(
    club_id: str,
    event_id: str,
    approve_req: ApprovePlanRequest,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(LEADERSHIP_ROLES)),
    db: Session = Depends(get_db),
):
    """
    Approves the AI staffing plan:
    - Creates tasks in the database.
    - Assigns volunteers with auditable TaskAssignment records.
    - Dispatches notifications to all club volunteers about the event.
    - Dispatches notifications to assigned volunteers about their tasks.
    - Updates event status to PLANNED.
    """
    event = EventService.get_event_by_id(db=db, event_id=event_id, club_id=club_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found in this club")

    created_task_count = 0
    assigned_volunteers = []

    for item in approve_req.tasks:
        priority_enum = TaskPriority.MEDIUM
        try:
            priority_enum = TaskPriority(item.priority.upper())
        except Exception:
            pass

        due_date = None
        if item.due_datetime:
            try:
                due_date = datetime.fromisoformat(item.due_datetime.replace("Z", "+00:00")).replace(tzinfo=None)
            except Exception:
                due_date = event.start_date

        task = Task(
            club_id=club_id,
            event_id=event.id,
            creator_id=current_user.id,
            title=item.task_title,
            description=item.task_description or "",
            priority=priority_enum,
            status=TaskStatus.TODO,
            due_datetime=due_date,
            created_source=TaskCreatedSource.AI,
        )
        db.add(task)
        db.flush()
        created_task_count += 1

        if item.suggested_volunteer_id:
            assignment = TaskAssignment(
                task_id=task.id,
                user_id=item.suggested_volunteer_id,
                assigned_by_id=current_user.id,
                assignment_source=AssignmentSource.AI_APPROVED,
                status=AssignmentStatus.ASSIGNED,
            )
            db.add(assignment)
            db.flush()

            if approve_req.dispatch_notifications:
                NotificationService.dispatch_task_assigned(
                    db=db,
                    task=task,
                    assignee_id=item.suggested_volunteer_id,
                    assigner_name=current_user.full_name,
                )
                assigned_volunteers.append(item.suggested_volunteer_id)

    event.status = EventStatus.PLANNED
    db.commit()

    # Dispatch event creation alert to all club volunteers
    if approve_req.dispatch_notifications:
        NotificationService.dispatch_event_created(db=db, event=event)

    return ApiResponse(
        success=True,
        data={
            "created_tasks": created_task_count,
            "assigned_volunteers": len(assigned_volunteers),
            "event_status": event.status.value,
        },
        message=f"Plan approved: {created_task_count} tasks created and notifications sent to volunteers",
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
