from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_club_role
from app.models.club import ClubRole
from app.models.task import TaskPriority, TaskStatus
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
from app.services.task_service import TaskService, enrich_task_response

router = APIRouter()


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
    membership=Depends(require_club_role([ClubRole.PRESIDENT, ClubRole.ORGANIZER, ClubRole.TEAM_LEAD, ClubRole.VOLUNTEER, ClubRole.MEMBER])),
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


@router.post("/clubs/{club_id}/tasks", response_model=ApiResponse[TaskResponse], status_code=status.HTTP_201_CREATED)
def create_task(
    club_id: str,
    task_in: TaskCreate,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role([ClubRole.PRESIDENT, ClubRole.ORGANIZER, ClubRole.TEAM_LEAD])),
    db: Session = Depends(get_db),
):
    """Creates a new task in the club operations board with optional dependency."""
    try:
        task = TaskService.create_task(
            db=db,
            club_id=club_id,
            creator_id=current_user.id,
            task_in=task_in,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return ApiResponse(
        success=True,
        data=task,
        message=f"Task '{task.title}' created successfully",
    )


@router.get("/clubs/{club_id}/tasks/{task_id}", response_model=ApiResponse[TaskResponse])
def get_task(
    club_id: str,
    task_id: str,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role([ClubRole.PRESIDENT, ClubRole.ORGANIZER, ClubRole.TEAM_LEAD, ClubRole.VOLUNTEER, ClubRole.MEMBER])),
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
    membership=Depends(require_club_role([ClubRole.PRESIDENT, ClubRole.ORGANIZER, ClubRole.TEAM_LEAD])),
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
    membership=Depends(require_club_role([ClubRole.PRESIDENT, ClubRole.ORGANIZER, ClubRole.TEAM_LEAD, ClubRole.VOLUNTEER])),
    db: Session = Depends(get_db),
):
    """Quickly moves a task between Kanban columns (TODO, IN_PROGRESS, BLOCKED, DONE)."""
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
    membership=Depends(require_club_role([ClubRole.PRESIDENT, ClubRole.ORGANIZER, ClubRole.TEAM_LEAD])),
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
    membership=Depends(require_club_role([ClubRole.PRESIDENT, ClubRole.ORGANIZER, ClubRole.TEAM_LEAD])),
):
    """Uses Groq AI to break down a project milestone or goal into discrete actionable tasks."""
    suggested = TaskService.ai_suggest_tasks(req)
    return ApiResponse(
        success=True,
        data=suggested,
        message="AI task suggestions generated successfully",
    )
