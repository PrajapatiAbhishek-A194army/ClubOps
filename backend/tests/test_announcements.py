import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.database.session import SessionLocal
from app.models.announcement import Announcement, AnnouncementStatus, AnnouncementSource
from app.models.club import Club, ClubMembership, ClubRole, ClubStatus
from app.models.event import Event, EventStatus, EventType
from app.models.notification import Notification
from app.models.user import User
from app.schemas.announcement import (
    AIGenerateAnnouncementRequest,
    AnnouncementCategory,
    AnnouncementChannel,
    AnnouncementCreate,
    AnnouncementTone,
    AnnouncementUpdate,
)
from app.services.announcement_service import AnnouncementService
from app.services.auth_service import AuthService


def test_ai_announcement_generation():
    db = SessionLocal()
    try:
        club = db.query(Club).filter(Club.code == "gdsc-campus").first()
        if not club:
            club = Club(name="Test GDSC", code="gdsc-campus", status=ClubStatus.ACTIVE)
            db.add(club)
            db.flush()

        categories = [
            AnnouncementCategory.REGISTRATION_REMINDER,
            AnnouncementCategory.VENUE_UPDATE,
            AnnouncementCategory.EMERGENCY_NOTICE,
            AnnouncementCategory.COMPLETION_MESSAGE,
        ]

        for cat in categories:
            req = AIGenerateAnnouncementRequest(
                category=cat,
                tone=AnnouncementTone.ENTHUSIASTIC,
                target_channel=AnnouncementChannel.EMAIL,
                custom_notes="Bring laptops and student IDs.",
            )
            resp = AnnouncementService.generate_ai_announcement(db=db, club_id=club.id, req=req)
            assert resp is not None
            assert len(resp.title) > 5
            assert len(resp.content) > 20
            assert resp.category == cat.value
            assert resp.call_to_action is not None
    finally:
        db.close()


def test_announcement_crud_and_status():
    db = SessionLocal()
    try:
        club = db.query(Club).filter(Club.code == "gdsc-campus").first()
        user = db.query(User).filter(User.email == "president@clubops.ai").first()

        # Create
        create_payload = AnnouncementCreate(
            title="Campus Hackathon Pre-Briefing",
            content="All registered attendees please review the team formation guidelines on Discord.",
            category="REGISTRATION_REMINDER",
            target_channel="EMAIL",
            status="DRAFT",
            created_source="MANUAL",
        )
        ann = AnnouncementService.create_announcement(
            db=db,
            club_id=club.id,
            creator_id=user.id if user else "test-user-id",
            ann_in=create_payload,
        )
        assert ann.id is not None
        assert ann.status == AnnouncementStatus.DRAFT
        assert ann.title == "Campus Hackathon Pre-Briefing"

        # Update
        updated = AnnouncementService.update_announcement(
            db=db,
            announcement=ann,
            ann_update=AnnouncementUpdate(title="Campus Hackathon Pre-Briefing (Updated Venue)"),
        )
        assert updated.title == "Campus Hackathon Pre-Briefing (Updated Venue)"

        # List
        all_anns = AnnouncementService.get_club_announcements(db=db, club_id=club.id)
        assert any(a.id == ann.id for a in all_anns)

        # Delete
        AnnouncementService.delete_announcement(db=db, announcement=ann)
        assert AnnouncementService.get_announcement_by_id(db=db, club_id=club.id, announcement_id=ann.id) is None
    finally:
        db.close()


def test_announcement_api_publish_and_broadcast():
    client = TestClient(app)
    db = SessionLocal()
    try:
        president = db.query(User).filter(User.email == "president@clubops.ai").first()
        assert president is not None
        club = db.query(Club).filter(Club.code == "gdsc-campus").first()
        assert club is not None

        token = AuthService.create_user_token(user=president, active_club_id=club.id, active_role="PRESIDENT")
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Test AI Generator Endpoint
        ai_resp = client.post(
            f"/api/v1/clubs/{club.id}/announcements/generate-ai",
            json={
                "category": "VENUE_UPDATE",
                "tone": "PROFESSIONAL",
                "target_channel": "EMAIL",
                "custom_notes": "Main auditorium AC is fixed and ready.",
            },
            headers=headers,
        )
        assert ai_resp.status_code == 200
        ai_data = ai_resp.json()
        assert ai_data["success"] is True
        assert "Venue" in ai_data["data"]["title"] or "Update" in ai_data["data"]["title"]

        # 2. Create Announcement via API
        create_resp = client.post(
            f"/api/v1/clubs/{club.id}/announcements",
            json={
                "title": "Confirmed Venue for Tech Symposium",
                "content": "The conference will take place in Building 3, Room 402 with high speed Wi-Fi provided.",
                "category": "VENUE_UPDATE",
                "target_channel": "EMAIL",
                "status": "DRAFT",
            },
            headers=headers,
        )
        assert create_resp.status_code == 201
        created_ann = create_resp.json()["data"]
        ann_id = created_ann["id"]
        assert created_ann["status"] == "DRAFT"

        # 3. Publish Announcement with Brevo Email & In-App Broadcast
        pub_resp = client.post(
            f"/api/v1/clubs/{club.id}/announcements/{ann_id}/publish",
            json={
                "broadcast_email": True,
                "dispatch_in_app": True,
            },
            headers=headers,
        )
        assert pub_resp.status_code == 200
        pub_data = pub_resp.json()["data"]
        assert pub_data["status"] == "PUBLISHED"
        assert pub_data["published_at"] is not None

        # Verify in-app notifications were created
        notifs = db.query(Notification).filter(Notification.title.contains("Confirmed Venue for Tech Symposium")).all()
        assert len(notifs) >= 1

        # Clean up
        del_resp = client.delete(f"/api/v1/clubs/{club.id}/announcements/{ann_id}", headers=headers)
        assert del_resp.status_code == 200
    finally:
        db.close()
