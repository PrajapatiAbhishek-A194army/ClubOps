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
    def generate_ai_plan(plan_req: AIPlanRequest) -> AIPlanResponse:
        """
        Calls Groq API (llama-3.3-70b-versatile) to generate a high-structure
        event operation plan. Includes deterministic fallback if Groq API fails.
        """
        if settings.GROQ_API_KEY:
            from groq import Groq
            client = Groq(api_key=settings.GROQ_API_KEY)

            candidate_models = [
                settings.GROQ_MODEL,
                "openai/gpt-oss-120b",
                "groq/compound-mini",
                "qwen/qwen3.8-27b",
            ]
            # Deduplicate while preserving order
            seen_models = set()
            models_to_try = [m for m in candidate_models if m and not (m in seen_models or seen_models.add(m))]

            system_prompt = (
                "You are the senior event operations architect for ClubOps AI. "
                "Given the student club event parameters, output a structured JSON plan with:\n"
                "1. 'suggested_description': A professional 2-3 sentence overview.\n"
                "2. 'suggested_budget': Total estimated cost in USD as a single number.\n"
                "3. 'timeline': Array of 4 to 6 milestones, each with 'id', 'title', 'target_date' (e.g. '2 Weeks Prior'), 'completed': false, and 'assigned_to' (e.g. 'Tech Lead', 'Event Chair').\n"
                "4. 'checklists': Object with 'sponsor_checklist' (array of strings), 'judge_checklist' (array of strings), and 'volunteer_specs' (array of strings).\n"
                "Respond ONLY with valid JSON."
            )
            duration_str = (
                f"{plan_req.duration_hours:g} hour(s)"
                if plan_req.duration_hours
                else f"{plan_req.duration_days} day(s)"
            )
            user_prompt = (
                f"Event Title: {plan_req.title}\n"
                f"Event Type: {plan_req.event_type.value}\n"
                f"Planned Duration: {duration_str}\n"
                f"Expected Attendees: {plan_req.expected_attendees}\n"
                f"Focus Areas: {plan_req.focus_areas or 'Interactive hands-on session, student collaboration'}\n"
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

                    # Normalize budget
                    raw_budget = data.get("suggested_budget", 500.0)
                    if isinstance(raw_budget, dict):
                        budget_val = float(raw_budget.get("total_usd", raw_budget.get("total", sum(v for v in raw_budget.values() if isinstance(v, (int, float))))))
                    else:
                        try:
                            budget_val = float(raw_budget)
                        except (TypeError, ValueError):
                            budget_val = 500.0

                    # Normalize timeline milestones
                    raw_timeline = data.get("timeline", [])
                    clean_timeline = []
                    if isinstance(raw_timeline, list):
                        for idx, item in enumerate(raw_timeline):
                            if isinstance(item, dict):
                                clean_timeline.append({
                                    "id": str(item.get("id") or f"m{idx+1}"),
                                    "title": item.get("title") or item.get("milestone") or f"Milestone {idx+1}",
                                    "target_date": str(item.get("target_date") or item.get("deadline") or "Ongoing"),
                                    "completed": bool(item.get("completed", False)),
                                    "assigned_to": str(item.get("assigned_to") or "Organizing Committee"),
                                })

                    # Normalize checklists
                    raw_checklists = data.get("checklists", {})
                    if isinstance(raw_checklists, dict):
                        clean_checklists = {
                            "sponsor_checklist": raw_checklists.get("sponsor_checklist", []),
                            "judge_checklist": raw_checklists.get("judge_checklist", []),
                            "volunteer_specs": raw_checklists.get("volunteer_specs", []),
                        }
                    elif isinstance(raw_checklists, list):
                        clean_checklists = {
                            "sponsor_checklist": raw_checklists[:3],
                            "judge_checklist": [],
                            "volunteer_specs": raw_checklists[3:],
                        }
                    else:
                        clean_checklists = {"sponsor_checklist": [], "judge_checklist": [], "volunteer_specs": []}

                    logger.info(f"Successfully generated AI event plan using Groq model: {model_name}")
                    return AIPlanResponse(
                        suggested_description=str(data.get("suggested_description", f"Interactive {plan_req.title} for campus students.")),
                        suggested_budget=max(0.0, budget_val),
                        timeline=clean_timeline,
                        checklists=clean_checklists,
                    )
                except Exception as e:
                    logger.warning(f"Groq model {model_name} failed: {e}. Trying next available model...")

            logger.warning("All Groq models failed. Utilizing intelligent deterministic fallback.")

        # Deterministic Fallback Plan
        budget_calc = max(300.0, plan_req.expected_attendees * 15.0)
        return AIPlanResponse(
            suggested_description=(
                f"A high-impact {plan_req.event_type.value.lower()} bringing together {plan_req.expected_attendees} students "
                f"for collaborative innovation, hands-on building, and mentorship. Focus: {plan_req.focus_areas or 'Interactive learning and real-world execution'}."
            ),
            suggested_budget=budget_calc,
            timeline=[
                {
                    "id": "m1",
                    "title": "Establish Core Committee & Finalize Event Concept",
                    "target_date": "4 Weeks Prior",
                    "completed": True,
                    "assigned_to": "President & Leads",
                },
                {
                    "id": "m2",
                    "title": "Secure Auditorium / Lab Booking & AV Permissions",
                    "target_date": "3 Weeks Prior",
                    "completed": False,
                    "assigned_to": "Logistics Lead",
                },
                {
                    "id": "m3",
                    "title": "Launch Registration Portal & Social Media Teaser Campaign",
                    "target_date": "2 Weeks Prior",
                    "completed": False,
                    "assigned_to": "Marketing Team",
                },
                {
                    "id": "m4",
                    "title": "Confirm Guest Speakers, Workshop Mentors & Industry Judges",
                    "target_date": "10 Days Prior",
                    "completed": False,
                    "assigned_to": "Faculty Coordinator",
                },
                {
                    "id": "m5",
                    "title": "Volunteer Briefing & Swag / Refreshment Deliveries",
                    "target_date": "2 Days Prior",
                    "completed": False,
                    "assigned_to": "Volunteer Head",
                },
                {
                    "id": "m6",
                    "title": "Event Execution, Live Moderation & Closing Ceremony",
                    "target_date": "Event Day",
                    "completed": False,
                    "assigned_to": "All Hands",
                },
            ],
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
