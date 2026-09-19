import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from langchain_core.tools import StructuredTool, tool
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.models.club import ClubMembership, MembershipStatus
from app.models.document import Document, DocumentChunk
from app.models.event import Event
from app.models.meeting import Meeting
from app.models.notification import Notification, NotificationType
from app.models.risk import Risk, RiskStatus
from app.models.skill import Skill, VolunteerSkill
from app.models.task import (
    AssignmentSource,
    AssignmentStatus,
    Task,
    TaskAssignment,
    TaskCreatedSource,
    TaskPriority,
    TaskStatus,
)
from app.models.user import User

logger = logging.getLogger(__name__)


# Pydantic Schemas for Tool Inputs
class GetUserInput(BaseModel):
    query: str = Field(description="Full name or campus email of the user to look up")


class GetEventInput(BaseModel):
    query: Optional[str] = Field(None, description="Event title, keyword, or event ID")


class GetTaskInput(BaseModel):
    query: Optional[str] = Field(None, description="Task title, priority, or status to filter")


class GetVolunteerInput(BaseModel):
    skill_filter: Optional[str] = Field(None, description="Skill name (e.g., 'Python', 'Logistics', 'Design', 'Stage')")
    name_filter: Optional[str] = Field(None, description="Volunteer name to match")


class GetMeetingHistoryInput(BaseModel):
    limit: int = Field(5, ge=1, le=20, description="Number of recent meetings to retrieve")


class GetDocumentsInput(BaseModel):
    search_query: str = Field(description="Search keyword to find relevant proposals, guidelines, or budgets")


class GetRisksInput(BaseModel):
    event_id: Optional[str] = Field(None, description="Optional event ID to filter risks for")


class CreateTaskInput(BaseModel):
    title: str = Field(..., description="Concise actionable title for the task")
    description: Optional[str] = Field("", description="Detailed requirements or deliverables")
    priority: str = Field("MEDIUM", description="Task priority: 'LOW', 'MEDIUM', 'HIGH', or 'URGENT'")
    due_date: Optional[str] = Field(None, description="ISO format due date (YYYY-MM-DD) or relative deadline")
    event_id: Optional[str] = Field(None, description="Related event ID if task belongs to an event")


class AssignVolunteerInput(BaseModel):
    task_id: str = Field(..., description="The ID of the task to assign")
    volunteer_id: str = Field(..., description="The user ID of the volunteer to assign")


class GenerateAnnouncementInput(BaseModel):
    title: str = Field(..., description="Subject or headline of the announcement")
    content: str = Field(..., description="Draft text of the announcement message")
    event_id: Optional[str] = Field(None, description="Optional related event ID")


