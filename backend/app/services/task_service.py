import json
import logging
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.config.settings import settings
from app.models.club import Club, ClubMembership
from app.models.event import Event
from app.models.task import Task, TaskPriority, TaskStatus
from app.models.user import User
from app.schemas.task import (
    AITaskSuggestItem,
    AITaskSuggestRequest,
    AITaskSuggestResponse,
    DependencySummary,
    EventSummary,
    TaskCreate,
    TaskResponse,
    TaskStatusUpdate,
    TaskUpdate,
    UserSummary,
)

logger = logging.getLogger(__name__)


def enrich_task_response(task: Task) -> TaskResponse:
    assignee_summary = None
    if task.assignee:
        assignee_summary = UserSummary(
            id=task.assignee.id,
            full_name=task.assignee.full_name,
            email=task.assignee.email,
            avatar_url=task.assignee.avatar_url,
        )

    event_summary = None
    if task.event:
        event_summary = EventSummary(
            id=task.event.id,
            title=task.event.title,
            slug=task.event.slug,
        )

    dependency_summary = None
    is_blocked = False
    blocking_reason = None

    if task.depends_on:
        dependency_summary = DependencySummary(
            id=task.depends_on.id,
            title=task.depends_on.title,
            status=task.depends_on.status,
        )
        if task.depends_on.status not in (TaskStatus.COMPLETED, TaskStatus.DONE):
            is_blocked = True
            blocking_reason = f"Blocked by '{task.depends_on.title}' ({task.depends_on.status.value})"

    return TaskResponse(
        id=task.id,
        club_id=task.club_id,
        creator_id=task.creator_id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        deadline=task.deadline,
        event_id=task.event_id,
        assignee_id=task.assignee_id,
        depends_on_task_id=task.depends_on_task_id,
        created_at=task.created_at,
        updated_at=task.updated_at,
        assignee=assignee_summary,
        event=event_summary,
        depends_on=dependency_summary,
        is_blocked=is_blocked,
        blocking_reason=blocking_reason,
    )


