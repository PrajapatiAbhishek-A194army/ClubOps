import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database.session import SessionLocal
from app.models.club import Club, ClubMembership, ClubRole, ClubStatus
from app.models.event import Event, EventStatus, EventType
from app.models.task import Task, TaskPriority, TaskStatus
from app.models.user import User
from app.services.auth_service import AuthService


def test_president_dashboard_metrics():
    client = TestClient(app)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "president@clubops.ai").first()
        assert user is not None
        club = db.query(Club).filter(Club.code == "gdsc-campus").first()
        assert club is not None

        token = AuthService.create_user_token(user=user, active_club_id=club.id, active_role="PRESIDENT")
        headers = {"Authorization": f"Bearer {token}"}

        resp = client.get(f"/api/v1/clubs/{club.id}/dashboard?perspective=PRESIDENT", headers=headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["data"]["perspective"] == "PRESIDENT"
        d = body["data"]["data"]
        assert "active_events" in d
        assert "pending_join_requests_count" in d
        assert "pending_announcements_count" in d
        assert "task_completion_rate" in d
        assert "total_tasks_count" in d
        assert "total_risks_count" in d
    finally:
        db.close()


def test_organizer_dashboard_metrics():
    client = TestClient(app)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "organizer@clubops.ai").first()
        if not user:
            user = db.query(User).filter(User.email == "president@clubops.ai").first()
        club = db.query(Club).filter(Club.code == "gdsc-campus").first()

        token = AuthService.create_user_token(user=user, active_club_id=club.id, active_role="ORGANIZER")
        headers = {"Authorization": f"Bearer {token}"}

        resp = client.get(f"/api/v1/clubs/{club.id}/dashboard?perspective=ORGANIZER", headers=headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["data"]["perspective"] == "ORGANIZER"
        d = body["data"]["data"]
        assert "today_tasks" in d
        assert "volunteer_availability_stats" in d
        assert "meeting_action_items" in d
        assert "recent_announcements" in d
    finally:
        db.close()


def test_lead_volunteer_dashboard_metrics():
    client = TestClient(app)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "techlead@clubops.ai").first()
        if not user:
            user = db.query(User).filter(User.email == "president@clubops.ai").first()
        club = db.query(Club).filter(Club.code == "gdsc-campus").first()

        token = AuthService.create_user_token(user=user, active_club_id=club.id, active_role="VOLUNTEER")
        headers = {"Authorization": f"Bearer {token}"}

        resp = client.get(f"/api/v1/clubs/{club.id}/dashboard?perspective=VOLUNTEER", headers=headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["data"]["perspective"] == "VOLUNTEER"
        d = body["data"]["data"]
        assert "my_tasks" in d
        assert "my_checkin_status" in d
    finally:
        db.close()


def test_volunteer_dashboard_and_checkin():
    client = TestClient(app)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "volunteer@clubops.ai").first()
        if not user:
            user = db.query(User).filter(User.email == "president@clubops.ai").first()
        club = db.query(Club).filter(Club.code == "gdsc-campus").first()

        token = AuthService.create_user_token(user=user, active_club_id=club.id, active_role="VOLUNTEER")
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Fetch volunteer dashboard
        resp = client.get(f"/api/v1/clubs/{club.id}/dashboard?perspective=VOLUNTEER", headers=headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["data"]["perspective"] == "VOLUNTEER"
        d = body["data"]["data"]
        assert "my_tasks" in d
        assert "my_checkin_status" in d

        # 2. Toggle volunteer check-in
        checkin_resp = client.post(
            f"/api/v1/clubs/{club.id}/dashboard/check-in",
            json={"status": "CHECKED_IN"},
            headers=headers,
        )
        assert checkin_resp.status_code == 200
        checkin_data = checkin_resp.json()
        assert checkin_data["success"] is True
        assert checkin_data["data"]["check_in_status"] == "CHECKED_IN"
    finally:
        db.close()
