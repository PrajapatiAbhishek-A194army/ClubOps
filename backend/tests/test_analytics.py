import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database.session import SessionLocal
from app.models.club import Club
from app.models.user import User
from app.services.auth_service import AuthService


def test_analytics_overview():
    client = TestClient(app)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "president@clubops.ai").first()
        club = db.query(Club).filter(Club.code == "gdsc-campus").first()
        assert user and club

        token = AuthService.create_user_token(user=user, active_club_id=club.id, active_role="PRESIDENT")
        headers = {"Authorization": f"Bearer {token}"}

        resp = client.get(f"/api/v1/clubs/{club.id}/analytics/overview", headers=headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        data = body["data"]

        # Health score
        assert "health_score" in data
        assert 0 <= data["health_score"]["overall_score"] <= 100
        assert data["health_score"]["status_tier"] in ["EXCELLENT", "HEALTHY", "NEEDS_ATTENTION", "CRITICAL"]
        assert len(data["health_score"]["components"]) == 4

        # Cadence & Velocity
        assert "event_cadence" in data
        assert "task_distribution" in data
        assert "priority_distribution" in data
        assert "volunteer_leaderboard" in data
        assert "risk_breakdown" in data
        assert "ai_insights" in data
    finally:
        db.close()


def test_ai_insights_endpoint():
    client = TestClient(app)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "president@clubops.ai").first()
        club = db.query(Club).filter(Club.code == "gdsc-campus").first()

        token = AuthService.create_user_token(user=user, active_club_id=club.id, active_role="PRESIDENT")
        headers = {"Authorization": f"Bearer {token}"}

        resp = client.get(f"/api/v1/clubs/{club.id}/analytics/ai-insights", headers=headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        insights = body["data"]

        assert "health_assessment" in insights
        assert isinstance(insights["operational_strengths"], list)
        assert isinstance(insights["critical_bottlenecks"], list)
        assert isinstance(insights["actionable_recommendations"], list)
    finally:
        db.close()


def test_csv_export_endpoint():
    client = TestClient(app)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "president@clubops.ai").first()
        club = db.query(Club).filter(Club.code == "gdsc-campus").first()

        token = AuthService.create_user_token(user=user, active_club_id=club.id, active_role="PRESIDENT")
        headers = {"Authorization": f"Bearer {token}"}

        resp = client.get(f"/api/v1/clubs/{club.id}/analytics/export", headers=headers)
        assert resp.status_code == 200
        assert "text/csv" in resp.headers.get("content-type", "")
        assert "attachment" in resp.headers.get("content-disposition", "")
        csv_text = resp.text
        assert "CLUBOPS AI" in csv_text
        assert club.name in csv_text
        assert "TASK VELOCITY BREAKDOWN" in csv_text
    finally:
        db.close()