class TaskService:
    @staticmethod
    def get_club_tasks(
        db: Session,
        club_id: str,
        event_id: Optional[str] = None,
        assignee_id: Optional[str] = None,
        status: Optional[TaskStatus] = None,
        priority: Optional[TaskPriority] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[TaskResponse]:
        query = db.query(Task).filter(Task.club_id == club_id)

        if event_id:
            query = query.filter(Task.event_id == event_id)
        if assignee_id:
            query = query.filter(Task.assignee_id == assignee_id)
        if status:
            query = query.filter(Task.status == status)
        if priority:
            query = query.filter(Task.priority == priority)
        if search:
            search_fmt = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Task.title.ilike(search_fmt),
                    Task.description.ilike(search_fmt),
                )
            )

        tasks = query.order_by(Task.created_at.desc()).offset(skip).limit(limit).all()
        return [enrich_task_response(t) for t in tasks]

    @staticmethod
    def get_task_by_id(db: Session, task_id: str, club_id: Optional[str] = None) -> Optional[Task]:
        query = db.query(Task).filter(Task.id == task_id)
        if club_id:
            query = query.filter(Task.club_id == club_id)
        return query.first()

    @staticmethod
    def create_task(
        db: Session,
        club_id: str,
        creator_id: Optional[str],
        task_in: TaskCreate,
    ) -> TaskResponse:
        club = db.query(Club).filter(Club.id == club_id).first()
        if not club:
            raise ValueError("Club not found")

        if task_in.event_id:
            event = db.query(Event).filter(Event.id == task_in.event_id, Event.club_id == club_id).first()
            if not event:
                raise ValueError("Associated event not found in this club")

        if task_in.assignee_id:
            membership = (
                db.query(ClubMembership)
                .filter(ClubMembership.club_id == club_id, ClubMembership.user_id == task_in.assignee_id)
                .first()
            )
            if not membership:
                raise ValueError("Assignee must be an active member of this club")

        if task_in.depends_on_task_id:
            prereq = db.query(Task).filter(Task.id == task_in.depends_on_task_id, Task.club_id == club_id).first()
            if not prereq:
                raise ValueError("Prerequisite task not found in this club")

        task = Task(
            club_id=club_id,
            creator_id=creator_id,
            event_id=task_in.event_id,
            assignee_id=task_in.assignee_id,
            title=task_in.title,
            description=task_in.description,
            status=task_in.status,
            priority=task_in.priority,
            deadline=task_in.deadline,
            depends_on_task_id=task_in.depends_on_task_id,
        )

        db.add(task)
        db.commit()
        db.refresh(task)
        return enrich_task_response(task)

    @staticmethod
    def update_task(
        db: Session,
        task: Task,
        task_update: TaskUpdate,
    ) -> TaskResponse:
        update_data = task_update.model_dump(exclude_unset=True)

        if "depends_on_task_id" in update_data and update_data["depends_on_task_id"]:
            target_id = update_data["depends_on_task_id"]
            if target_id == task.id:
                raise ValueError("A task cannot depend on itself")
            prereq = db.query(Task).filter(Task.id == target_id, Task.club_id == task.club_id).first()
            if not prereq:
                raise ValueError("Prerequisite task not found in this club")
            
            # Circular dependency check: traverse upstream dependencies
            curr = prereq
            visited = {task.id}
            while curr:
                if curr.id in visited:
                    raise ValueError(f"Circular dependency detected: task '{task.title}' cannot depend on '{prereq.title}' as it would create a loop")
                visited.add(curr.id)
                if not curr.depends_on_task_id:
                    break
                curr = db.query(Task).filter(Task.id == curr.depends_on_task_id).first()


        if "assignee_id" in update_data and update_data["assignee_id"]:
            membership = (
                db.query(ClubMembership)
                .filter(ClubMembership.club_id == task.club_id, ClubMembership.user_id == update_data["assignee_id"])
                .first()
            )
            if not membership:
                raise ValueError("Assignee must be an active member of this club")

        for field, value in update_data.items():
            setattr(task, field, value)

        db.commit()
        db.refresh(task)
        return enrich_task_response(task)

    @staticmethod
    def update_task_status(
        db: Session,
        task: Task,
        status_update: TaskStatusUpdate,
    ) -> TaskResponse:
        task.status = status_update.status
        db.commit()
        db.refresh(task)
        return enrich_task_response(task)

    @staticmethod
    def delete_task(db: Session, task: Task) -> None:
        db.delete(task)
        db.commit()

    @staticmethod
    def ai_suggest_tasks(req: AITaskSuggestRequest) -> AITaskSuggestResponse:
        """
        Uses Groq LLM to break down a project milestone or goal into
        4 to 6 actionable tasks with assigned roles and priorities.
        """
        if settings.GROQ_API_KEY:
            try:
                from groq import Groq
                client = Groq(api_key=settings.GROQ_API_KEY)

                candidate_models = [
                    settings.GROQ_MODEL,
                    "openai/gpt-oss-120b",
                    "groq/compound-mini",
                    "qwen/qwen3.8-27b",
                ]
                models_to_try = [m for m in candidate_models if m]

                system_prompt = (
                    "You are the senior operations architect for ClubOps AI. "
                    "Break down the user's club event goal or milestone into 4 to 6 discrete actionable tasks. "
                    "Output a valid JSON object with a 'tasks' array. Each item must have: "
                    "'title' (string), 'description' (string), 'priority' (one of: 'LOW', 'MEDIUM', 'HIGH', 'URGENT'), "
                    "'suggested_role' (e.g. 'Technical Lead', 'Design & PR', 'Logistics Volunteer'), "
                    "and 'suggested_timeline' (e.g. '2 Weeks Prior', '3 Days Prior'). "
                    "Respond ONLY with valid JSON."
                )
                user_prompt = (
                    f"Event Goal: {req.goal_description}\n"
                    f"Committee / Functional Area: {req.committee_area}\n"
                )

                for model_name in models_to_try:
                    try:
                        res = client.chat.completions.create(
                            messages=[
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": user_prompt},
                            ],
                            model=model_name,
                            temperature=0.3,
                            max_tokens=1500,
                            response_format={"type": "json_object"},
                        )
                        data = json.loads(res.choices[0].message.content)
                        tasks_data = data.get("tasks", [])
                        parsed_tasks = []
                        for t in tasks_data:
                            priority_str = str(t.get("priority", "MEDIUM")).upper()
                            if priority_str not in [p.value for p in TaskPriority]:
                                priority_str = "MEDIUM"
                            parsed_tasks.append(
                                AITaskSuggestItem(
                                    title=str(t.get("title", "Action Task")),
                                    description=str(t.get("description", "")),
                                    priority=TaskPriority(priority_str),
                                    suggested_role=str(t.get("suggested_role", "Committee Lead")),
                                    suggested_timeline=str(t.get("suggested_timeline", "1 Week Prior")),
                                )
                            )
                        if parsed_tasks:
                            return AITaskSuggestResponse(tasks=parsed_tasks)
                    except Exception as err:
                        logger.warning(f"Groq task suggest model {model_name} failed: {err}")
            except Exception as e:
                logger.warning(f"Groq task suggestion initialization failed: {e}")

        # Deterministic Fallback
        return AITaskSuggestResponse(
            tasks=[
                AITaskSuggestItem(
                    title=f"Draft execution plan for {req.goal_description[:40]}",
                    description="Align with faculty advisor and club executive board on deliverables.",
                    priority=TaskPriority.HIGH,
                    suggested_role="Organizing Lead",
                    suggested_timeline="2 Weeks Prior",
                ),
                AITaskSuggestItem(
                    title="Procure equipment, lab licenses, and hardware assets",
                    description="Sanction required peripherals, audio visual gear, and seating arrangements.",
                    priority=TaskPriority.MEDIUM,
                    suggested_role="Logistics Head",
                    suggested_timeline="10 Days Prior",
                ),
                AITaskSuggestItem(
                    title="Publish promotional flyers and campus broadcast",
                    description="Distribute posters on student community channels and college noticeboards.",
                    priority=TaskPriority.MEDIUM,
                    suggested_role="Design & PR",
                    suggested_timeline="1 Week Prior",
                ),
                AITaskSuggestItem(
                    title="Conduct pre-event dry run and volunteer shift briefing",
                    description="Verify projector connectivity, attendee registration desks, and crowd control.",
                    priority=TaskPriority.URGENT,
                    suggested_role="Operations Lead",
                    suggested_timeline="2 Days Prior",
                ),
            ]
        )
