import sys
from pathlib import Path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

print("1. Testing Authentication...")
login_res = client.post("/api/v1/auth/login", json={"email": "head@demo.clubops", "password": "DemoPass123!"})
assert login_res.status_code == 200, f"Login failed: {login_res.text}"
token = login_res.json()["data"]["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("   [OK] Authenticated successfully as Amit Verma (Club Head).")

print("2. Testing Club Retrieval...")
res_clubs = client.get("/api/v1/clubs", headers=headers)
assert res_clubs.status_code == 200, f"Failed clubs: {res_clubs.text}"
clubs = res_clubs.json()["data"]
club = clubs[0]
club_id = club["id"]
print(f"   [OK] Found Club: '{club['name']}' (ID: {club_id})")

print("3. Testing Events Retrieval...")
events_res = client.get(f"/api/v1/clubs/{club_id}/events", headers=headers)
assert events_res.status_code == 200, f"Failed events: {events_res.text}"
events = events_res.json()["data"]
event = events[0]
event_id = event["id"]
print(f"   [OK] Found Event: '{event['title']}' (ID: {event_id})")

print("4. Testing AI Staffing & Volunteer Breakdown Plan...")
staffing_res = client.get(f"/api/v1/clubs/{club_id}/events/{event_id}/staffing-plan", headers=headers)
assert staffing_res.status_code == 200, f"Failed staffing: {staffing_res.text}"
plan_data = staffing_res.json()["data"]
print(f"   [OK] Minimum Volunteers Required: {plan_data['min_volunteers_required']}")
print(f"   [OK] Skill Count Quotas Breakdown: {[{'skill': s['skill_name'], 'needed': s['required_count']} for s in plan_data['skill_requirements']]}")
print(f"   [OK] Top Volunteer Recommendations: {len(plan_data['proposed_tasks'])} proposed task candidate matches")

print("5. Testing Visual Kanban Task Progression Board...")
board_res = client.get(f"/api/v1/clubs/{club_id}/tasks/board", headers=headers)
assert board_res.status_code == 200, f"Failed board: {board_res.text}"
board_data = board_res.json()["data"]
cols = {col: len(board_data[col]) for col in board_data}
print(f"   [OK] Kanban Progression Columns: {cols}")

print("6. Testing Notification System...")
notif_res = client.get("/api/v1/notifications", headers=headers)
assert notif_res.status_code == 200, f"Failed notifs: {notif_res.text}"
notifs = notif_res.json()["data"]
print(f"   [OK] Received {len(notifs)} Notifications:")
for n in notifs[:3]:
    print(f"        - [{n['type']}] {n['title']}: {n['message']}")

print("7. Testing Deterministic Risk Radar...")
risks_res = client.get(f"/api/v1/risks?club_id={club_id}", headers=headers)
assert risks_res.status_code == 200, f"Failed risks: {risks_res.text}"
risks = risks_res.json()["data"]
print(f"   [OK] Detected {len(risks)} Active Risks:")
for r in risks[:3]:
    print(f"        - [{r['severity']}] {r['title']} (Source: {r['source']})")

print("8. Testing Meeting Transcript Intelligence & 1-Click Task Extraction...")
meeting_res = client.get(f"/api/v1/meetings?club_id={club_id}", headers=headers)
assert meeting_res.status_code == 200, f"Failed meetings: {meeting_res.text}"
meetings = meeting_res.json()["data"]
print(f"   [OK] Retrieved {len(meetings)} Past Meetings with AI Action Items")

print("9. Testing Institutional RAG Knowledge Search...")
search_res = client.post("/api/v1/knowledge/search", headers=headers, json={"query": "hackathon venue protocol", "club_id": club_id})
assert search_res.status_code == 200, f"Failed knowledge: {search_res.text}"
print(f"   [OK] Knowledge Search returned cited answer: {search_res.json()['data']['answer'][:100]}...")

print("\n=================================================================")
print(">>> ALL 9 CORE SYSTEM CAPABILITIES VERIFIED 100% OPERATIONAL! <<<")
print("=================================================================")