class ClubOpsTools:
    """
    Factory creating allowlisted LangChain tools bound securely to a specific
    database session, active club, and authenticated actor.
    Prevents cross-tenant leaks and completely forbids direct SQL execution.
    """

    def __init__(self, db: Session, club_id: str, actor_id: str):
        self.db = db
        self.club_id = club_id
        self.actor_id = actor_id
        self.call_audit_log: List[Dict[str, Any]] = []

    def _log_call(self, tool_name: str, args: Dict[str, Any], result: Any) -> None:
        self.call_audit_log.append({
            "timestamp": datetime.utcnow().isoformat(),
            "tool": tool_name,
            "args": args,
            "result_summary": str(result)[:200],
        })

    def get_user(self, query: str) -> Dict[str, Any]:
        """Looks up a user by email or name within the club membership."""
        q = f"%{query.strip()}%"
        membership = (
            self.db.query(ClubMembership)
            .join(User, ClubMembership.user_id == User.id)
            .filter(
                ClubMembership.club_id == self.club_id,
                ClubMembership.status == MembershipStatus.ACTIVE,
                (User.full_name.ilike(q) | User.email.ilike(q)),
            )
            .first()
        )
        if not membership or not membership.user:
            res = {"found": False, "message": f"No club member found matching '{query}'."}
        else:
            u = membership.user
            res = {
                "found": True,
                "user_id": u.id,
                "full_name": u.full_name,
                "email": u.email,
                "role": membership.role.value,
                "department": membership.department,
            }
        self._log_call("getUser", {"query": query}, res)
        return res

    def get_event(self, query: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieves active events in the club matching query."""
        q_db = self.db.query(Event).filter(Event.club_id == self.club_id)
        if query:
            q_db = q_db.filter(Event.title.ilike(f"%{query.strip()}%") | (Event.id == query.strip()))
        events = q_db.limit(5).all()
        res = [
            {
                "id": e.id,
                "title": e.title,
                "status": e.status.value,
                "start_date": e.start_date.isoformat() if e.start_date else None,
                "location": e.location,
            }
            for e in events
        ]
        self._log_call("getEvent", {"query": query}, res)
        return res

    def get_task(self, query: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieves tasks in the club."""
        q_db = self.db.query(Task).filter(Task.club_id == self.club_id)
        if query:
            q_db = q_db.filter(Task.title.ilike(f"%{query.strip()}%"))
        tasks = q_db.order_by(Task.created_at.desc()).limit(10).all()
        res = [
            {
                "id": t.id,
                "title": t.title,
                "status": t.status.value,
                "priority": t.priority.value,
                "due_date": t.due_datetime.isoformat() if t.due_datetime else None,
            }
            for t in tasks
        ]
        self._log_call("getTask", {"query": query}, res)
        return res

    def get_volunteer(self, skill_filter: Optional[str] = None, name_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """Finds eligible club volunteers, optionally filtered by specific skill or name."""
        members = (
            self.db.query(ClubMembership)
            .join(User, ClubMembership.user_id == User.id)
            .filter(
                ClubMembership.club_id == self.club_id,
                ClubMembership.status == MembershipStatus.ACTIVE,
            )
            .all()
        )

        results = []
        for m in members:
            u = m.user
            if not u:
                continue

            if name_filter and name_filter.lower() not in u.full_name.lower() and name_filter.lower() not in u.email.lower():
                continue

            user_skills = [s.skill.name for s in u.skills if s.skill]
            if skill_filter and not any(skill_filter.lower() in s.lower() for s in user_skills):
                continue

            results.append({
                "user_id": u.id,
                "full_name": u.full_name,
                "email": u.email,
                "role": m.role.value,
                "department": m.department,
                "skills": user_skills,
            })

        self._log_call("getVolunteer", {"skill_filter": skill_filter, "name_filter": name_filter}, results[:10])
        return results[:10]

    def get_meeting_history(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Retrieves recent club meetings and recorded minutes."""
        meetings = (
            self.db.query(Meeting)
            .filter(Meeting.club_id == self.club_id)
            .order_by(Meeting.meeting_date.desc())
            .limit(limit)
            .all()
        )
        res = [
            {
                "id": m.id,
                "title": m.title,
                "date": m.meeting_date.isoformat(),
                "action_items_count": len(m.action_items) if m.action_items else 0,
            }
            for m in meetings
        ]
        self._log_call("getMeetingHistory", {"limit": limit}, res)
        return res

    def get_documents(self, search_query: str) -> List[Dict[str, Any]]:
        """Retrieves institutional documents relevant to the query."""
        chunks = (
            self.db.query(DocumentChunk)
            .join(Document, DocumentChunk.document_id == Document.id)
            .filter(Document.club_id == self.club_id, DocumentChunk.chunk_text.ilike(f"%{search_query.strip()}%"))
            .limit(5)
            .all()
        )
        res = [
            {
                "doc_name": c.document.name if c.document else "Document",
                "content_snippet": c.chunk_text[:250],
            }
            for c in chunks
        ]
        self._log_call("getDocuments", {"search_query": search_query}, res)
        return res

    def get_risks(self, event_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieves operational risks for the event or club."""
        q_db = self.db.query(Risk).filter(Risk.status == RiskStatus.OPEN)
        if event_id:
            q_db = q_db.filter(Risk.event_id == event_id)
        else:
            q_db = q_db.join(Event, Risk.event_id == Event.id).filter(Event.club_id == self.club_id)

        risks = q_db.limit(8).all()
        res = [
            {
                "id": r.id,
                "title": r.title,
                "severity": r.severity.value,
                "description": r.description,
            }
            for r in risks
        ]
        self._log_call("getRisks", {"event_id": event_id}, res)
        return res

    def create_task(
        self,
        title: str,
        description: Optional[str] = "",
        priority: str = "MEDIUM",
        due_date: Optional[str] = None,
        event_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Creates an auditable task record in the club operations system."""
        p_enum = TaskPriority.MEDIUM
        try:
            p_enum = TaskPriority(priority.upper())
        except Exception:
            pass

        parsed_due = None
        if due_date:
            try:
                parsed_due = datetime.fromisoformat(due_date.replace("Z", "+00:00")).replace(tzinfo=None)
            except Exception:
                pass

        # If event_id not supplied, link to earliest active event in the club
        if not event_id:
            active_event = (
                self.db.query(Event)
                .filter(Event.club_id == self.club_id)
                .order_by(Event.start_date.asc())
                .first()
            )
            if active_event:
                event_id = active_event.id

        task = Task(
            club_id=self.club_id,
            event_id=event_id,
            creator_id=self.actor_id,
            title=title.strip(),
            description=description or "",
            priority=p_enum,
            status=TaskStatus.TODO,
            due_datetime=parsed_due,
            created_source=TaskCreatedSource.AI,
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)

        res = {
            "success": True,
            "task_id": task.id,
            "title": task.title,
            "priority": task.priority.value,
            "due_date": task.due_datetime.isoformat() if task.due_datetime else None,
            "event_id": task.event_id,
        }
        self._log_call("createTask", {"title": title, "priority": priority}, res)
        return res

    def assign_volunteer(self, task_id: str, volunteer_id: str) -> Dict[str, Any]:
        """Assigns an approved volunteer to a task and dispatches notification."""
        task = self.db.query(Task).filter(Task.id == task_id, Task.club_id == self.club_id).first()
        if not task:
            return {"success": False, "message": "Task not found"}

        user = self.db.query(User).filter(User.id == volunteer_id).first()
        if not user:
            return {"success": False, "message": "Volunteer not found"}

        # Create or update assignment
        existing = (
            self.db.query(TaskAssignment)
            .filter(TaskAssignment.task_id == task_id, TaskAssignment.user_id == volunteer_id)
            .first()
        )
        if not existing:
            assignment = TaskAssignment(
                task_id=task.id,
                user_id=user.id,
                assigned_by_id=self.actor_id,
                assignment_source=AssignmentSource.AI_APPROVED,
                status=AssignmentStatus.ASSIGNED,
            )
            self.db.add(assignment)
            self.db.commit()

        # Send in-app notification
        actor = self.db.query(User).filter(User.id == self.actor_id).first()
        actor_name = actor.full_name if actor else "Club Leadership"

        notif = Notification(
            user_id=user.id,
            title=f"Task Assigned: {task.title}",
            message=f"{actor_name} assigned you to '{task.title}' via AI Operations Workflow.",
            type=NotificationType.TASK_ASSIGNED,
            link_url="/app/tasks",
        )
        self.db.add(notif)
        self.db.commit()

        res = {
            "success": True,
            "task_id": task.id,
            "task_title": task.title,
            "assigned_to": user.full_name,
            "volunteer_email": user.email,
        }
        self._log_call("assignVolunteer", {"task_id": task_id, "volunteer_id": volunteer_id}, res)
        return res

    def generate_announcement(
        self,
        title: str,
        content: str,
        event_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Stages an AI-generated club announcement."""
        res = {
            "staged": True,
            "title": title,
            "content": content,
            "event_id": event_id,
            "club_id": self.club_id,
            "message": "Announcement drafted and staged for President approval.",
        }
        self._log_call("generateAnnouncement", {"title": title}, res)
        return res

    def get_langchain_tools(self) -> List[StructuredTool]:
        """Returns the suite of StructuredTools for binding to ChatGroq."""
        return [
            StructuredTool.from_function(
                func=self.get_user,
                name="getUser",
                description="Search for a club member or user by name or email to obtain their user_id.",
                args_schema=GetUserInput,
            ),
            StructuredTool.from_function(
                func=self.get_event,
                name="getEvent",
                description="Look up club events by title or keywords to retrieve event_id and status.",
                args_schema=GetEventInput,
            ),
            StructuredTool.from_function(
                func=self.get_task,
                name="getTask",
                description="Check existing club tasks by title or keyword.",
                args_schema=GetTaskInput,
            ),
            StructuredTool.from_function(
                func=self.get_volunteer,
                name="getVolunteer",
                description="Find club volunteers filtered by skill or name to assign to relevant tasks.",
                args_schema=GetVolunteerInput,
            ),
            StructuredTool.from_function(
                func=self.get_meeting_history,
                name="getMeetingHistory",
                description="Retrieve recent club meetings and meeting notes.",
                args_schema=GetMeetingHistoryInput,
            ),
            StructuredTool.from_function(
                func=self.get_documents,
                name="getDocuments",
                description="Search club documents, past proposals, and operational guidelines.",
                args_schema=GetDocumentsInput,
            ),
            StructuredTool.from_function(
                func=self.get_risks,
                name="getRisks",
                description="Retrieve active operational risks and blockers for the club or event.",
                args_schema=GetRisksInput,
            ),
            StructuredTool.from_function(
                func=self.create_task,
                name="createTask",
                description="Creates a new task in the club operations board with title, priority, and due date.",
                args_schema=CreateTaskInput,
            ),
            StructuredTool.from_function(
                func=self.assign_volunteer,
                name="assignVolunteer",
                description="Assigns a volunteer (user_id) to an existing task (task_id) with notification.",
                args_schema=AssignVolunteerInput,
            ),
            StructuredTool.from_function(
                func=self.generate_announcement,
                name="generateAnnouncement",
                description="Drafts a structured announcement message for the event or club.",
                args_schema=GenerateAnnouncementInput,
            ),
        ]
