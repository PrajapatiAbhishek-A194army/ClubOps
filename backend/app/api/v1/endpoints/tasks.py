from datetime import datetime
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_club_role
from app.models.club import ClubMembership, ClubRole, MembershipStatus
from app.models.task import AssignmentSource, AssignmentStatus, Task, TaskAssignment, TaskPriority, TaskStatus
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.task import (
    AITaskSuggestRequest,
    AITaskSuggestResponse,
    TaskCreate,
    TaskResponse,
    TaskStatusUpdate,
    TaskUpdate,
)
from app.services.notification_service import NotificationService
from app.services.task_service import TaskService, enrich_task_response

router = APIRouter()

ALL_ROLES = [ClubRole.PRESIDENT, ClubRole.CLUB_HEAD, ClubRole.VOLUNTEER, ClubRole.MEMBER, getattr(ClubRole, "ORGANIZER", ClubRole.CLUB_HEAD), getattr(ClubRole, "TEAM_LEAD", ClubRole.VOLUNTEER)]
LEADERSHIP_ROLES = [ClubRole.PRESIDENT, ClubRole.CLUB_HEAD, getattr(ClubRole, "ORGANIZER", ClubRole.CLUB_HEAD), getattr(ClubRole, "TEAM_LEAD", ClubRole.VOLUNTEER)]


class TaskAssignRequest(BaseModel):
    user_id: str


class KanbanBoardResponse(BaseModel):
    todo: List[TaskResponse]
    in_progress: List[TaskResponse]
    blocked: List[TaskResponse]
    completed: List[TaskResponse]
    metrics: Dict[str, float]


@router.get("/clubs/{club_id}/tasks", response_model=ApiResponse[List[TaskResponse]])
def list_tasks(
    club_id: str,
    event_id: Optional[str] = Query(None, description="Filter tasks by event"),
    assignee_id: Optional[str] = Query(None, description="Filter tasks by assignee user ID"),
    status: Optional[TaskStatus] = Query(None, description="Filter tasks by status"),
    priority: Optional[TaskPriority] = Query(None, description="Filter tasks by priority"),
    search: Optional[str] = Query(None, description="Search tasks by title or description"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(ALL_ROLES)),
    db: Session = Depends(get_db),
):
    """Retrieves club tasks with dependency indicators and assignee info."""
    tasks = TaskService.get_club_tasks(
        db=db,
        club_id=club_id,
        event_id=event_id,
        assignee_id=assignee_id,
        status=status,
        priority=priority,
        search=search,
        skip=skip,
        limit=limit,
    )
    return ApiResponse(
        success=True,
        data=tasks,
        message="Club tasks retrieved successfully",
    )


@router.get("/clubs/{club_id}/tasks/board", response_model=ApiResponse[KanbanBoardResponse])
def get_kanban_board(
    club_id: str,
    event_id: Optional[str] = Query(None, description="Filter board by event"),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(ALL_ROLES)),
    db: Session = Depends(get_db),
):
    """
    Visual Kanban Progression Board:
    Categorizes tasks into TODO, IN_PROGRESS, BLOCKED, COMPLETED with live metrics.
    """
    tasks = TaskService.get_club_tasks(
        db=db,
        club_id=club_id,
        event_id=event_id,
        limit=300,
    )

    todo_col = []
    in_progress_col = []
    blocked_col = []
    completed_col = []

    now = datetime.utcnow()
    overdue_count = 0

    for t in tasks:
        # Check overdue
        if t.status != TaskStatus.COMPLETED and t.deadline and t.deadline < now:
            overdue_count += 1

        if t.is_blocked or t.status == TaskStatus.BLOCKED:
            blocked_col.append(t)
        elif t.status == TaskStatus.IN_PROGRESS:
            in_progress_col.append(t)
        elif t.status == TaskStatus.COMPLETED:
            completed_col.append(t)
        else:
            todo_col.append(t)

    total = len(tasks)
    completed_count = len(completed_col)
    pct = round((completed_count / total * 100), 1) if total > 0 else 0.0

    board = KanbanBoardResponse(
        todo=todo_col,
        in_progress=in_progress_col,
        blocked=blocked_col,
        completed=completed_col,
        metrics={
            "total_tasks": float(total),
            "completed_count": float(completed_count),
            "in_progress_count": float(len(in_progress_col)),
            "blocked_count": float(len(blocked_col)),
            "overdue_count": float(overdue_count),
            "completion_percentage": pct,
        },
    )

    return ApiResponse(
        success=True,
        data=board,
        message="Kanban board progression data retrieved",
    )


