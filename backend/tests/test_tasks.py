import pytest
from datetime import datetime, timedelta
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


def test_list_tasks_and_dependency_blocking():
    token = get_token()
    club_id = get_gdsc_club_id(token)

    resp = client.get(
        f"/api/v1/clubs/{club_id}/tasks",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    tasks = data["data"]
    assert len(tasks) >= 3

    # Check for dependency tracking
    av_task = next((t for t in tasks if "AV Rigging" in t["title"]), None)
    if av_task:
        assert av_task["is_blocked"] is True
        assert av_task["blocking_reason"] is not None
        assert av_task["depends_on"] is not None


def test_task_lifecycle_and_dependency_resolution():
    token = get_token()
    club_id = get_gdsc_club_id(token)

    # 1. Create Prerequisite Task
    prereq_resp = client.post(
        f"/api/v1/clubs/{club_id}/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Stage 1: Secure Cloud Provider Credits",
            "description": "Apply for $500 cloud credits grant for AI Hackathon",
            "priority": "HIGH",
            "status": "TODO",
        },
    )
    assert prereq_resp.status_code == 201
    prereq_task = prereq_resp.json()["data"]
    prereq_id = prereq_task["id"]
    assert prereq_task["is_blocked"] is False

    # 2. Create Dependent Task
    dep_resp = client.post(
        f"/api/v1/clubs/{club_id}/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Stage 2: Distribute API Keys to Teams",
            "description": "Provision and email sandbox API credentials",
            "priority": "URGENT",
            "status": "TODO",
            "depends_on_task_id": prereq_id,
        },
    )
    assert dep_resp.status_code == 201
    dep_task = dep_resp.json()["data"]
    dep_id = dep_task["id"]

    # Since prereq is TODO (not DONE), dep_task MUST be blocked
    assert dep_task["is_blocked"] is True
    assert dep_task["depends_on"]["title"] == "Stage 1: Secure Cloud Provider Credits"
    assert "Stage 1: Secure Cloud Provider Credits" in dep_task["blocking_reason"]

    # 3. Complete Prerequisite Task
    patch_resp = client.patch(
        f"/api/v1/clubs/{club_id}/tasks/{prereq_id}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "DONE"},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["data"]["status"] == "DONE"

    # 4. Dependent Task should now be unblocked
    get_dep = client.get(
        f"/api/v1/clubs/{club_id}/tasks/{dep_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_dep.status_code == 200
    unblocked_task = get_dep.json()["data"]
    assert unblocked_task["is_blocked"] is False
    assert unblocked_task["blocking_reason"] is None

    # Clean up
    client.delete(f"/api/v1/clubs/{club_id}/tasks/{dep_id}", headers={"Authorization": f"Bearer {token}"})
    client.delete(f"/api/v1/clubs/{club_id}/tasks/{prereq_id}", headers={"Authorization": f"Bearer {token}"})


def test_prevent_circular_dependency():
    token = get_token()
    club_id = get_gdsc_club_id(token)

    # Create Task A
    resp_a = client.post(
        f"/api/v1/clubs/{club_id}/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Circular Test Task A", "priority": "LOW"},
    )
    task_a_id = resp_a.json()["data"]["id"]

    # Create Task B depending on A
    resp_b = client.post(
        f"/api/v1/clubs/{club_id}/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Circular Test Task B", "priority": "LOW", "depends_on_task_id": task_a_id},
    )
    task_b_id = resp_b.json()["data"]["id"]

    # Try setting Task A to depend on Task B (creating a circle: A -> B -> A)
    resp_update = client.put(
        f"/api/v1/clubs/{club_id}/tasks/{task_a_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Circular Test Task A", "depends_on_task_id": task_b_id},
    )
    assert resp_update.status_code == 400
    assert "circular" in resp_update.json()["detail"].lower()

    # Clean up
    client.delete(f"/api/v1/clubs/{club_id}/tasks/{task_b_id}", headers={"Authorization": f"Bearer {token}"})
    client.delete(f"/api/v1/clubs/{club_id}/tasks/{task_a_id}", headers={"Authorization": f"Bearer {token}"})


def test_ai_task_suggestion_endpoint():
    token = get_token()
    club_id = get_gdsc_club_id(token)

    resp = client.post(
        f"/api/v1/clubs/{club_id}/tasks/ai-suggest",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "goal_description": "Organize hands-on machine learning workshop with GPU cloud environments for 100 students",
            "committee_area": "Technical Workshops",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    suggestions = data["data"]["tasks"]
    assert len(suggestions) >= 2
    for item in suggestions:
        assert "title" in item
        assert "priority" in item
        assert "description" in item
