import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.utils.security import create_access_token, decode_access_token, get_password_hash, verify_password

client = TestClient(app)


def test_password_hashing():
    pwd = "SecureClubPassword123!"
    hashed = get_password_hash(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_token_generation_and_decoding():
    subject = "user-123"
    token = create_access_token(subject=subject, claims={"role": "PRESIDENT"})
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == subject
    assert payload["role"] == "PRESIDENT"


def test_health_check_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] == "healthy"
    assert "version" in data["data"]


def test_auth_login_and_me():
    # Attempt invalid login
    bad_resp = client.post("/api/v1/auth/login", json={"email": "president@clubops.ai", "password": "WrongPassword"})
    assert bad_resp.status_code == 401

    # Valid demo login
    login_resp = client.post("/api/v1/auth/login", json={"email": "president@clubops.ai", "password": "ClubOps2026!"})
    assert login_resp.status_code == 200
    login_json = login_resp.json()
    assert login_json["success"] is True
    token = login_json["data"]["access_token"]
    assert token

    # Check /auth/me with Bearer token
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["success"] is True
    assert me_data["data"]["email"] == "president@clubops.ai"
    assert me_data["data"]["role"] == "PRESIDENT"
