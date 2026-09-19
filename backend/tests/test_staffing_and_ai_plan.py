# Automated Test for AI Staffing & Skill Breakdown
from datetime import datetime, timedelta
from app.database.session import SessionLocal
from app.models.club import Club, ClubMembership, ClubRole, ClubStatus
from app.models.event import Event, EventStatus, EventType
from app.models.skill import Skill, VolunteerSkill
from app.models.user import User
from app.models.availability import Availability, AvailabilityStatus
from app.services.staffing_service import StaffingService
from app.utils.security import get_password_hash


def test_ai_staffing_estimation_and_matching():
    db = SessionLocal()
    try:
        now = datetime.utcnow()

        # Retrieve or create CoderClub and a test event
        club = db.query(Club).filter(Club.code == "coder").first()
        if not club:
            club = Club(name="CoderClub Test", code="coder", status=ClubStatus.ACTIVE)
            db.add(club)
            db.flush()

        event = Event(
            club_id=club.id,
            title="Advanced Python Data Engineering Workshop",
            slug="advanced-python-data-workshop",
            event_type=EventType.WORKSHOP,
            status=EventStatus.DRAFT,
            start_date=now + timedelta(days=7),
            end_date=now + timedelta(days=7, hours=4),
            location="Room 204",
        )
        db.add(event)
        db.flush()

        # Run Staffing Service
        plan = StaffingService.estimate_event_staffing_and_plan(db=db, event=event)

        # Assert minimum volunteers required
        assert plan.min_volunteers_required >= 4
        # Assert skill requirements count breakdown
        assert len(plan.skill_requirements) >= 2
        for sr in plan.skill_requirements:
            assert sr.required_count >= 1
            assert len(sr.skill_name) > 0

        # Assert proposed tasks
        assert len(plan.proposed_tasks) >= 3
        assert len(plan.ai_explanation) > 10

        # Verify event entity was updated with the staffing requirements
        db.refresh(event)
        assert event.min_volunteers_required == plan.min_volunteers_required
        assert isinstance(event.skill_requirements, list)

    finally:
        db.rollback()
        db.close()
