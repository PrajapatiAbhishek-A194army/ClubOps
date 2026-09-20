import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def get_token(email: str = "president@clubops.ai", password: str = "ClubOps2026!") -> str:
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}"
    return resp.json()["data"]["access_token"]


def get_gdsc_club_id(token: str) -> str:
    resp = client.get("/api/v1/clubs", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    clubs = resp.json()["data"]
    gdsc = next((c for c in clubs if c["code"] == "gdsc-campus"), None)
    assert gdsc is not None, "GDSC club not found"
    return gdsc["id"]


def test_list_volunteers_and_roster():
    token = get_token()
    club_id = get_gdsc_club_id(token)

    resp = client.get(
        f"/api/v1/clubs/{club_id}/volunteers",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    volunteers = data["data"]
    assert len(volunteers) >= 1

    # Verify volunteer fields
    vol = volunteers[0]
    assert "skills" in vol
    assert "availability_status" in vol
    assert "check_in_status" in vol
    assert "active_tasks_count" in vol


def test_filter_volunteers_by_availability_and_skill():
    token = get_token()
    club_id = get_gdsc_club_id(token)

    # Filter by skill
    resp = client.get(
        f"/api/v1/clubs/{club_id}/volunteers?skill=Registration",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    reg_vols = resp.json()["data"]
    for v in reg_vols:
        assert any("registration" in s.lower() for s in v["skills"])


def test_volunteer_check_in_lifecycle():
    token = get_token()
    club_id = get_gdsc_club_id(token)

    # Get a volunteer
    list_resp = client.get(
        f"/api/v1/clubs/{club_id}/volunteers",
        headers={"Authorization": f"Bearer {token}"},
    )
    vols = list_resp.json()["data"]
    assert len(vols) > 0
    vol_id = vols[0]["id"]

    # 1. Check in
    cin_resp = client.patch(
        f"/api/v1/clubs/{club_id}/volunteers/{vol_id}/check-in",
        headers={"Authorization": f"Bearer {token}"},
        json={"check_in_status": "CHECKED_IN"},
    )
    assert cin_resp.status_code == 200
    assert cin_resp.json()["data"]["check_in_status"] == "CHECKED_IN"
    assert cin_resp.json()["data"]["checked_in_at"] is not None

    # 2. Check out
    cout_resp = client.patch(
        f"/api/v1/clubs/{club_id}/volunteers/{vol_id}/check-in",
        headers={"Authorization": f"Bearer {token}"},
        json={"check_in_status": "CHECKED_OUT"},
    )
    assert cout_resp.status_code == 200
    assert cout_resp.json()["data"]["check_in_status"] == "CHECKED_OUT"


def test_update_volunteer_availability():
    token = get_token()
    club_id = get_gdsc_club_id(token)

    list_resp = client.get(
        f"/api/v1/clubs/{club_id}/volunteers",
        headers={"Authorization": f"Bearer {token}"},
    )
    vol_id = list_resp.json()["data"][0]["id"]

    resp = client.patch(
        f"/api/v1/clubs/{club_id}/volunteers/{vol_id}/availability",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "availability_status": "ON_SHIFT",
            "availability_notes": "Assigned to main entrance verification gate",
        },
    )
    assert resp.status_code == 200
    updated = resp.json()["data"]
    assert updated["availability_status"] == "ON_SHIFT"
    assert updated["availability_notes"] == "Assigned to main entrance verification gate"


def test_ai_volunteer_matchmaker():
    token = get_token()
    club_id = get_gdsc_club_id(token)

    match_req = {
        "task_title": "Audio Visual Rigging & Wireless Microphones Setup",
        "task_description": "Setup sound mixer, wire podium mics, and test projection screens.",
        "required_skills": ["Audio / Visual (AV)"],
    }

    resp = client.post(
        f"/api/v1/clubs/{club_id}/volunteers/ai-match",
        headers={"Authorization": f"Bearer {token}"},
        json=match_req,
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "recommendations" in data
    assert len(data["recommendations"]) > 0
    top_match = data["recommendations"][0]
    assert "match_score" in top_match
    assert top_match["match_score"] >= 30
    assert "match_rationale" in top_match


def test_assign_volunteer_to_task():
    token = get_token()
    club_id = get_gdsc_club_id(token)

    # 1. Create a task
    task_resp = client.post(
        f"/api/v1/clubs/{club_id}/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Registration Desk Check-in Coordination",
            "description": "Distribute ID badges and welcome kits to students.",
            "priority": "MEDIUM",
            "status": "TODO",
        },
    )
    assert task_resp.status_code == 201
    task_id = task_resp.json()["data"]["id"]

    # 2. Pick a volunteer user
    vol_resp = client.get(
        f"/api/v1/clubs/{club_id}/volunteers",
        headers={"Authorization": f"Bearer {token}"},
    )
    vol_user_id = vol_resp.json()["data"][0]["user_id"]

    # 3. Assign
    assign_resp = client.post(
        f"/api/v1/clubs/{club_id}/volunteers/assign",
        headers={"Authorization": f"Bearer {token}"},
        json={"task_id": task_id, "volunteer_user_id": vol_user_id},
    )
    assert assign_resp.status_code == 200
    assigned_task = assign_resp.json()["data"]
    assert assigned_task["assignee"]["id"] == vol_user_id