@router.post("/clubs/{club_id}/tasks", response_model=ApiResponse[TaskResponse], status_code=status.HTTP_201_CREATED)
def create_task(
    club_id: str,
    task_in: TaskCreate,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(LEADERSHIP_ROLES)),
    db: Session = Depends(get_db),
):
    """Creates a new task and dispatches notification if assigned."""
    try:
        task_resp = TaskService.create_task(
            db=db,
            club_id=club_id,
            creator_id=current_user.id,
            task_in=task_in,
        )
        if task_in.assignee_id:
            raw_task = db.query(Task).filter(Task.id == task_resp.id).first()
            if raw_task:
                NotificationService.dispatch_task_assigned(
                    db=db,
                    task=raw_task,
                    assignee_id=task_in.assignee_id,
                    assigner_name=current_user.full_name,
                )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return ApiResponse(
        success=True,
        data=task_resp,
        message=f"Task '{task_resp.title}' created successfully",
    )


@router.post("/clubs/{club_id}/tasks/{task_id}/assign", response_model=ApiResponse[TaskResponse])
def assign_task(
    club_id: str,
    task_id: str,
    assign_in: TaskAssignRequest,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(LEADERSHIP_ROLES)),
    db: Session = Depends(get_db),
):
    """
    Assigns task to a volunteer:
    - Validates membership and availability
    - Creates auditable TaskAssignment
    - Dispatches instant notification to the volunteer
    """
    task = TaskService.get_task_by_id(db=db, task_id=task_id, club_id=club_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found in this club")

    target_membership = (
        db.query(ClubMembership)
        .filter(
            ClubMembership.club_id == club_id,
            ClubMembership.user_id == assign_in.user_id,
            ClubMembership.status == MembershipStatus.ACTIVE,
        )
        .first()
    )
    if not target_membership:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assignee is not an active club member")

    task.assignee_id = assign_in.user_id
    assignment = TaskAssignment(
        task_id=task.id,
        user_id=assign_in.user_id,
        assigned_by_id=current_user.id,
        assignment_source=AssignmentSource.MANUAL,
        status=AssignmentStatus.ASSIGNED,
    )
    db.add(assignment)
    db.commit()
    db.refresh(task)

    # Dispatch notification to volunteer
    NotificationService.dispatch_task_assigned(
        db=db,
        task=task,
        assignee_id=assign_in.user_id,
        assigner_name=current_user.full_name,
    )

    return ApiResponse(
        success=True,
        data=enrich_task_response(task),
        message=f"Task assigned and notification dispatched to volunteer",
    )


@router.get("/clubs/{club_id}/tasks/{task_id}", response_model=ApiResponse[TaskResponse])
def get_task(
    club_id: str,
    task_id: str,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(ALL_ROLES)),
    db: Session = Depends(get_db),
):
    """Retrieves a single task's full details and dependency status."""
    task = TaskService.get_task_by_id(db=db, task_id=task_id, club_id=club_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found in this club")

    return ApiResponse(
        success=True,
        data=enrich_task_response(task),
    )


@router.put("/clubs/{club_id}/tasks/{task_id}", response_model=ApiResponse[TaskResponse])
def update_task(
    club_id: str,
    task_id: str,
    task_update: TaskUpdate,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(LEADERSHIP_ROLES)),
    db: Session = Depends(get_db),
):
    """Updates task properties, owner assignment, deadline, or dependency."""
    task = TaskService.get_task_by_id(db=db, task_id=task_id, club_id=club_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found in this club")

    try:
        updated = TaskService.update_task(db=db, task=task, task_update=task_update)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return ApiResponse(
        success=True,
        data=updated,
        message="Task updated successfully",
    )


@router.patch("/clubs/{club_id}/tasks/{task_id}/status", response_model=ApiResponse[TaskResponse])
def update_task_status(
    club_id: str,
    task_id: str,
    status_in: TaskStatusUpdate,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(ALL_ROLES)),
    db: Session = Depends(get_db),
):
    """Moves a task between Kanban columns (TODO, IN_PROGRESS, BLOCKED, COMPLETED)."""
    task = TaskService.get_task_by_id(db=db, task_id=task_id, club_id=club_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found in this club")

    updated = TaskService.update_task_status(db=db, task=task, status_update=status_in)

    return ApiResponse(
        success=True,
        data=updated,
        message=f"Task moved to {status_in.status.value}",
    )


@router.delete("/clubs/{club_id}/tasks/{task_id}", response_model=ApiResponse[dict])
def delete_task(
    club_id: str,
    task_id: str,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(LEADERSHIP_ROLES)),
    db: Session = Depends(get_db),
):
    """Deletes a task from the board."""
    task = TaskService.get_task_by_id(db=db, task_id=task_id, club_id=club_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found in this club")

    title = task.title
    TaskService.delete_task(db=db, task=task)

    return ApiResponse(
        success=True,
        data={"deleted_task_id": task_id},
        message=f"Task '{title}' deleted",
    )


@router.post("/clubs/{club_id}/tasks/ai-suggest", response_model=ApiResponse[AITaskSuggestResponse])
def ai_suggest_tasks(
    club_id: str,
    req: AITaskSuggestRequest,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(LEADERSHIP_ROLES)),
):
    """Uses Groq AI to break down a project milestone or goal into discrete actionable tasks."""
    suggested = TaskService.ai_suggest_tasks(req)
    return ApiResponse(
        success=True,
        data=suggested,
        message="AI task suggestions generated successfully",
    )
