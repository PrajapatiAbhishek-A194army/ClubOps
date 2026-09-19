import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database.session import SessionLocal
from app.models.club import Club
from app.models.user import User
from app.models.audit import AuditLog, AuditResult, AuditSource
from app.services.auth_service import AuthService
from app.services.audit_service import AuditService, calculate_integrity_hash, GENESIS_PREV_HASH


def test_log_action_and_chain_hashing():
    db = SessionLocal()
    try:
        club = db.query(Club).filter(Club.code == "gdsc-campus").first()
        user = db.query(User).filter(User.email == "president@clubops.ai").first()
        assert club and user

        # Log a test action
        entry1 = AuditService.log_action(
            db=db,
            club_id=club.id,
            action="TEST_ACTION_STEP_1",
            entity_type="EVENT",
            entity_id="test_evt_1",
            actor=user,
            actor_role="PRESIDENT",
            source=AuditSource.HUMAN,
            result=AuditResult.SUCCESS,
            diff_payload={"field": "value1"},
        )
        assert entry1.integrity_hash is not None
        assert len(entry1.integrity_hash) == 64

        # Log consecutive action - verify chaining
        entry2 = AuditService.log_action(
            db=db,
            club_id=club.id,
            action="TEST_ACTION_STEP_2",
            entity_type="EVENT",
            entity_id="test_evt_2",
            actor=user,
            actor_role="PRESIDENT",
            source=AuditSource.HUMAN,
            result=AuditResult.SUCCESS,
            diff_payload={"field": "value2"},
        )
        assert entry2.prev_hash == entry1.integrity_hash
        assert entry2.integrity_hash is not None
        assert len(entry2.integrity_hash) == 64
    finally:
        db.close()


def test_verify_chain_integrity():
    client = TestClient(app)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "president@clubops.ai").first()
        club = db.query(Club).filter(Club.code == "gdsc-campus").first()

        token = AuthService.create_user_token(user=user, active_club_id=club.id, active_role="PRESIDENT")
        headers = {"Authorization": f"Bearer {token}"}

        resp = client.get(f"/api/v1/clubs/{club.id}/audit/verify-integrity", headers=headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        report = body["data"]

        assert report["is_valid"] is True
        assert report["total_records"] > 0
        assert report["verified_records"] == report["total_records"]
        assert report["broken_at_id"] is None
        assert "Zero tampering detected" in report["verification_message"]
    finally:
        db.close()


def test_audit_query_and_filtering():
    client = TestClient(app)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "president@clubops.ai").first()
        club = db.query(Club).filter(Club.code == "gdsc-campus").first()

        token = AuthService.create_user_token(user=user, active_club_id=club.id, active_role="PRESIDENT")
        headers = {"Authorization": f"Bearer {token}"}

        # Query all
        resp = client.get(f"/api/v1/clubs/{club.id}/audit?limit=20", headers=headers)
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["total"] > 0
        assert len(data["entries"]) > 0

        # Filter by result
        resp_denied = client.get(f"/api/v1/clubs/{club.id}/audit?result=DENIED", headers=headers)
        assert resp_denied.status_code == 200
        denied_data = resp_denied.json()["data"]
        for entry in denied_data["entries"]:
            assert entry["result"] == "DENIED"
    finally:
        db.close()


def test_security_summary_and_governance():
    client = TestClient(app)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "president@clubops.ai").first()
        club = db.query(Club).filter(Club.code == "gdsc-campus").first()

        token = AuthService.create_user_token(user=user, active_club_id=club.id, active_role="PRESIDENT")
        headers = {"Authorization": f"Bearer {token}"}

        # Summary
        resp_sum = client.get(f"/api/v1/clubs/{club.id}/audit/summary", headers=headers)
        assert resp_sum.status_code == 200
        summary = resp_sum.json()["data"]
        assert summary["total_events_logged"] > 0
        assert summary["integrity_status"] == "VERIFIED"

        # Governance
        resp_gov = client.get(f"/api/v1/clubs/{club.id}/audit/governance", headers=headers)
        assert resp_gov.status_code == 200
        gov = resp_gov.json()["data"]
        assert gov["security_model"] == "DENY_BY_DEFAULT"
        assert len(gov["rules"]) >= 5
    finally:
        db.close()


def test_audit_csv_export():
    client = TestClient(app)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "president@clubops.ai").first()
        club = db.query(Club).filter(Club.code == "gdsc-campus").first()

        token = AuthService.create_user_token(user=user, active_club_id=club.id, active_role="PRESIDENT")
        headers = {"Authorization": f"Bearer {token}"}

        resp = client.get(f"/api/v1/clubs/{club.id}/audit/export", headers=headers)
        assert resp.status_code == 200
        assert "text/csv" in resp.headers.get("content-type", "")
        csv_text = resp.text
        assert "IMMUTABLE CRYPTOGRAPHIC AUDIT LOG" in csv_text
        assert "Integrity Hash (SHA-256)" in csv_text
        assert club.id in csv_text
    finally:
        db.close()
