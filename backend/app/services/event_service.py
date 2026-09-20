import json
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.config.settings import settings
from app.models.club import Club
from app.models.event import Event, EventStatus, EventType
from app.schemas.event import AIPlanRequest, AIPlanResponse, EventCreate, EventUpdate

logger = logging.getLogger(__name__)


def generate_slug(title: str) -> str:
    cleaned = re.sub(r"[^\w\s-]", "", title.lower()).strip()
    slug = re.sub(r"[-\s]+", "-", cleaned)
    return f"{slug}-{uuid.uuid4().hex[:6]}"


def compute_event_metrics(event: Event) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    start = event.start_date
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    
    delta = (start - now).days
    days_until_event = max(0, delta) if delta >= 0 else 0

    timeline = event.timeline or []
    total_milestones = len(timeline)
    completed_milestones = sum(1 for m in timeline if m.get("completed", False))
    progress_percent = int((completed_milestones / total_milestones) * 100) if total_milestones > 0 else 0

    return {
        "days_until_event": days_until_event,
        "progress_percent": progress_percent
    }


def enrich_event_response(event: Event) -> Event:
    metrics = compute_event_metrics(event)
    event.days_until_event = metrics["days_until_event"]
    event.progress_percent = metrics["progress_percent"]
    return event


class EventService:
    @staticmethod
    def get_club_events(
        db: Session,
        club_id: str,
        status: Optional[EventStatus] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Event]:
        query = db.query(Event).filter(Event.club_id == club_id)

        if status:
            query = query.filter(Event.status == status)

        if search:
            search_fmt = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Event.title.ilike(search_fmt),
                    Event.location.ilike(search_fmt),
                    Event.description.ilike(search_fmt),
                )
            )

        events = query.order_by(Event.start_date.asc()).offset(skip).limit(limit).all()
        return [enrich_event_response(e) for e in events]

    @staticmethod
    def get_event_by_id(db: Session, event_id: str, club_id: Optional[str] = None) -> Optional[Event]:
        query = db.query(Event).filter(Event.id == event_id)
        if club_id:
            query = query.filter(Event.club_id == club_id)
        event = query.first()
        if event:
            enrich_event_response(event)
        return event

    @staticmethod
    def create_event(
        db: Session,
        club_id: str,
        creator_id: Optional[str],
        event_in: EventCreate
    ) -> Event:
        club = db.query(Club).filter(Club.id == club_id).first()
        if not club:
            raise ValueError("Club not found")

        if event_in.end_date < event_in.start_date:
            raise ValueError("End date must be after start date")

        slug = generate_slug(event_in.title)

        timeline = event_in.timeline or [
            {
                "id": str(uuid.uuid4())[:8],
                "title": "Initial Planning & Theme Confirmation",
                "target_date": event_in.start_date.strftime("%Y-%m-%d"),
                "completed": True,
                "assigned_to": "Organizing Committee",
            },
            {
                "id": str(uuid.uuid4())[:8],
                "title": "Faculty & Campus Venue Approval",
                "target_date": event_in.start_date.strftime("%Y-%m-%d"),
                "completed": False,
                "assigned_to": "President",
            },
            {
                "id": str(uuid.uuid4())[:8],
                "title": "Sponsor Outreach & Track Finalization",
                "target_date": event_in.start_date.strftime("%Y-%m-%d"),
                "completed": False,
                "assigned_to": "Lead Organizer",
            },
            {
                "id": str(uuid.uuid4())[:8],
                "title": "Marketing & Registration Launch",
                "target_date": event_in.start_date.strftime("%Y-%m-%d"),
                "completed": False,
                "assigned_to": "Media Team",
            },
        ]

        checklists = event_in.checklists or {
            "sponsor_checklist": [
                "Draft sponsorship brochure and deliverables document",
                "Confirm payment gateway and university receipt structure",
                "Review sponsor logos on event website and badges",
            ],
            "judge_checklist": [
                "Finalize rubric criteria (Creativity, Technical Complexity, Presentation)",
                "Send briefing deck to industry judges 48h prior",
                "Reserve judge evaluation lounge and refreshment tokens",
            ],
            "volunteer_specs": [
                "Check-in & Badge Distribution: 4 volunteers",
                "Stage & AV Production: 2 volunteers",
                "Mentorship & Floor Coordination: 6 volunteers",
            ],
        }

        event = Event(
            club_id=club_id,
            created_by_id=creator_id,
            title=event_in.title,
            slug=slug,
            description=event_in.description,
            location=event_in.location,
            event_type=event_in.event_type,
            status=EventStatus.PLANNING,
            start_date=event_in.start_date,
            end_date=event_in.end_date,
            budget=event_in.budget,
            timeline=timeline,
            checklists=checklists,
        )

        db.add(event)
        db.commit()
        db.refresh(event)
        return enrich_event_response(event)

    @staticmethod
    def update_event(
        db: Session,
        event: Event,
        event_update: EventUpdate
    ) -> Event:
        update_data = event_update.model_dump(exclude_unset=True)

        if "start_date" in update_data and "end_date" in update_data:
            if update_data["end_date"] < update_data["start_date"]:
                raise ValueError("End date must be after start date")
        elif "end_date" in update_data and update_data["end_date"] < event.start_date:
            raise ValueError("End date must be after start date")
        elif "start_date" in update_data and event.end_date < update_data["start_date"]:
            raise ValueError("End date must be after start date")

        if "title" in update_data and update_data["title"] != event.title:
            event.slug = generate_slug(update_data["title"])

        for field, value in update_data.items():
            setattr(event, field, value)

        db.commit()
        db.refresh(event)
        return enrich_event_response(event)

    @staticmethod
    def toggle_milestone(
        db: Session,
        event: Event,
        milestone_id: str,
        completed: bool
    ) -> Event:
        timeline = list(event.timeline or [])
        found = False

        for item in timeline:
            if item.get("id") == milestone_id:
                item["completed"] = completed
                found = True
                break

        if not found:
            raise ValueError(f"Milestone {milestone_id} not found in event timeline")

        event.timeline = timeline

        # Auto-adjust event status based on milestone completion
        all_completed = all(m.get("completed", False) for m in timeline)
        if all_completed and len(timeline) > 0:
            event.status = EventStatus.COMPLETED
        elif any(m.get("completed", False) for m in timeline):
            event.status = EventStatus.ON_TRACK

        db.commit()
        db.refresh(event)
        return enrich_event_response(event)

    @staticmethod
    def delete_event(db: Session, event: Event) -> None:
        db.delete(event)
        db.commit()

    @staticmethod
    def _default_timeline(anchor_date) -> List[Dict[str, Any]]:
        return [
            {
                "id": "m1",
                "title": "Finalize Event Charter & Seek Administrative Approvals",
                "target_date": (anchor_date - timedelta(days=21)).strftime("%Y-%m-%d"),
                "completed": True,
                "assigned_to": "President",
            },
            {
                "id": "m2",
                "title": "Secure Campus Auditorium & Audiovisual Rigging",
                "target_date": (anchor_date - timedelta(days=14)).strftime("%Y-%m-%d"),
                "completed": False,
                "assigned_to": "Club Head",
            },
            {
                "id": "m3",
                "title": "Launch Student Registration & Social Media PR Campaign",
                "target_date": (anchor_date - timedelta(days=7)).strftime("%Y-%m-%d"),
                "completed": False,
                "assigned_to": "Volunteer",
            },
            {
                "id": "m4",
                "title": "Confirm Industry Mentors & Finalize Judging Rubric",
                "target_date": (anchor_date - timedelta(days=3)).strftime("%Y-%m-%d"),
                "completed": False,
                "assigned_to": "Club Head",
            },
            {
                "id": "m5",
                "title": "Volunteer Briefing, Shift Schedules & Badge Assembly",
                "target_date": (anchor_date - timedelta(days=1)).strftime("%Y-%m-%d"),
                "completed": False,
                "assigned_to": "Volunteer",
            },
            {
                "id": "m6",
                "title": "Live Day Execution, On-Site Moderation & Awards Ceremony",
                "target_date": anchor_date.strftime("%Y-%m-%d"),
                "completed": False,
                "assigned_to": "Club Head",
            },
        ]

    @classmethod
    def generate_ai_plan(cls, plan_req: AIPlanRequest) -> AIPlanResponse:
        """
        Calls Groq API to generate a high-structure event operation plan.
        Supports prompt-driven generation where AI crafts the event title,
        respects user-provided budget, schedules concrete calendar dates (YYYY-MM-DD),
        and strictly maps responsibilities to President, Club Head, or Volunteer.
        """
        prompt_text = (plan_req.prompt or plan_req.title or "Campus Technical Workshop").strip()
        user_budget = float(plan_req.budget) if (plan_req.budget is not None and plan_req.budget > 0) else None

        # Anchor date for timeline milestones (default: 14 days in the future if not specified)
        if plan_req.start_date:
            anchor_date = plan_req.start_date.date() if hasattr(plan_req.start_date, "date") else plan_req.start_date
        else:
            anchor_date = (datetime.utcnow() + timedelta(days=14)).date()

        anchor_date_str = anchor_date.strftime("%Y-%m-%d")

        def normalize_role(raw_role: str) -> str:
            r = (raw_role or "").lower()
            if "president" in r:
                return "President"
            elif "head" in r or "organizer" in r or "chair" in r:
                return "Club Head"
            else:
                return "Volunteer"

        def is_valid_date(val: str) -> bool:
            try:
                datetime.strptime(val, "%Y-%m-%d")
                return True
            except (ValueError, TypeError):
                return False

        if settings.GROQ_API_KEY:
            from groq import Groq
            client = Groq(api_key=settings.GROQ_API_KEY)

            candidate_models = [
                settings.GROQ_MODEL,
                "openai/gpt-oss-120b",
                "groq/compound-mini",
                "qwen/qwen3.8-27b",
            ]
            seen_models = set()
            models_to_try = [m for m in candidate_models if m and not (m in seen_models or seen_models.add(m))]

            budget_instruction = (
                f"The user has explicitly allocated an exact budget of ₹{user_budget:g} INR. You MUST return {user_budget:g} as 'suggested_budget'."
                if user_budget
                else "Suggest a realistic budget in Indian Rupees (₹ INR) as a single number (e.g. 8000, 15000, 35000)."
            )

            system_prompt = (
                "You are the senior event operations architect for ClubOps AI for Indian university campus clubs.\n"
                "Given the student club event prompt and parameters, output a structured JSON plan with:\n"
                "1. 'suggested_title': A compelling, professional 3-7 word event title based on the prompt.\n"
                "2. 'suggested_description': A professional 2-3 sentence overview.\n"
                f"3. 'suggested_budget': {budget_instruction}\n"
                f"4. 'timeline': Array of 4 to 6 milestones leading up to the event date ({anchor_date_str}). Each milestone MUST have:\n"
                "   - 'id': e.g. 'm1', 'm2'\n"
                "   - 'title': Clear operational deliverable\n"
                f"   - 'target_date': Real concrete calendar date in YYYY-MM-DD format (calculated backwards from {anchor_date_str}). DO NOT use relative text like '2 Weeks Prior' or 'Week Prior'.\n"
                "   - 'completed': false\n"
                "   - 'assigned_to': Strictly ONE of these three campus roles: 'President', 'Club Head', or 'Volunteer'.\n"
                "5. 'checklists': Object with 'sponsor_checklist' (array of strings), 'judge_checklist' (array of strings), and 'volunteer_specs' (array of strings).\n"
                "Respond ONLY with valid JSON."
            )

            duration_str = (
                f"{plan_req.duration_hours:g} hour(s)"
                if plan_req.duration_hours
                else f"{plan_req.duration_days} day(s)"
            )
            user_prompt = (
                f"Event Prompt / Vision: {prompt_text}\n"
                f"Event Type: {plan_req.event_type.value}\n"
                f"Planned Event Date: {anchor_date_str}\n"
                f"Planned Duration: {duration_str}\n"
                f"Expected Attendees: {plan_req.expected_attendees}\n"
                + (f"User Allocated Budget: ₹{user_budget:g} INR\n" if user_budget else "")
                + f"Focus Areas: {plan_req.focus_areas or 'Hands-on practical session, student collaboration'}\n"
            )

            for model_name in models_to_try:
                try:
                    chat_completion = client.chat.completions.create(
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        model=model_name,
                        temperature=0.3,
                        max_tokens=1500,
                        response_format={"type": "json_object"},
                    )

                    content = chat_completion.choices[0].message.content
                    data = json.loads(content)

                    # Title
                    suggested_title = data.get("suggested_title") or plan_req.title or prompt_text[:60].strip()

                    # Budget
                    if user_budget is not None:
                        budget_val = user_budget
                    else:
                        raw_budget = data.get("suggested_budget", 10000.0)
                        if isinstance(raw_budget, dict):
                            budget_val = float(raw_budget.get("total_inr", raw_budget.get("total", 10000.0)))
                        else:
                            try:
                                budget_val = float(raw_budget)
                            except (TypeError, ValueError):
                                budget_val = 10000.0

                    # Normalize timeline milestones
                    raw_timeline = data.get("timeline", [])
                    clean_timeline = []
                    fallback_offsets = [21, 14, 7, 3, 1, 0]

                    if isinstance(raw_timeline, list):
                        for idx, item in enumerate(raw_timeline):
                            if isinstance(item, dict):
                                m_id = str(item.get("id") or f"m{idx+1}")
                                m_title = item.get("title") or item.get("milestone") or f"Milestone {idx+1}"
                                raw_date = str(item.get("target_date") or item.get("deadline") or "")
                                if is_valid_date(raw_date):
                                    m_date = raw_date
                                else:
                                    days_back = fallback_offsets[idx] if idx < len(fallback_offsets) else 1
                                    m_date = (anchor_date - timedelta(days=days_back)).strftime("%Y-%m-%d")

                                clean_timeline.append({
                                    "id": m_id,
                                    "title": m_title,
                                    "target_date": m_date,
                                    "completed": bool(item.get("completed", False)),
                                    "assigned_to": normalize_role(str(item.get("assigned_to", ""))),
                                })

                    # Normalize checklists
                    raw_checklists = data.get("checklists", {})
                    clean_checklists = {
                        "sponsor_checklist": raw_checklists.get("sponsor_checklist", []) if isinstance(raw_checklists, dict) else [],
                        "judge_checklist": raw_checklists.get("judge_checklist", []) if isinstance(raw_checklists, dict) else [],
                        "volunteer_specs": raw_checklists.get("volunteer_specs", []) if isinstance(raw_checklists, dict) else [],
                    }

                    logger.info(f"Successfully generated AI event plan using Groq model: {model_name}")
                    return AIPlanResponse(
                        suggested_title=str(suggested_title),
                        suggested_description=str(data.get("suggested_description", f"Interactive {suggested_title} for campus students.")),
                        suggested_budget=max(0.0, budget_val),
                        timeline=clean_timeline or cls._default_timeline(anchor_date),
                        checklists=clean_checklists,
                    )
                except Exception as e:
                    logger.warning(f"Groq model {model_name} failed: {e}. Trying next available model...")

            logger.warning("All Groq models failed. Utilizing intelligent deterministic fallback.")

        # Deterministic Fallback Plan (in INR)
        budget_calc = user_budget if user_budget is not None else max(5000.0, plan_req.expected_attendees * 150.0)
        clean_fallback_title = plan_req.title or f"{prompt_text[:50].strip().title()}"
        if not any(clean_fallback_title.lower().endswith(w) for w in ["workshop", "hackathon", "summit", "meetup", "bootcamp", "expo"]):
            clean_fallback_title += f" {plan_req.event_type.value.title()}"

        return AIPlanResponse(
            suggested_title=clean_fallback_title,
            suggested_description=(
                f"A high-impact {plan_req.event_type.value.lower()} bringing together {plan_req.expected_attendees} students "
                f"for collaborative innovation, hands-on building, and mentorship. Focus: {plan_req.focus_areas or prompt_text}."
            ),
            suggested_budget=budget_calc,
            timeline=cls._default_timeline(anchor_date),
            checklists={
                "sponsor_checklist": [
                    "Prepare tier brochure (Title, Platinum, Gold) with branding slots",
                    "Verify sponsor banners in main auditorium",
                    "Distribute sponsor giveaway bags to checked-in attendees",
                ],
                "judge_checklist": [
                    "Distribute scoring rubric across Innovation, Architecture, and Impact",
                    "Ensure dedicated high-speed Wi-Fi network for judges",
                    "Host 15-minute alignment sync before team presentations",
                ],
                "volunteer_specs": [
                    f"Registration Desk: {max(2, plan_req.expected_attendees // 50)} volunteers",
                    "Technical Support & Projector Monitoring: 2 volunteers",
                    "Hospitality & Refreshments: 3 volunteers",
                ],
            },
        )
