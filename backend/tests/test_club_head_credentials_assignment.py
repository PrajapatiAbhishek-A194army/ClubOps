import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal
from app.models.club import Club, ClubMembership, ClubRole
from app.models.user import User

client = TestClient(app)


def get_token(email: str, password: str = "ClubOps2026!") -> str:
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    return resp.json()["data"]["access_token"]


def get_club_by_code(token: str, code: str) -> dict:
    resp = client.get("/api/v1/clubs", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    clubs = resp.json()["data"]
    match = next((c for c in clubs if c["code"] == code), None)
    assert match is not None, f"Club {code} not found"
    return match


def test_assign_new_club_head_with_email_and_password():
    token = get_token("president@clubops.ai")
    gdsc = get_club_by_code(token, "gdsc-campus")
    club_id = gdsc["id"]

    uid = uuid.uuid4().hex[:6]
    new_email = f"testhead_{uid}@campus.edu"
    new_name = f"Test Head {uid}"
    new_password = f"TempPass_{uid}!123"

    db = SessionLocal()
    created_user_id = None
    try:
        # 1. Post to assign-club-head with email, password, full_name
        assign_payload = {
            "email": new_email,
            "full_name": new_name,
            "password": new_password,
            "send_email": False,  # Mock/skip external Brevo network call in unit test
        }

        resp = client.post(
            f"/api/v1/clubs/{club_id}/assign-club-head",
            json=assign_payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200, f"Appointment failed: {resp.text}"
        data = resp.json()["data"]
        assert data["email"] == new_email
        assert data["full_name"] == new_name
        assert data["role"] == "CLUB_HEAD"
        created_user_id = data["user_id"]

        # 2. Verify previous Club Head (Priya Patel) was demoted to VOLUNTEER
        priya = db.query(User).filter(User.email == "organizer@clubops.ai").first()
        priya_m = (
            db.query(ClubMembership)
            .filter(ClubMembership.club_id == club_id, ClubMembership.user_id == priya.id)
            .first()
        )
        assert priya_m.role == ClubRole.VOLUNTEER, f"Expected Priya to be demoted to VOLUNTEER, got {priya_m.role}"

        # 3. Verify new Club Head can immediately log in with their credentials
        login_resp = client.post(
            "/api/v1/auth/login",
            json={"email": new_email, "password": new_password},
        )
        assert login_resp.status_code == 200, f"New Club Head login failed: {login_resp.text}"
        login_data = login_resp.json()["data"]
        assert "access_token" in login_data
        new_token = login_data["access_token"]
        me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {new_token}"})
        assert me_resp.status_code == 200
        assert me_resp.json()["data"]["email"] == new_email

        # 4. Verify Single-Club Head constraint: Attempting to assign this user to RAS must fail
        ras = get_club_by_code(token, "ras-campus")
        conflict_resp = client.post(
            f"/api/v1/clubs/{ras['id']}/assign-club-head",
            json={"email": new_email, "send_email": False},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert conflict_resp.status_code == 400
        assert "already the active Club Head" in conflict_resp.json()["detail"]

    finally:
        # Re-instate Priya Patel as Club Head of GDSC and clean up test user
        if priya:
            priya_m = (
                db.query(ClubMembership)
                .filter(ClubMembership.club_id == club_id, ClubMembership.user_id == priya.id)
                .first()
            )
            if priya_m:
                priya_m.role = ClubRole.CLUB_HEAD

        if created_user_id:
            db.query(ClubMembership).filter(ClubMembership.user_id == created_user_id).delete()
            db.query(User).filter(User.id == created_user_id).delete()

        db.commit()
        db.close()
