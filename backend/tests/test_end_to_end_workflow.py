import uuid
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.database.session import SessionLocal
from app.models.club import Club, ClubMembership
from app.models.user import User
from app.models.event import Event, EventStatus
from app.models.task import Task, TaskStatus, TaskPriority
from app.services.auth_service import AuthService
from app.services.audit_service import AuditService, AuditSource, AuditResult


@pytest.fixture
def client():
    return TestClient(app)


def test_complete_master_operational_workflow(client):
    """
    End-to-End Master Workflow Integration Test:
    1. Auth & Club Context Resolution
    2. Event Creation & Lifecycle
    3. AI Staffing Plan & Task Generation
    4. Volunteer Profile & Task Assignment Kanban
    5. Deterministic Risk Radar Scanning
    6. Meeting Ingestion & Action Item Parsing
    7. Multi-Channel Announcement Generation & Publishing
    8. Real-Time Collaboration Gateway (Chat Messaging)
    9. Deterministic Club Health Analytics & Advisor
    10. Cryptographic SHA-256 Audit Trail & Live Integrity Verification
    """
    db = SessionLocal()
    try:
        # 1. Setup Club and Actors
        club = db.query(Club).filter(Club.code == "gdsc-campus").first()
        if not club:
            club = Club(id=str(uuid.uuid4()), name="Master Test Club", code="master-club")
            db.add(club)
            db.commit()
            db.refresh(club)

        president_user = db.query(User).filter(User.email == "president@clubops.ai").first()
        organizer_user = db.query(User).filter(User.email == "organizer@clubops.ai").first()
        volunteer_user = db.query(User).filter(User.email == "volunteer@clubops.ai").first()

        assert president_user and organizer_user and volunteer_user, "Seed users must exist"

        # Ensure memberships exist for test
        from app.models.club import ClubRole
        for u, role in [(president_user, ClubRole.PRESIDENT), (organizer_user, ClubRole.ORGANIZER), (volunteer_user, ClubRole.VOLUNTEER)]:
            mem = db.query(ClubMembership).filter(ClubMembership.club_id == club.id, ClubMembership.user_id == u.id).first()
            if not mem:
                db.add(ClubMembership(id=str(uuid.uuid4()), club_id=club.id, user_id=u.id, role=role))
            elif mem.role != role:
                mem.role = role
        db.commit()

        pres_token = AuthService.create_user_token(president_user, active_club_id=club.id, active_role="PRESIDENT")
        org_token = AuthService.create_user_token(organizer_user, active_club_id=club.id, active_role="ORGANIZER")
        vol_token = AuthService.create_user_token(volunteer_user, active_club_id=club.id, active_role="VOLUNTEER")

        pres_headers = {"Authorization": f"Bearer {pres_token}"}
        org_headers = {"Authorization": f"Bearer {org_token}"}
        vol_headers = {"Authorization": f"Bearer {vol_token}"}

        # Verify club profile retrieval
        club_res = client.get(f"/api/v1/clubs/{club.id}", headers=org_headers)
        assert club_res.status_code == 200
        assert club_res.json()["data"]["id"] == club.id

        # 2. Event Creation
        start_date = (datetime.utcnow() + timedelta(days=7)).isoformat()
        end_date = (datetime.utcnow() + timedelta(days=8)).isoformat()
        event_payload = {
            "title": f"Master Hackathon {uuid.uuid4().hex[:6]}",
            "description": "Comprehensive annual tech hackathon with AI workshops and project demos",
            "event_type": "HACKATHON",
            "start_date": start_date,
            "end_date": end_date,
            "location": "Main Auditorium & Virtual",
            "budget": 2500.0,
        }
        event_res = client.post(f"/api/v1/clubs/{club.id}/events", json=event_payload, headers=org_headers)
        assert event_res.status_code in (200, 201), event_res.text
        event_data = event_res.json()["data"]
        event_id = event_data["id"]
        assert event_data["title"] == event_payload["title"]

        # 3. AI Workflow Execution Engine (Tool calling & LangGraph state machine)
        workflow_res = client.post(
            f"/api/v1/clubs/{club.id}/workflows/execute",
            json={"prompt": "Coordinate AV testing and stage lighting before Friday."},
            headers=org_headers
        )
        assert workflow_res.status_code == 200
        wf_data = workflow_res.json()["data"]
        assert wf_data["current_stage"] in ["COMPLETED", "AI_PROCESSED"]
        assert len(wf_data["audit_trail"]) > 0

        # 4. Volunteer Profile & Task Assignment Kanban
        vol_list_res = client.get(f"/api/v1/clubs/{club.id}/volunteers", headers=org_headers)
        assert vol_list_res.status_code == 200

        # Create Task for Event
        task_payload = {
            "title": "Stage Logistics & AV Setup",
            "description": "Configure audio, stage projectors, and live streaming gear",
            "priority": "HIGH",
            "deadline": (datetime.utcnow() + timedelta(days=6)).isoformat(),
            "status": "TODO",
        }
        task_res = client.post(f"/api/v1/clubs/{club.id}/tasks", json=task_payload, headers=org_headers)
        assert task_res.status_code in (200, 201), task_res.text
        task_data = task_res.json()["data"]
        task_id = task_data["id"]

        # Volunteer moves task: TODO -> IN_PROGRESS -> DONE
        update_in_progress = client.patch(
            f"/api/v1/clubs/{club.id}/tasks/{task_id}/status",
            json={"status": "IN_PROGRESS"},
            headers=vol_headers
        )
        assert update_in_progress.status_code == 200
        assert update_in_progress.json()["data"]["status"] == "IN_PROGRESS"

        update_completed = client.patch(
            f"/api/v1/clubs/{club.id}/tasks/{task_id}/status",
            json={"status": "DONE"},
            headers=vol_headers
        )
        assert update_completed.status_code == 200
        assert update_completed.json()["data"]["status"] == "DONE"

        # 5. Deterministic Risk Radar Scan
        risk_scan_res = client.post(
            f"/api/v1/risks/scan?event_id={event_id}",
            headers=org_headers
        )
        assert risk_scan_res.status_code == 200
        risks_res = client.get(f"/api/v1/risks?event_id={event_id}", headers=org_headers)
        assert risks_res.status_code == 200

        # 6. Meeting Ingestion & Action Item Parsing
        meeting_payload = {
            "title": "Hackathon Steering Committee Sync",
            "transcript_text": "Abhishek will finalize sponsor agreements by Friday. Sarah coordinates catering logistics.",
            "event_id": event_id,
        }
        meeting_res = client.post(f"/api/v1/meetings?club_id={club.id}", json=meeting_payload, headers=org_headers)
        assert meeting_res.status_code in (200, 201), meeting_res.text
        meeting_id = meeting_res.json()["data"]["id"]
        assert meeting_id is not None

        # 7. AI Multi-Channel Announcement Generation & Publishing
        ai_ann_res = client.post(
            f"/api/v1/clubs/{club.id}/announcements/generate-ai",
            json={
                "category": "VENUE_UPDATE",
                "tone": "PROFESSIONAL",
                "target_channel": "EMAIL",
                "custom_notes": "Volunteer briefing at Main Auditorium starting 9 AM.",
            },
            headers=org_headers
        )
        assert ai_ann_res.status_code == 200
        ai_ann_data = ai_ann_res.json()["data"]
        assert "title" in ai_ann_data
        assert "content" in ai_ann_data

        # Create Announcement
        create_ann_res = client.post(
            f"/api/v1/clubs/{club.id}/announcements",
            json={
                "title": ai_ann_data["title"],
                "content": ai_ann_data["content"],
                "category": "VENUE_UPDATE",
                "target_channel": "IN_APP",
                "status": "DRAFT",
            },
            headers=org_headers
        )
        assert create_ann_res.status_code == 201
        ann_id = create_ann_res.json()["data"]["id"]
        assert ann_id is not None

        # Publish Announcement
        pub_ann_res = client.post(
            f"/api/v1/clubs/{club.id}/announcements/{ann_id}/publish",
            json={
                "broadcast_email": False,
                "broadcast_in_app": True
            },
            headers=org_headers
        )
        assert pub_ann_res.status_code == 200

        # 8. Real-Time Collaboration Gateway (Chat Messaging)
        msg_payload = {
            "channel": "general",
            "content": "Master workflow end-to-end execution verified!",
            "message_type": "CHAT",
        }
        chat_res = client.post(
            f"/api/v1/clubs/{club.id}/collaboration/messages",
            json=msg_payload,
            headers=org_headers
        )
        assert chat_res.status_code == 200
        chat_msg = chat_res.json()["data"]
        assert chat_msg["content"] == msg_payload["content"]

        # Fetch chat history
        chat_hist = client.get(
            f"/api/v1/clubs/{club.id}/collaboration/messages?channel=general",
            headers=org_headers
        )
        assert chat_hist.status_code == 200
        assert len(chat_hist.json()["data"]) >= 1

        # 9. Role Dashboard Overview & Analytics
        dash_res = client.get(
            f"/api/v1/clubs/{club.id}/dashboard?perspective=ORGANIZER",
            headers=org_headers
        )
        assert dash_res.status_code == 200
        dash_data = dash_res.json()["data"]
        assert dash_data["perspective"] == "ORGANIZER"
        assert "data" in dash_data

        # Analytics & Health Score
        analytics_res = client.get(
            f"/api/v1/clubs/{club.id}/analytics/overview",
            headers=org_headers
        )
        assert analytics_res.status_code == 200
        analytics_data = analytics_res.json()["data"]
        assert "health_score" in analytics_data
        assert 0 <= analytics_data["health_score"]["overall_score"] <= 100
        assert "volunteer_leaderboard" in analytics_data

        # 10. Cryptographic Audit Trail & Live Integrity Verification
        audit_res = client.get(
            f"/api/v1/clubs/{club.id}/audit?limit=20",
            headers=pres_headers
        )
        assert audit_res.status_code == 200
        logs_data = audit_res.json()["data"]
        assert logs_data["total"] > 0
        assert len(logs_data["entries"]) > 0

        # Verify mathematical integrity of the SHA-256 chain
        integrity_res = client.get(
            f"/api/v1/clubs/{club.id}/audit/verify-integrity",
            headers=pres_headers
        )
        assert integrity_res.status_code == 200
        integrity_data = integrity_res.json()["data"]
        assert integrity_data["is_valid"] is True
        assert integrity_data["total_records"] > 0
        assert integrity_data["verified_records"] == integrity_data["total_records"]
        assert integrity_data["broken_at_id"] is None
        assert "Zero tampering detected" in integrity_data["verification_message"]

        # Verify Separation of Duties Governance Matrix
        gov_res = client.get(f"/api/v1/clubs/{club.id}/audit/governance", headers=pres_headers)
        assert gov_res.status_code == 200
        gov_data = gov_res.json()["data"]
        assert "rules" in gov_data
        assert gov_data["security_model"] == "DENY_BY_DEFAULT"
        assert len(gov_data["rules"]) >= 5

    finally:
        db.close()
