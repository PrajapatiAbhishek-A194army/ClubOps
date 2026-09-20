import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.session import SessionLocal
from app.models.club import Club, ClubMembership, ClubRole, MembershipStatus
from app.models.user import User
from app.services.auth_service import AuthService
from app.tools.backend_tools import ClubOpsTools
from app.workflows.event_workflow import WorkflowExecutionService


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    return TestClient(app)


def test_club_ops_tools_execution(db: Session):
    club = db.query(Club).first()
    assert club is not None

    user = db.query(User).filter(User.email == "president@clubops.ai").first()
    assert user is not None

    tools = ClubOpsTools(db=db, club_id=club.id, actor_id=user.id)

    # 1. Test getUser tool with active club member
    member = (
        db.query(ClubMembership)
        .filter(ClubMembership.club_id == club.id, ClubMembership.status == MembershipStatus.ACTIVE)
        .first()
    )
    query_name = member.user.full_name.split()[0] if (member and member.user) else "Alex"
    user_res = tools.get_user(query_name)
    assert isinstance(user_res, dict)
    assert user_res.get("found") is True
    assert "user_id" in user_res

    # 2. Test createTask tool
    task_res = tools.create_task(
        title="Test Automated Workflow Task",
        description="Verifying LangGraph tool execution",
        priority="HIGH",
    )
    assert task_res.get("success") is True
    assert "task_id" in task_res

    # 3. Test assignVolunteer tool
    assign_res = tools.assign_volunteer(task_res["task_id"], user_res["user_id"])
    assert assign_res.get("success") is True

    # 4. Check audit log tracking
    assert len(tools.call_audit_log) >= 3


def test_workflow_execution_service(db: Session):
    club = db.query(Club).first()
    user = db.query(User).filter(User.email == "president@clubops.ai").first()

    res = WorkflowExecutionService.execute_workflow(
        db=db,
        club_id=club.id,
        actor_id=user.id,
        input_text="Rahul Sharma organizes attendee registration badges before Friday.",
    )

    assert res is not None
    assert res["current_stage"] in ["COMPLETED", "AI_PROCESSED"]
    assert "audit_trail" in res
    assert len(res["audit_trail"]) > 0


def test_workflow_api_endpoint(client: TestClient, db: Session):
    club = db.query(Club).first()
    user = db.query(User).filter(User.email == "president@clubops.ai").first()

    token = AuthService.create_user_token(user=user, active_club_id=club.id, active_role="PRESIDENT")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        f"/api/v1/clubs/{club.id}/workflows/execute",
        json={"prompt": "Rahul Sharma sets up projector and AV testing before Friday."},
        headers=headers,
    )

    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["data"]["current_stage"] in ["COMPLETED", "AI_PROCESSED"]
