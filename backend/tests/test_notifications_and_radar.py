# Automated Test for Notifications and Risk Radar
from datetime import datetime, timedelta
from app.database.session import SessionLocal
from app.models.club import Club
from app.models.event import Event, EventStatus, EventType
from app.models.notification import Notification, NotificationType
from app.models.risk import Risk, RiskSeverity, RiskStatus
from app.models.task import Task, TaskPriority, TaskStatus
from app.models.user import User
from app.services.notification_service import NotificationService
from app.services.risk_service import RiskService


def test_notification_dispatch_and_risk_radar():
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        user = db.query(User).filter(User.email == "volunteer@demo.clubops").first()
        assert user is not None

        # 1. Test Task Assigned Notification
        task = Task(
            club_id="test-club-id",
            title="Setup High Speed Internet Switch",
            priority=TaskPriority.HIGH,
            status=TaskStatus.TODO,
            due_datetime=now + timedelta(days=1),
        )
        notif = NotificationService.dispatch_task_assigned(
            db=db,
            task=task,
            assignee_id=user.id,
            assigner_name="Operations Lead",
        )
        assert notif.id is not None
        assert notif.type == NotificationType.TASK_ASSIGNED
        assert "Setup High Speed Internet Switch" in notif.title
        assert notif.is_read is False

        # 2. Test Unread count & mark as read
        count = NotificationService.get_unread_count(db=db, user_id=user.id)
        assert count >= 1

        NotificationService.mark_as_read(db=db, notification_id=notif.id, user_id=user.id)
        db.refresh(notif)
        assert notif.is_read is True

        # 3. Test Deterministic Risk Radar on Power BI event
        event = db.query(Event).filter(Event.slug == "hands-on-power-bi-workshop").first()
        if event:
            risks = RiskService.run_deterministic_risk_scan(db=db, event_id=event.id)
            assert len(risks) >= 1
            for r in risks:
                assert r.severity in [RiskSeverity.HIGH, RiskSeverity.CRITICAL, RiskSeverity.MEDIUM, RiskSeverity.LOW]
                assert r.status == RiskStatus.OPEN

    finally:
        db.close()
