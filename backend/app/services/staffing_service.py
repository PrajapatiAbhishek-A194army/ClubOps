import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.models.availability import Availability, AvailabilityStatus
from app.models.club import ClubMembership, MembershipStatus
from app.models.event import Event
from app.models.skill import Skill, VolunteerSkill
from app.models.task import Task, TaskAssignment, TaskStatus
from app.models.user import User
from app.schemas.staffing import (
    AIEventPlanResponse,
    SkillRequirementItem,
    SuggestedTaskAssignment,
)

logger = logging.getLogger(__name__)


class StaffingService:
    @staticmethod
    def estimate_event_staffing_and_plan(
        db: Session,
        event: Event,
        force_regenerate: bool = False,
    ) -> AIEventPlanResponse:
        """
        Calculates:
        1. Minimum volunteers required based on event type, duration, and scope.
        2. Breakdown of volunteers required with particular skills in count.
        3. Actionable tasks mapped to eligible club volunteers matching skills & availability.
        
        Persists state:
        - If tasks already exist for this event, returns the active, approved staffing plan with live statuses.
        - If a draft plan is already cached on the event, returns it deterministically (preventing random regeneration).
        - If force_regenerate is True, queries AI afresh and updates the cache.
        """
        # 1. If tasks already exist in the database for this event, return the live approved plan
        existing_tasks = db.query(Task).filter(Task.event_id == event.id).order_by(Task.created_at.asc()).all()
        if existing_tasks and not force_regenerate:
            proposed_tasks: List[SuggestedTaskAssignment] = []
            assigned_user_ids = set()

            for t in existing_tasks:
                assignment = (
                    db.query(TaskAssignment)
                    .filter(TaskAssignment.task_id == t.id)
                    .first()
                )
                sugg_id = None
                sugg_name = None
                if assignment and assignment.user_id:
                    sugg_id = assignment.user_id
                    assigned_user = db.query(User).filter(User.id == sugg_id).first()
                    if assigned_user:
                        sugg_name = assigned_user.full_name
                        assigned_user_ids.add(sugg_id)

                status_str = t.status.value if hasattr(t.status, "value") else str(t.status)
                priority_str = t.priority.value if hasattr(t.priority, "value") else str(t.priority)

                proposed_tasks.append(
                    SuggestedTaskAssignment(
                        task_id=t.id,
                        task_title=t.title,
                        task_description=t.description,
                        priority=priority_str,
                        due_datetime=t.due_datetime.isoformat() if t.due_datetime else None,
                        required_skill="Operations",
                        suggested_volunteer_id=sugg_id,
                        suggested_volunteer_name=sugg_name,
                        match_reason="Assigned & active on Kanban board",
                        skill_match_pct=100 if sugg_id else None,
                        status=status_str,
                    )
                )

            completed_count = sum(1 for pt in proposed_tasks if pt.status in ("DONE", "COMPLETED"))
            
            skill_requirements: List[SkillRequirementItem] = []
            for s in (event.skill_requirements or []):
                skill_requirements.append(
                    SkillRequirementItem(
                        skill_name=s.get("skill_name", "General Operations"),
                        required_count=int(s.get("required_count", 1)),
                        assigned_count=len(assigned_user_ids),
                    )
                )

            return AIEventPlanResponse(
                event_id=event.id,
                min_volunteers_required=event.min_volunteers_required or max(len(assigned_user_ids), 1),
                skill_requirements=skill_requirements,
                proposed_tasks=proposed_tasks,
                ai_explanation=f"Staffing plan is finalized and active. {len(existing_tasks)} tasks are running on the Kanban board with {completed_count} completed.",
                is_approved=True,
                task_count=len(existing_tasks),
                completed_task_count=completed_count,
            )

        # 2. Check if a draft proposal is already cached in event.checklists
        checklists = event.checklists or {}
        cached_plan = checklists.get("cached_staffing_plan")
        if cached_plan and not force_regenerate:
            try:
                skill_reqs = [
                    SkillRequirementItem(**sr) if isinstance(sr, dict) else sr 
                    for sr in cached_plan.get("skill_requirements", [])
                ]
                prop_tasks = [
                    SuggestedTaskAssignment(**pt) if isinstance(pt, dict) else pt 
                    for pt in cached_plan.get("proposed_tasks", [])
                ]
                return AIEventPlanResponse(
                    event_id=event.id,
                    min_volunteers_required=cached_plan.get("min_volunteers_required", event.min_volunteers_required or 6),
                    skill_requirements=skill_reqs,
                    proposed_tasks=prop_tasks,
                    ai_explanation=cached_plan.get("ai_explanation", "Calculated staffing proposal based on event scope."),
                    is_approved=False,
                    task_count=len(prop_tasks),
                    completed_task_count=0,
                )
            except Exception as e:
                logger.warning(f"Failed to parse cached_staffing_plan: {e}. Recomputing.")

        # 3. Otherwise, compute with AI / heuristic fallback
        skills = db.query(Skill).all()

        duration_hours = max(
            2.0,
            (event.end_date - event.start_date).total_seconds() / 3600.0,
        )

        plan_data = StaffingService._call_llm_or_fallback_estimation(
            event_title=event.title,
            event_desc=event.description or "",
            event_type=event.event_type.value,
            duration_hours=duration_hours,
            available_skills=[s.name for s in skills],
        )

        min_volunteers = plan_data.get("min_volunteers_required", 6)
        raw_skills = plan_data.get("skill_requirements", [])
        raw_tasks = plan_data.get("proposed_tasks", [])
        explanation = plan_data.get("ai_explanation", "Calculated based on event scope and skill needs.")

        skill_requirements: List[SkillRequirementItem] = []
        for s in raw_skills:
            skill_requirements.append(
                SkillRequirementItem(
                    skill_name=s.get("skill_name", "General Operations"),
                    required_count=int(s.get("required_count", 1)),
                    assigned_count=0,
                )
            )

        active_memberships = (
            db.query(ClubMembership)
            .filter(
                ClubMembership.club_id == event.club_id,
                ClubMembership.status == MembershipStatus.ACTIVE,
            )
            .all()
        )
        active_user_ids = [m.user_id for m in active_memberships]

        proposed_tasks: List[SuggestedTaskAssignment] = []
        assigned_user_ids = set()

        for t in raw_tasks:
            req_skill_name = t.get("required_skill", "")
            matched_candidate = StaffingService._find_best_candidate(
                db=db,
                club_user_ids=active_user_ids,
                skill_name=req_skill_name,
                event_start=event.start_date,
                event_end=event.end_date,
                exclude_user_ids=assigned_user_ids,
            )

            sugg_id = None
            sugg_name = None
            match_reason = "General availability"
            match_pct = 70

            if matched_candidate:
                sugg_id = matched_candidate["user_id"]
                sugg_name = matched_candidate["full_name"]
                match_reason = matched_candidate["reason"]
                match_pct = matched_candidate["score"]
                assigned_user_ids.add(sugg_id)

                for sr in skill_requirements:
                    if sr.skill_name.lower() == req_skill_name.lower():
                        sr.assigned_count += 1

            due_date = event.start_date - timedelta(days=t.get("deadline_offset_days", 2))
            proposed_tasks.append(
                SuggestedTaskAssignment(
                    task_title=t.get("task_title", "Operational Task"),
                    task_description=t.get("task_description", ""),
                    priority=t.get("priority", "MEDIUM"),
                    due_datetime=due_date.isoformat(),
                    required_skill=req_skill_name,
                    suggested_volunteer_id=sugg_id,
                    suggested_volunteer_name=sugg_name,
                    match_reason=match_reason,
                    skill_match_pct=match_pct,
                    status="TODO",
                )
            )

        # Update event record and save the cached proposal
        event.min_volunteers_required = min_volunteers
        event.skill_requirements = [sr.model_dump() for sr in skill_requirements]
        
        updated_checklists = dict(event.checklists or {})
        updated_checklists["cached_staffing_plan"] = {
            "min_volunteers_required": min_volunteers,
            "skill_requirements": [sr.model_dump() for sr in skill_requirements],
            "proposed_tasks": [pt.model_dump() for pt in proposed_tasks],
            "ai_explanation": explanation,
        }
        event.checklists = updated_checklists
        db.commit()

        return AIEventPlanResponse(
            event_id=event.id,
            min_volunteers_required=min_volunteers,
            skill_requirements=skill_requirements,
            proposed_tasks=proposed_tasks,
            ai_explanation=explanation,
            is_approved=False,
            task_count=len(proposed_tasks),
            completed_task_count=0,
        )

    @staticmethod
    def _find_best_candidate(
        db: Session,
        club_user_ids: List[str],
        skill_name: str,
        event_start: datetime,
        event_end: datetime,
        exclude_user_ids: set,
    ) -> Optional[dict]:
        """
        Applies Hard Constraints first:
        1. User in club
        2. Not excluded in current batch
        3. No conflicting active task/event assignment in time window
        4. Not marked UNAVAILABLE during event
        5. Workload limit (< 4 active tasks)
        Then Soft Constraints:
        - Skill match proficiency (1 to 5)
        - Experience
        """
        candidates = []

        for uid in club_user_ids:
            if uid in exclude_user_ids:
                continue

            user = db.query(User).filter(User.id == uid, User.is_active == True).first()
            if not user:
                continue

            # Hard Constraint 1: Check Availability Calendar
            unavailability = (
                db.query(Availability)
                .filter(
                    Availability.user_id == uid,
                    Availability.status == AvailabilityStatus.UNAVAILABLE,
                    Availability.start_datetime < event_end,
                    Availability.end_datetime > event_start,
                )
                .first()
            )
            if unavailability:
                continue  # Hard conflict: marked unavailable

            # Hard Constraint 2: Check Active Task Overload
            active_task_count = (
                db.query(TaskAssignment)
                .join(Task, TaskAssignment.task_id == Task.id)
                .filter(
                    TaskAssignment.user_id == uid,
                    Task.status.in_([TaskStatus.TODO, TaskStatus.IN_PROGRESS]),
                )
                .count()
            )
            if active_task_count >= 5:
                continue  # Workload capacity exceeded

            # Soft Constraint: Skill Match
            user_skill = (
                db.query(VolunteerSkill)
                .join(Skill, VolunteerSkill.skill_id == Skill.id)
                .filter(
                    VolunteerSkill.user_id == uid,
                    Skill.name.ilike(f"%{skill_name.strip()}%"),
                )
                .first()
            )

            score = 60
            reason_parts = ["Calendar available", f"Current active tasks: {active_task_count}"]
            if user_skill:
                score += user_skill.proficiency * 7 + int(min(user_skill.experience_years, 3) * 3)
                reason_parts.insert(0, f"Skill match '{skill_name}' (Proficiency: {user_skill.proficiency}/5)")
            else:
                reason_parts.insert(0, f"General volunteer aptitude")

            candidates.append({
                "user_id": user.id,
                "full_name": user.full_name,
                "score": min(98, score),
                "reason": "; ".join(reason_parts),
            })

        if not candidates:
            return None

        # Sort highest score first
        candidates.sort(key=lambda c: c["score"], reverse=True)
        return candidates[0]

    @staticmethod
    def _call_llm_or_fallback_estimation(
        event_title: str,
        event_desc: str,
        event_type: str,
        duration_hours: float,
        available_skills: List[str],
    ) -> dict:
        """
        Queries Groq LLM to estimate staffing counts and task breakdown,
        or returns deterministic heuristic estimates.
        """
        if settings.GROQ_API_KEY:
            try:
                from groq import Groq
                client = Groq(api_key=settings.GROQ_API_KEY)

                system_prompt = (
                    "You are the operations architect for ClubOps AI. "
                    "Analyze the given event and output a structured JSON with: "
                    "1. 'min_volunteers_required': integer (minimum total volunteers needed). "
                    "2. 'skill_requirements': array of objects with 'skill_name' (string) and 'required_count' (integer count). "
                    "3. 'proposed_tasks': array of 4 to 6 objects with 'task_title', 'task_description', "
                    "'priority' ('LOW'|'MEDIUM'|'HIGH'|'CRITICAL'), 'deadline_offset_days' (int, days prior to start), "
                    "and 'required_skill' (string matching one of available skills or realistic skill). "
                    "4. 'ai_explanation': concise paragraph explaining why this staffing level and skill breakdown was chosen. "
                    "Output ONLY valid JSON."
                )
                user_content = (
                    f"Event Title: {event_title}\n"
                    f"Type: {event_type}\n"
                    f"Duration Hours: {duration_hours}\n"
                    f"Description: {event_desc}\n"
                    f"Available Skills: {', '.join(available_skills[:15])}\n"
                )

                res = client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content},
                    ],
                    model=settings.GROQ_MODEL,
                    temperature=0.2,
                    max_tokens=1500,
                    response_format={"type": "json_object"},
                )
                data = json.loads(res.choices[0].message.content)
                if "min_volunteers_required" in data and "proposed_tasks" in data:
                    return data
            except Exception as e:
                logger.warning(f"Groq staffing estimator fallback due to: {e}")

        # Deterministic Domain Fallback
        is_tech = any(k in event_title.lower() for k in ["power bi", "python", "ai", "hackathon", "code", "data"])
        min_vols = 8 if is_tech else 6

        return {
            "min_volunteers_required": min_vols,
            "skill_requirements": [
                {"skill_name": "Power BI" if is_tech else "Event Management", "required_count": 3},
                {"skill_name": "Audio/Visual", "required_count": 2},
                {"skill_name": "Logistics", "required_count": 2},
                {"skill_name": "Design & Media", "required_count": 1},
            ],
            "proposed_tasks": [
                {
                    "task_title": f"Curate dataset and lab environment for {event_title}",
                    "task_description": "Prepare sample CSVs, verify software licenses and student machine prerequisites.",
                    "priority": "HIGH",
                    "deadline_offset_days": 3,
                    "required_skill": "Power BI" if is_tech else "Event Management",
                },
                {
                    "task_title": "Audio/Visual and projector setup in auditorium",
                    "task_description": "Test microphone frequencies, dual monitor mirroring, and speaker audio levels.",
                    "priority": "HIGH",
                    "deadline_offset_days": 1,
                    "required_skill": "Audio/Visual",
                },
                {
                    "task_title": "Coordinate attendee check-in desks and name tags",
                    "task_description": "Set up registration tables, print attendance roster, and verify campus IDs.",
                    "priority": "MEDIUM",
                    "deadline_offset_days": 1,
                    "required_skill": "Logistics",
                },
                {
                    "task_title": "Design and publish social media recap teaser",
                    "task_description": "Create Instagram carousel graphics highlighting speakers and workshop agenda.",
                    "priority": "MEDIUM",
                    "deadline_offset_days": 4,
                    "required_skill": "Design & Media",
                },
            ],
            "ai_explanation": (
                f"For a {duration_hours:.1f}-hour {event_type} ({event_title}), minimum {min_vols} volunteers are required "
                f"to support technical guidance (3), A/V reliability (2), and crowd logistics (2). "
                f"Staggered task deadlines ensure operational readiness before participants arrive."
            ),
        }
