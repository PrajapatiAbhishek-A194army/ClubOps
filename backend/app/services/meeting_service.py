import json
import logging
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.models.club import ClubMembership
from app.models.meeting import ActionItem, ActionItemStatus, Meeting
from app.models.task import AssignmentSource, AssignmentStatus, Task, TaskAssignment, TaskCreatedSource, TaskPriority, TaskStatus
from app.models.user import User
from app.schemas.meeting import ActionItemResponse, MeetingResponse
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


class MeetingService:
    @staticmethod
    def create_and_process_meeting(
        db: Session,
        club_id: str,
        user_id: str,
        title: str,
        transcript_text: str,
        event_id: Optional[str] = None,
        meeting_date: Optional[datetime] = None,
    ) -> MeetingResponse:
        meeting = Meeting(
            club_id=club_id,
            event_id=event_id,
            created_by_id=user_id,
            title=title,
            transcript_text=transcript_text,
            meeting_date=meeting_date or datetime.utcnow(),
            processed_at=datetime.utcnow(),
        )
        db.add(meeting)
        db.flush()

        # Extract Action Items via AI or deterministic NLP parser
        extracted_items = MeetingService._extract_action_items(transcript_text)
        action_item_objs = []
        for item in extracted_items:
            ai_item = ActionItem(
                meeting_id=meeting.id,
                title=item["title"],
                description=item.get("description", ""),
                suggested_owner=item.get("suggested_owner"),
                suggested_deadline=item.get("suggested_deadline"),
                confidence_score=item.get("confidence_score", 0.9),
                status=ActionItemStatus.EXTRACTED,
            )
            db.add(ai_item)
            action_item_objs.append(ai_item)

        db.commit()
        db.refresh(meeting)

        return MeetingResponse(
            id=meeting.id,
            club_id=meeting.club_id,
            event_id=meeting.event_id,
            title=meeting.title,
            transcript_text=meeting.transcript_text,
            meeting_date=meeting.meeting_date,
            processed_at=meeting.processed_at,
            created_at=meeting.created_at,
            action_items=[
                ActionItemResponse.model_validate(it) for it in action_item_objs
            ],
        )

    @staticmethod
    def convert_action_items_to_tasks(
        db: Session,
        meeting_id: str,
        action_item_ids: List[str],
        creator_id: str,
        assignments_map: Optional[Dict[str, str]] = None,
    ) -> List[Task]:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            raise ValueError("Meeting not found")

        # Load all members of the active club for matching suggested owners
        club_members = (
            db.query(User)
            .join(ClubMembership, ClubMembership.user_id == User.id)
            .filter(ClubMembership.club_id == meeting.club_id)
            .all()
        )

        all_users = None  # Lazy load system users if needed

        def resolve_owner_user(owner_name: Optional[str]) -> Optional[User]:
            if not owner_name or not str(owner_name).strip():
                return None
            target = str(owner_name).strip().lower()

            # 1. Exact match on full name or email within club
            for u in club_members:
                full = (u.full_name or "").strip().lower()
                email = (u.email or "").strip().lower()
                email_prefix = email.split("@")[0]
                if target == full or target == email or target == email_prefix:
                    return u

            # 2. First name match or name starts with target within club (e.g. "Rahul" -> "Rahul Gupta")
            for u in club_members:
                full = (u.full_name or "").strip().lower()
                first = full.split()[0] if full else ""
                if target == first or full.startswith(target) or target in full:
                    return u

            # 3. Fuzzy email username match (e.g. target in "vol.rahul")
            for u in club_members:
                email_prefix = (u.email or "").split("@")[0].lower()
                if target in email_prefix:
                    return u

            # 4. Search across all system users if not yet in club roster
            nonlocal all_users
            if all_users is None:
                all_users = db.query(User).all()
            for u in all_users:
                full = (u.full_name or "").strip().lower()
                first = full.split()[0] if full else ""
                email_prefix = (u.email or "").split("@")[0].lower()
                if target == full or target == first or full.startswith(target) or target in full or target in email_prefix:
                    return u

            return None

        created_tasks: List[Task] = []
        for ai_id in action_item_ids:
            item = (
                db.query(ActionItem)
                .filter(ActionItem.id == ai_id, ActionItem.meeting_id == meeting_id)
                .first()
            )
            if not item or item.status == ActionItemStatus.CONVERTED:
                continue

            # Determine assignee user: explicit mapping overrides, else match from suggested_owner
            assigned_user_id = None
            if assignments_map and ai_id in assignments_map and assignments_map[ai_id]:
                assigned_user_id = assignments_map[ai_id]
            elif item.suggested_owner:
                matched_user = resolve_owner_user(item.suggested_owner)
                if matched_user:
                    assigned_user_id = matched_user.id

            task = Task(
                club_id=meeting.club_id,
                event_id=meeting.event_id,
                creator_id=creator_id,
                assignee_id=assigned_user_id,
                title=item.title,
                description=f"Extracted from meeting '{meeting.title}'. {item.description or ''}".strip(),
                priority=TaskPriority.HIGH if "urgent" in item.title.lower() else TaskPriority.MEDIUM,
                status=TaskStatus.TODO,
                due_datetime=item.suggested_deadline or (datetime.utcnow() + timedelta(days=4)),
                created_source=TaskCreatedSource.MEETING,
            )
            db.add(task)
            db.flush()

            # If assigned, create auditable TaskAssignment and dispatch notification
            if assigned_user_id:
                assignment = TaskAssignment(
                    task_id=task.id,
                    user_id=assigned_user_id,
                    assigned_by_id=creator_id,
                    assignment_source=AssignmentSource.AI_APPROVED,
                    status=AssignmentStatus.ACCEPTED,
                )
                db.add(assignment)

                try:
                    NotificationService.create_notification(
                        db=db,
                        user_id=assigned_user_id,
                        club_id=meeting.club_id,
                        title="New Task Assigned from Meeting",
                        message=f"You have been assigned '{task.title}' from meeting '{meeting.title}'.",
                        category="TASK",
                        action_url="/app/tasks",
                    )
                except Exception as notif_err:
                    logger.warning(f"Failed to dispatch meeting task notification: {notif_err}")

            item.status = ActionItemStatus.CONVERTED
            item.created_task_id = task.id
            created_tasks.append(task)

        db.commit()
        return created_tasks

    @staticmethod
    def _extract_action_items(transcript: str) -> List[dict]:
        """
        Uses Groq LLM or deterministic fallback pattern parser to extract
        atomic actionable tasks, owners, and relative deadlines.
        """
        if settings.GROQ_API_KEY:
            try:
                from groq import Groq
                client = Groq(api_key=settings.GROQ_API_KEY)

                system_prompt = (
                    "You are the operations parser for ClubOps AI. "
                    "Extract distinct operational action items from the meeting transcript. "
                    "Output a JSON object with 'action_items' array. Each item must have: "
                    "'title' (string, concise actionable verb phrase), "
                    "'description' (string context), "
                    "'suggested_owner' (name of the person assigned or null), "
                    "'suggested_deadline_days' (integer: relative days from today, e.g. 1 for tomorrow, 3 for 3 days), "
                    "'confidence_score' (float 0.5 to 1.0). "
                    "Respond ONLY with valid JSON."
                )

                res = client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"Transcript:\n{transcript}"},
                    ],
                    model=settings.GROQ_MODEL,
                    temperature=0.1,
                    max_tokens=1200,
                    response_format={"type": "json_object"},
                )
                data = json.loads(res.choices[0].message.content)
                items = data.get("action_items", [])
                results = []
                now = datetime.utcnow()
                for it in items:
                    days = it.get("suggested_deadline_days", 3)
                    deadline = now + timedelta(days=days if isinstance(days, (int, float)) else 3)
                    results.append({
                        "title": it.get("title", "Action Deliverable"),
                        "description": it.get("description", ""),
                        "suggested_owner": it.get("suggested_owner"),
                        "suggested_deadline": deadline,
                        "confidence_score": float(it.get("confidence_score", 0.92)),
                    })
                if results:
                    return results
            except Exception as e:
                logger.warning(f"Groq meeting extraction fallback due to: {e}")

        # Deterministic Regex Fallback for Hackathon Scenario
        # Matches patterns like: "Rahul will prepare ... by Friday", "Priya will confirm ... tomorrow"
        results = []
        now = datetime.utcnow()
        lines = [l.strip() for l in transcript.split("\n") if l.strip()]

        for line in lines:
            match = re.search(r"^([A-Z][a-z]+)\s+will\s+(.+?)(?:\s+by\s+(.+?)|\s+tomorrow)?\.$", line, re.IGNORECASE)
            if match:
                owner = match.group(1).title()
                task_content = match.group(2).strip()
                timeframe = match.group(3) or ("tomorrow" if "tomorrow" in line.lower() else "Friday")

                days = 1 if "tomorrow" in timeframe.lower() else (4 if "friday" in timeframe.lower() else 3)
                results.append({
                    "title": task_content.capitalize(),
                    "description": f"Assigned to {owner} during committee standup.",
                    "suggested_owner": owner,
                    "suggested_deadline": now + timedelta(days=days),
                    "confidence_score": 0.95,
                })
            else:
                # Generic line item
                results.append({
                    "title": line[:80],
                    "description": line,
                    "suggested_owner": None,
                    "suggested_deadline": now + timedelta(days=3),
                    "confidence_score": 0.75,
                })

        return results[:6]
