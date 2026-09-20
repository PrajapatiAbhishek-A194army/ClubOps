import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_seeded_user_login():
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "president@clubops.ai", "password": "ClubOps2026!"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    token = data["data"]["access_token"]

    # Verify /auth/me profile
    me_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    me_data = me_resp.json()["data"]
    assert me_data["email"] == "president@clubops.ai"
    assert len(me_data["memberships"]) >= 1


def test_user_signup_and_club_creation():
    # Register a new user with club
    unique_email = "newpresident@campus.edu"
    signup_resp = client.post(
        "/api/v1/auth/signup",
        json={
            "email": unique_email,
            "password": "SecurePassword123!",
            "full_name": "Jordan Lee",
            "club_name": "Design & Innovation Hub",
            "club_code": "design-hub-test",
            "role": "PRESIDENT",
        },
    )
    # Should succeed or already exist
    if signup_resp.status_code == 200:
        token = signup_resp.json()["data"]["access_token"]
        assert token
    else:
        # If already exists from earlier run, log in
        login_resp = client.post(
            "/api/v1/auth/login",
            json={"email": unique_email, "password": "SecurePassword123!"},
        )
        assert login_resp.status_code == 200
        token = login_resp.json()["data"]["access_token"]

    # List clubs for this user
    clubs_resp = client.get(
        "/api/v1/clubs",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert clubs_resp.status_code == 200
    user_clubs = clubs_resp.json()["data"]
    assert len(user_clubs) >= 1
    assert any(c["code"] == "design-hub-test" for c in user_clubs)


def test_club_member_management():
    # Login as President
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "president@clubops.ai", "password": "ClubOps2026!"},
    )
    token = login_resp.json()["data"]["access_token"]

    # Get GDSC club
    clubs_resp = client.get(
        "/api/v1/clubs",
        headers={"Authorization": f"Bearer {token}"},
    )
    gdsc = next(c for c in clubs_resp.json()["data"] if "Google Developer" in c["name"])
    club_id = gdsc["id"]

    # List members
    members_resp = client.get(
        f"/api/v1/clubs/{club_id}/members",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert members_resp.status_code == 200
    members = members_resp.json()["data"]
    assert len(members) >= 5
    roles_present = {m["role"] for m in members}
    assert "PRESIDENT" in roles_present
    assert ("ORGANIZER" in roles_present or "CLUB_HEAD" in roles_present)
    assert "VOLUNTEER" in roles_present
    assert "MEMBER" in roles_present
