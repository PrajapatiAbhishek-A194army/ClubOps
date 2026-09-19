import json
import logging
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.config.settings import settings
from app.models.club import Club, ClubMembership, ClubRole
from app.models.event import Event
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.models.volunteer import AvailabilityStatus, CheckInStatus, VolunteerProfile
from app.schemas.volunteer import (
    AIVolunteerMatchItem,
    AIVolunteerMatchRequest,
    AIVolunteerMatchResponse,
    AssignedTaskBrief,
    STANDARD_SKILL_CATEGORIES,
    VolunteerAvailabilityUpdate,
    VolunteerCheckInUpdate,
    VolunteerCreate,
    VolunteerResponse,
    VolunteerUpdate,
)

logger = logging.getLogger(__name__)


class VolunteerService:

    @staticmethod
    def _build_volunteer_response(
        db: Session,
        profile: VolunteerProfile,
        include_task_details: bool = True
    ) -> VolunteerResponse:
        user = profile.user
        club_membership = db.query(ClubMembership).filter(
            ClubMembership.club_id == profile.club_id,
            ClubMembership.user_id == profile.user_id,
        ).first()
        role_name = club_membership.role.value if club_membership else "VOLUNTEER"

        # Fetch assigned tasks in this club
        tasks_query = db.query(Task).filter(
            Task.club_id == profile.club_id,
            Task.assignee_id == profile.user_id,
        )
        all_assigned = tasks_query.all()

        active_count = sum(1 for t in all_assigned if t.status in [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED])
        completed_count = sum(1 for t in all_assigned if t.status == TaskStatus.DONE)

        assigned_task_briefs = []
        if include_task_details:
            for t in all_assigned:
                event_title = t.event.title if t.event else None
                assigned_task_briefs.append(
                    AssignedTaskBrief(
                        id=t.id,
                        title=t.title,
                        status=t.status.value,
                        priority=t.priority.value,
                        deadline=t.deadline,
                        event_title=event_title,
                    )
                )

        return VolunteerResponse(
            id=profile.id,
            club_id=profile.club_id,
            user_id=profile.user_id,
            full_name=user.full_name if user else "Unknown Volunteer",
            email=user.email if user else "",
            avatar_url=user.avatar_url if user else None,
            role=role_name,
            skills=profile.skills or [],
            department=profile.department or "General Operations",
            availability_status=profile.availability_status,
            availability_notes=profile.availability_notes,
            available_hours_per_week=profile.available_hours_per_week,
            check_in_status=profile.check_in_status,
            checked_in_at=profile.checked_in_at,
            phone_number=profile.phone_number,
            rating=profile.rating or 5.0,
            active_tasks_count=active_count,
            completed_tasks_count=completed_count,
            assigned_tasks=assigned_task_briefs,
            created_at=profile.created_at,
            updated_at=profile.updated_at,
        )

    @classmethod
    def get_club_volunteers(
        cls,
        db: Session,
        club_id: str,
        availability: Optional[AvailabilityStatus] = None,
        skill: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[VolunteerResponse]:
        # Ensure club members with role VOLUNTEER or MEMBER have a profile auto-initialized
        club_members = db.query(ClubMembership).filter(
            ClubMembership.club_id == club_id,
        ).all()

        for mem in club_members:
            existing = db.query(VolunteerProfile).filter(
                VolunteerProfile.club_id == club_id,
                VolunteerProfile.user_id == mem.user_id,
            ).first()
            if not existing:
                default_skills = []
                if "tech" in (mem.department or "").lower():
                    default_skills = ["Audio / Visual (AV)", "Network & Wi-Fi Setup"]
                elif "media" in (mem.department or "").lower() or "design" in (mem.department or "").lower():
                    default_skills = ["Graphic Design", "Social Media & Live PR", "Photography"]
                elif "logistics" in (mem.department or "").lower() or "desk" in (mem.department or "").lower():
                    default_skills = ["Registration Desk", "Crowd Management", "Equipment Transport"]
                else:
                    default_skills = ["Registration Desk", "Crowd Management"]

                new_profile = VolunteerProfile(
                    club_id=club_id,
                    user_id=mem.user_id,
                    skills=default_skills,
                    department=mem.department or "General Operations",
                    availability_status=AvailabilityStatus.AVAILABLE,
                    availability_notes="Available for campus event shifts",
                    available_hours_per_week=10,
                    check_in_status=CheckInStatus.CHECKED_OUT,
                )
                db.add(new_profile)

        db.commit()

        # Query all profiles for this club
        query = db.query(VolunteerProfile).filter(VolunteerProfile.club_id == club_id)

        if availability:
            query = query.filter(VolunteerProfile.availability_status == availability)

        profiles = query.all()
        results: List[VolunteerResponse] = []

        for p in profiles:
            resp = cls._build_volunteer_response(db, p, include_task_details=True)

            # Filter by skill tag if requested
            if skill and skill.strip():
                skill_lower = skill.strip().lower()
                has_skill = any(skill_lower in s.lower() for s in resp.skills)
                if not has_skill:
                    continue

            # Search filter (name, email, department, or skills)
            if search and search.strip():
                s_lower = search.strip().lower()
                matches_name = s_lower in resp.full_name.lower()
                matches_email = s_lower in resp.email.lower()
                matches_dept = s_lower in resp.department.lower()
                matches_skills = any(s_lower in sk.lower() for sk in resp.skills)
                if not (matches_name or matches_email or matches_dept or matches_skills):
                    continue

            results.append(resp)

        # Sort: AVAILABLE first, then by active task count ascending (balance workload)
        results.sort(
            key=lambda x: (
                0 if x.availability_status == AvailabilityStatus.AVAILABLE else 1,
                x.active_tasks_count,
            )
        )
        return results

    @classmethod
    def get_volunteer_by_id(cls, db: Session, volunteer_id: str) -> Optional[VolunteerResponse]:
        profile = db.query(VolunteerProfile).filter(VolunteerProfile.id == volunteer_id).first()
        if not profile:
            return None
        return cls._build_volunteer_response(db, profile, include_task_details=True)

    @classmethod
    def get_volunteer_profile_entity(cls, db: Session, volunteer_id: str) -> Optional[VolunteerProfile]:
        return db.query(VolunteerProfile).filter(VolunteerProfile.id == volunteer_id).first()

    @classmethod
    def create_or_update_profile(
        cls,
        db: Session,
        club_id: str,
        data: VolunteerCreate,
    ) -> VolunteerResponse:
        existing = db.query(VolunteerProfile).filter(
            VolunteerProfile.club_id == club_id,
            VolunteerProfile.user_id == data.user_id,
        ).first()

        if existing:
            existing.skills = data.skills
            existing.department = data.department
            existing.availability_status = data.availability_status
            existing.availability_notes = data.availability_notes
            existing.available_hours_per_week = data.available_hours_per_week
            existing.phone_number = data.phone_number
            profile = existing
        else:
            profile = VolunteerProfile(
                club_id=club_id,
                user_id=data.user_id,
                skills=data.skills,
                department=data.department,
                availability_status=data.availability_status,
                availability_notes=data.availability_notes,
                available_hours_per_week=data.available_hours_per_week,
                phone_number=data.phone_number,
                check_in_status=CheckInStatus.CHECKED_OUT,
            )
            db.add(profile)

        db.commit()
        db.refresh(profile)
        return cls._build_volunteer_response(db, profile)

    @classmethod
    def update_profile(
        cls,
        db: Session,
        profile: VolunteerProfile,
        data: VolunteerUpdate,
    ) -> VolunteerResponse:
        if data.skills is not None:
            profile.skills = data.skills
        if data.department is not None:
            profile.department = data.department
        if data.availability_status is not None:
            profile.availability_status = data.availability_status
        if data.availability_notes is not None:
            profile.availability_notes = data.availability_notes
        if data.available_hours_per_week is not None:
            profile.available_hours_per_week = data.available_hours_per_week
        if data.phone_number is not None:
            profile.phone_number = data.phone_number

        db.commit()
        db.refresh(profile)
        return cls._build_volunteer_response(db, profile)

    @classmethod
    def update_availability(
        cls,
        db: Session,
        profile: VolunteerProfile,
        data: VolunteerAvailabilityUpdate,
    ) -> VolunteerResponse:
        profile.availability_status = data.availability_status
        if data.availability_notes is not None:
            profile.availability_notes = data.availability_notes

        db.commit()
        db.refresh(profile)
        return cls._build_volunteer_response(db, profile)

    @classmethod
    def toggle_check_in(
        cls,
        db: Session,
        profile: VolunteerProfile,
        data: VolunteerCheckInUpdate,
    ) -> VolunteerResponse:
        profile.check_in_status = data.check_in_status
        if data.check_in_status == CheckInStatus.CHECKED_IN:
            profile.checked_in_at = datetime.utcnow()
        else:
            profile.checked_in_at = None

        db.commit()
        db.refresh(profile)
        return cls._build_volunteer_response(db, profile)

    @classmethod
    def assign_volunteer_to_task(
        cls,
        db: Session,
        club_id: str,
        task_id: str,
        volunteer_user_id: str,
    ) -> Task:
        task = db.query(Task).filter(Task.id == task_id, Task.club_id == club_id).first()
        if not task:
            raise ValueError(f"Task '{task_id}' not found in club")

        volunteer_user = db.query(User).filter(User.id == volunteer_user_id).first()
        if not volunteer_user:
            raise ValueError(f"Volunteer user '{volunteer_user_id}' not found")

        task.assignee_id = volunteer_user_id
        db.commit()
        db.refresh(task)
        return task

    @classmethod
    def recommend_volunteers_with_ai(
        cls,
        db: Session,
        club_id: str,
        req: AIVolunteerMatchRequest,
    ) -> AIVolunteerMatchResponse:
        # 1. Resolve task title and description
        task_title = req.task_title or ""
        task_desc = req.task_description or ""

        if req.task_id:
            target_task = db.query(Task).filter(Task.id == req.task_id, Task.club_id == club_id).first()
            if target_task:
                task_title = target_task.title
                task_desc = target_task.description or ""
                if target_task.event and not req.event_id:
                    req.event_id = target_task.event_id

        if not task_title:
            task_title = "Event Operations & Task Delivery"

        # 2. Extract or infer required skills
        required_skills = list(req.required_skills)
        combined_text = f"{task_title} {task_desc}".lower()

        if not required_skills:
            if any(w in combined_text for w in ["audio", "visual", "mic", "sound", "projector", "av"]):
                required_skills.append("Audio / Visual (AV)")
            if any(w in combined_text for w in ["wifi", "wi-fi", "switch", "router", "network", "ethernet"]):
                required_skills.append("Network & Wi-Fi Setup")
            if any(w in combined_text for w in ["registration", "desk", "check-in", "badge", "lanyard", "attendance"]):
                required_skills.append("Registration Desk")
            if any(w in combined_text for w in ["crowd", "usher", "hall", "security", "flow", "stage", "seating"]):
                required_skills.append("Crowd Management")
            if any(w in combined_text for w in ["photo", "camera", "picture"]):
                required_skills.append("Photography")
            if any(w in combined_text for w in ["video", "record", "stream"]):
                required_skills.append("Videography")
            if any(w in combined_text for w in ["poster", "flyer", "banner", "design", "graphic"]):
                required_skills.append("Graphic Design")
            if any(w in combined_text for w in ["food", "catering", "snack", "drink", "lunch"]):
                required_skills.append("Food & Catering")
            if any(w in combined_text for w in ["code", "software", "api", "python", "deploy", "server"]):
                required_skills.append("Python / Backend")

            if not required_skills:
                required_skills = ["Registration Desk", "Crowd Management"]

        # 3. Retrieve all volunteers in the club
        volunteers = cls.get_club_volunteers(db, club_id)

        if not volunteers:
            return AIVolunteerMatchResponse(
                task_title=task_title,
                required_skills=required_skills,
                recommendations=[],
                summary="No volunteers are currently registered in this club roster.",
            )

        # 4. Try Groq LLM if configured
        if settings.GROQ_API_KEY:
            try:
                from groq import Groq
                client = Groq(api_key=settings.GROQ_API_KEY)

                volunteers_summary = [
                    {
                        "volunteer_id": v.id,
                        "user_id": v.user_id,
                        "name": v.full_name,
                        "department": v.department,
                        "skills": v.skills,
                        "status": v.availability_status.value,
                        "active_tasks": v.active_tasks_count,
                        "hours_per_week": v.available_hours_per_week,
                    }
                    for v in volunteers
                ]

                system_prompt = (
                    "You are the AI Volunteer Operations Matchmaker for ClubOps AI. "
                    "Analyze the given task requirements and evaluate candidate student volunteers. "
                    "Score each candidate from 0 to 100 based on: "
                    "1) Direct skill alignment (highest priority), "
                    "2) Availability status (AVAILABLE gets priority over BUSY or ON_SHIFT), "
                    "3) Workload balance (penalize volunteers with high active task counts to prevent burnout). "
                    "Output a valid JSON object with a 'recommendations' array. Each element must contain: "
                    "'volunteer_id' (string), 'match_score' (integer 0-100), 'matching_skills' (array of strings), "
                    "and 'match_rationale' (1 concise sentence explaining why this candidate fits and workload state)."
                )

                user_prompt = (
                    f"Task Title: {task_title}\n"
                    f"Task Description: {task_desc}\n"
                    f"Required Skills: {json.dumps(required_skills)}\n\n"
                    f"Candidate Volunteers Pool:\n{json.dumps(volunteers_summary)}"
                )

                res = client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    model=settings.GROQ_MODEL,
                    temperature=0.2,
                    max_tokens=1500,
                    response_format={"type": "json_object"},
                )

                data = json.loads(res.choices[0].message.content)
                recs_data = data.get("recommendations", [])

                id_to_vol = {v.id: v for v in volunteers}
                ai_items: List[AIVolunteerMatchItem] = []

                for r in recs_data:
                    v_id = r.get("volunteer_id")
                    if v_id in id_to_vol:
                        vol = id_to_vol[v_id]
                        score = int(r.get("match_score", 60))
                        ai_items.append(
                            AIVolunteerMatchItem(
                                volunteer_id=vol.id,
                                user_id=vol.user_id,
                                full_name=vol.full_name,
                                avatar_url=vol.avatar_url,
                                match_score=max(10, min(100, score)),
                                matching_skills=r.get("matching_skills", []),
                                match_rationale=str(r.get("match_rationale", "Strong skill and operational match.")),
                                availability_status=vol.availability_status,
                                active_tasks_count=vol.active_tasks_count,
                                department=vol.department,
                            )
                        )

                if ai_items:
                    ai_items.sort(key=lambda x: x.match_score, reverse=True)
                    top_name = ai_items[0].full_name if ai_items else "top volunteer"
                    return AIVolunteerMatchResponse(
                        task_title=task_title,
                        required_skills=required_skills,
                        recommendations=ai_items,
                        summary=f"AI evaluated {len(volunteers)} volunteers. Recommended {top_name} based on required skill overlap and optimal workload distribution.",
                    )
            except Exception as e:
                logger.warning(f"Groq AI volunteer matchmaking failed or timed out: {e}")

        # 5. Deterministic High-Precision Heuristic Matchmaker
        recommendations: List[AIVolunteerMatchItem] = []

        for v in volunteers:
            # Calculate overlapping skills
            matching_skills = []
            for req_skill in required_skills:
                req_lower = req_skill.lower()
                for v_skill in v.skills:
                    if req_lower in v_skill.lower() or v_skill.lower() in req_lower:
                        if v_skill not in matching_skills:
                            matching_skills.append(v_skill)

            skill_overlap_ratio = len(matching_skills) / max(1, len(required_skills))

            # Base score from skills: 0 to 50
            skill_score = min(50, int(skill_overlap_ratio * 50))
            if matching_skills:
                skill_score = max(skill_score, 25)

            # Availability score: 0 to 30
            avail_score = 30
            if v.availability_status == AvailabilityStatus.BUSY:
                avail_score = 15
            elif v.availability_status == AvailabilityStatus.ON_SHIFT:
                avail_score = 10
            elif v.availability_status == AvailabilityStatus.UNAVAILABLE:
                avail_score = 0

            # Workload score (burnout prevention): 0 to 20
            # 0 active tasks -> 20 pts; 1 -> 15 pts; 2 -> 10 pts; 3+ -> 5 pts
            workload_penalty = min(15, v.active_tasks_count * 5)
            workload_score = max(5, 20 - workload_penalty)

            total_score = skill_score + avail_score + workload_score
            total_score = min(98, max(25, total_score))

            # Generate smart rationale
            rationale_parts = []
            if matching_skills:
                rationale_parts.append(f"Matches skills in {', '.join(matching_skills)}")
            else:
                rationale_parts.append(f"Flexible operator in {v.department}")

            if v.availability_status == AvailabilityStatus.AVAILABLE:
                rationale_parts.append("currently available")
            else:
                rationale_parts.append(f"status is {v.availability_status.value}")

            if v.active_tasks_count == 0:
                rationale_parts.append("zero active workload (burnout risk: none)")
            else:
                rationale_parts.append(f"{v.active_tasks_count} active task(s)")

            rationale = "; ".join(rationale_parts) + "."

            recommendations.append(
                AIVolunteerMatchItem(
                    volunteer_id=v.id,
                    user_id=v.user_id,
                    full_name=v.full_name,
                    avatar_url=v.avatar_url,
                    match_score=total_score,
                    matching_skills=matching_skills,
                    match_rationale=rationale,
                    availability_status=v.availability_status,
                    active_tasks_count=v.active_tasks_count,
                    department=v.department,
                )
            )

        recommendations.sort(key=lambda x: x.match_score, reverse=True)

        best_cand = recommendations[0].full_name if recommendations else "candidates"
        return AIVolunteerMatchResponse(
            task_title=task_title,
            required_skills=required_skills,
            recommendations=recommendations,
            summary=f"Matched {len(recommendations)} candidate volunteers. {best_cand} ranked highest based on skill alignment and workload balance.",
        )
