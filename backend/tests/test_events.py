from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def get_token(email: str, password: str = "ClubOps2026!") -> str:
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


def test_list_and_filter_events():
    token = get_token("president@clubops.ai")
    club_id = get_gdsc_club_id(token)

    resp = client.get(
        f"/api/v1/clubs/{club_id}/events",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert len(data["data"]) >= 1

    # Verify fields in seeded event
    event = data["data"][0]
    assert "title" in event
    assert "status" in event
    assert "timeline" in event
    assert "progress_percent" in event


def test_event_lifecycle_and_milestone_tracking():
    token = get_token("president@clubops.ai")
    club_id = get_gdsc_club_id(token)

    # 1. Create Event
    start = (datetime.utcnow() + timedelta(days=25)).isoformat()
    end = (datetime.utcnow() + timedelta(days=26)).isoformat()
    create_payload = {
        "title": "Flutter & Mobile Development Sprint",
        "description": "2-day sprint creating responsive cross-platform apps.",
        "location": "Seminar Hall B",
        "event_type": "WORKSHOP",
        "start_date": start,
        "end_date": end,
        "budget": 1250.0,
    }

    create_resp = client.post(
        f"/api/v1/clubs/{club_id}/events",
        json=create_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_resp.status_code == 201
    created_event = create_resp.json()["data"]
    event_id = created_event["id"]
    assert created_event["title"] == create_payload["title"]
    assert len(created_event["timeline"]) >= 3

    # 2. Get Event Details
    detail_resp = client.get(
        f"/api/v1/clubs/{club_id}/events/{event_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert detail_resp.status_code == 200
    assert detail_resp.json()["data"]["id"] == event_id

    # 3. Toggle a milestone
    first_milestone = created_event["timeline"][0]
    milestone_id = first_milestone["id"]
    toggle_resp = client.patch(
        f"/api/v1/clubs/{club_id}/events/{event_id}/milestones",
        json={"milestone_id": milestone_id, "completed": True},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert toggle_resp.status_code == 200
    updated_timeline = toggle_resp.json()["data"]["timeline"]
    matched = next(m for m in updated_timeline if m["id"] == milestone_id)
    assert matched["completed"] is True

    # 4. Update Event (e.g. adjust budget and location)
    update_resp = client.put(
        f"/api/v1/clubs/{club_id}/events/{event_id}",
        json={"budget": 1800.0, "location": "Auditorium Main Stage"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["data"]["budget"] == 1800.0
    assert update_resp.json()["data"]["location"] == "Auditorium Main Stage"

    # 5. Delete Event
    delete_resp = client.delete(
        f"/api/v1/clubs/{club_id}/events/{event_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert delete_resp.status_code == 200
    assert delete_resp.json()["data"]["deleted_event_id"] == event_id


def test_ai_event_planner_endpoint():
    token = get_token("organizer@clubops.ai")
    club_id = get_gdsc_club_id(token)

    plan_payload = {
        "prompt": "Organize a flagship AI & Robotics exhibition showcasing autonomous drones and humanoid robots with keynote speakers.",
        "budget": 25000.0,
        "start_date": "2026-11-15",
        "event_type": "HACKATHON",
        "duration_days": 2,
        "expected_attendees": 200,
        "focus_areas": "Autonomous drones, LLMs, Humanoid robotics",
    }

    resp = client.post(
        f"/api/v1/clubs/{club_id}/events/plan-ai",
        json=plan_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    plan_data = resp.json()["data"]
    assert "suggested_title" in plan_data
    assert len(plan_data["suggested_title"]) > 0
    assert "suggested_description" in plan_data
    assert plan_data["suggested_budget"] == 25000.0
    assert len(plan_data["timeline"]) >= 3
    assert "sponsor_checklist" in plan_data["checklists"]

    import re
    date_regex = re.compile(r"^\d{4}-\d{2}-\d{2}$")
    allowed_roles = {"President", "Club Head", "Volunteer"}

    for item in plan_data["timeline"]:
        assert date_regex.match(item["target_date"]), f"Invalid target_date format: {item['target_date']}"
        assert item["assigned_to"] in allowed_roles, f"Invalid assigned_to: {item['assigned_to']}"



def test_rbac_member_cannot_create_or_delete_event():
    token = get_token("member@clubops.ai")
    club_id = get_gdsc_club_id(token)

    start = (datetime.utcnow() + timedelta(days=10)).isoformat()
    end = (datetime.utcnow() + timedelta(days=11)).isoformat()
    # Member attempts to create event -> Forbidden
    create_resp = client.post(
        f"/api/v1/clubs/{club_id}/events",
        json={
            "title": "Unauthorized Event",
            "event_type": "MEETING",
            "start_date": start,
            "end_date": end,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_resp.status_code == 403


def test_stable_staffing_plan_approval_and_kanban_progress_sync():
    token = get_token("president@clubops.ai")
    club_id = get_gdsc_club_id(token)

    start = (datetime.utcnow() + timedelta(days=20)).isoformat()
    end = (datetime.utcnow() + timedelta(days=21)).isoformat()

    # 1. Create a fresh event
    create_resp = client.post(
        f"/api/v1/clubs/{club_id}/events",
        json={
            "title": "Automated Staffing Test Workshop",
            "description": "Testing stable AI staffing, Kanban sync, and event progression impact.",
            "event_type": "WORKSHOP",
            "start_date": start,
            "end_date": end,
            "budget": 3000.0,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_resp.status_code == 201
    event_id = create_resp.json()["data"]["id"]

    try:
        # 2. Fetch staffing plan first time (generates and caches)
        res1 = client.get(
            f"/api/v1/clubs/{club_id}/events/{event_id}/staffing-plan",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res1.status_code == 200
        plan1 = res1.json()["data"]
        assert plan1["is_approved"] is False
        assert len(plan1["proposed_tasks"]) >= 2

        # 3. Fetch staffing plan second time -> MUST be identical (no random regeneration)
        res2 = client.get(
            f"/api/v1/clubs/{club_id}/events/{event_id}/staffing-plan",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res2.status_code == 200
        plan2 = res2.json()["data"]
        assert plan1["min_volunteers_required"] == plan2["min_volunteers_required"]
        assert [t["task_title"] for t in plan1["proposed_tasks"]] == [t["task_title"] for t in plan2["proposed_tasks"]]

        # 4. Approve the plan & assign tasks
        approve_resp = client.post(
            f"/api/v1/clubs/{club_id}/events/{event_id}/approve-plan",
            json={"tasks": plan1["proposed_tasks"], "dispatch_notifications": False},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert approve_resp.status_code == 200
        assert approve_resp.json()["data"]["created_tasks"] == len(plan1["proposed_tasks"])

        # 5. Re-fetching staffing plan now returns live approved plan with is_approved=True
        res3 = client.get(
            f"/api/v1/clubs/{club_id}/events/{event_id}/staffing-plan",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res3.status_code == 200
        plan3 = res3.json()["data"]
        assert plan3["is_approved"] is True
        assert plan3["task_count"] == len(plan1["proposed_tasks"])
        assert plan3["completed_task_count"] == 0

        # 6. Verify tasks are visible on the club's Kanban task query
        tasks_resp = client.get(
            f"/api/v1/clubs/{club_id}/tasks?event_id={event_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert tasks_resp.status_code == 200
        created_tasks = tasks_resp.json()["data"]
        assert len(created_tasks) == len(plan1["proposed_tasks"])
        first_task_id = created_tasks[0]["id"]

        # 7. Check initial progress of event
        ev_before = client.get(
            f"/api/v1/clubs/{club_id}/events/{event_id}",
            headers={"Authorization": f"Bearer {token}"},
        ).json()["data"]
        init_progress = ev_before["progress_percent"]
        init_completed_tasks = ev_before.get("completed_tasks", 0)
        assert init_completed_tasks == 0

        # 8. Mark first task as DONE on the Kanban board
        patch_resp = client.patch(
            f"/api/v1/clubs/{club_id}/tasks/{first_task_id}/status",
            json={"status": "DONE"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert patch_resp.status_code == 200

        # 9. Verify event progression metric increased!
        ev_after = client.get(
            f"/api/v1/clubs/{club_id}/events/{event_id}",
            headers={"Authorization": f"Bearer {token}"},
        ).json()["data"]
        assert ev_after["completed_tasks"] == 1
        assert ev_after["progress_percent"] > init_progress

    finally:
        # Clean up test event and cascaded tasks
        client.delete(
            f"/api/v1/clubs/{club_id}/events/{event_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

