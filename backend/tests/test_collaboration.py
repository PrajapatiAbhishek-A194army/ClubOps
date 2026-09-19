import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database.session import SessionLocal
from app.models.club import Club
from app.models.user import User
from app.services.auth_service import AuthService


def test_get_collaboration_channels():
    client = TestClient(app)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "president@clubops.ai").first()
        club = db.query(Club).filter(Club.code == "gdsc-campus").first()
        assert user and club

        token = AuthService.create_user_token(user=user, active_club_id=club.id, active_role="PRESIDENT")
        headers = {"Authorization": f"Bearer {token}"}

        resp = client.get(f"/api/v1/clubs/{club.id}/collaboration/channels", headers=headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        channel_names = [c["name"] for c in body["data"]]
        assert "general" in channel_names
        assert "organizers" in channel_names
        assert "volunteers" in channel_names
        assert "emergencies" in channel_names
    finally:
        db.close()


def test_post_and_get_messages():
    client = TestClient(app)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "president@clubops.ai").first()
        club = db.query(Club).filter(Club.code == "gdsc-campus").first()

        token = AuthService.create_user_token(user=user, active_club_id=club.id, active_role="PRESIDENT")
        headers = {"Authorization": f"Bearer {token}"}

        # Send message via REST
        post_payload = {
            "channel": "general",
            "content": "Real-time sync test message for campus operations",
            "message_type": "CHAT",
        }
        post_resp = client.post(
            f"/api/v1/clubs/{club.id}/collaboration/messages",
            json=post_payload,
            headers=headers,
        )
        assert post_resp.status_code == 200
        post_data = post_resp.json()["data"]
        assert post_data["content"] == post_payload["content"]
        assert post_data["sender"]["id"] == user.id

        # Fetch messages
        get_resp = client.get(
            f"/api/v1/clubs/{club.id}/collaboration/messages?channel=general",
            headers=headers,
        )
        assert get_resp.status_code == 200
        messages = get_resp.json()["data"]
        assert len(messages) > 0
        assert any(m["content"] == post_payload["content"] for m in messages)
    finally:
        db.close()


def test_system_activity_broadcast():
    client = TestClient(app)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "president@clubops.ai").first()
        club = db.query(Club).filter(Club.code == "gdsc-campus").first()

        token = AuthService.create_user_token(user=user, active_club_id=club.id, active_role="PRESIDENT")
        headers = {"Authorization": f"Bearer {token}"}

        broadcast_payload = {
            "event_type": "TASK_UPDATED",
            "title": "Stage Audio Setup",
            "description": "Moved to IN_PROGRESS by Technical Lead",
            "actor_name": user.full_name,
            "channel": "general",
            "metadata": {"task_id": "test_task_123"},
        }
        resp = client.post(
            f"/api/v1/clubs/{club.id}/collaboration/broadcast-activity",
            json=broadcast_payload,
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["message_type"] == "SYSTEM_EVENT"
        assert "Stage Audio Setup" in data["content"]
    finally:
        db.close()


def test_presence_roster():
    client = TestClient(app)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "president@clubops.ai").first()
        club = db.query(Club).filter(Club.code == "gdsc-campus").first()

        token = AuthService.create_user_token(user=user, active_club_id=club.id, active_role="PRESIDENT")
        headers = {"Authorization": f"Bearer {token}"}

        resp = client.get(f"/api/v1/clubs/{club.id}/collaboration/presence", headers=headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert "total_online" in body["data"]
        assert isinstance(body["data"]["online_users"], list)
    finally:
        db.close()


def test_websocket_connection_and_ping():
    client = TestClient(app)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "president@clubops.ai").first()
        club = db.query(Club).filter(Club.code == "gdsc-campus").first()

        token = AuthService.create_user_token(user=user, active_club_id=club.id, active_role="PRESIDENT")

        # Connect WebSocket with valid token
        with client.websocket_connect(f"/api/v1/clubs/{club.id}/ws?token={token}") as websocket:
            # Send PING
            websocket.send_json({"type": "PING"})
            response = websocket.receive_json()
            assert response["type"] == "PONG"

            # Send CHAT_MESSAGE
            websocket.send_json({
                "type": "CHAT_MESSAGE",
                "channel": "organizers",
                "content": "WebSocket live coordination message",
            })
    finally:
        db.close()
