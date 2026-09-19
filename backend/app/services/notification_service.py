import logging
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.club import ClubMembership, ClubRole, MembershipStatus
from app.models.event import Event
from app.models.notification import Notification, NotificationType
from app.models.risk import Risk
from app.models.task import Task

logger = logging.getLogger(__name__)


class NotificationService:
    @staticmethod
    def dispatch_event_created(db: Session, event: Event) -> int:
        """
        Sends in-app notification and email dispatch simulation to all
        active volunteers in the host club.
        """
        memberships = (
            db.query(ClubMembership)
            .filter(
                ClubMembership.club_id == event.club_id,
                ClubMembership.status == MembershipStatus.ACTIVE,
            )
            .all()
        )

        count = 0
        date_str = event.start_date.strftime("%b %d, %Y")
        for m in memberships:
            notif = Notification(
                user_id=m.user_id,
                title=f"New Event: {event.title}",
                message=(
                    f"A new club event '{event.title}' is planned for {date_str} at {event.location}. "
                    f"Staffing needs: {event.min_volunteers_required} volunteers. Check out details and proposed roles!"
                ),
                type=NotificationType.EVENT_CREATED,
                link_url=f"/app/events/{event.id}",
            )
            db.add(notif)
            count += 1

            # Simulated email dispatch
            logger.info(
                f"[EMAIL OUTBOX] To User {m.user_id}: 'New Event: {event.title}' scheduled on {date_str}."
            )

        db.commit()
        return count

    @staticmethod
    def dispatch_task_assigned(
        db: Session,
        task: Task,
        assignee_id: str,
        assigner_name: Optional[str] = "Club Operations",
    ) -> Notification:
        """
        Sends an immediate notification to the volunteer assigned to a task.
        """
        deadline_str = (
            task.due_datetime.strftime("%b %d, %Y") if task.due_datetime else "as scheduled"
        )
        notif = Notification(
            user_id=assignee_id,
            title=f"Task Assigned: {task.title}",
            message=(
                f"{assigner_name} assigned you to '{task.title}' "
                f"({task.priority.value} priority, due {deadline_str})."
            ),
            type=NotificationType.TASK_ASSIGNED,
            link_url=f"/app/tasks",
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)

        logger.info(f"[EMAIL OUTBOX] To User {assignee_id}: Task Assigned '{task.title}'")
        return notif

    @staticmethod
    def dispatch_risk_alert(
        db: Session,
        risk: Risk,
        club_id: str,
    ) -> int:
        """
        Sends risk alert notifications to Club Head, President, and affected assignees.
        """
        # Find Club Head and President
        leadership = (
            db.query(ClubMembership)
            .filter(
                ClubMembership.club_id == club_id,
                ClubMembership.status == MembershipStatus.ACTIVE,
                ClubMembership.role.in_([ClubRole.CLUB_HEAD, ClubRole.PRESIDENT]),
            )
            .all()
        )

        recipient_ids = {m.user_id for m in leadership}

        # If risk is linked to a task, include the assigned volunteer
        if risk.related_task_id:
            task = db.query(Task).filter(Task.id == risk.related_task_id).first()
            if task and task.assignments:
                for a in task.assignments:
                    recipient_ids.add(a.user_id)

        count = 0
        for uid in recipient_ids:
            notif = Notification(
                user_id=uid,
                title=f"[{risk.severity.value} RISK] {risk.title}",
                message=f"Event Risk Alert: {risk.description}",
                type=NotificationType.RISK_ALERT,
                link_url=f"/app/risks",
            )
            db.add(notif)
            count += 1
            logger.warning(f"[RISK ALERT OUTBOX] To User {uid}: {risk.title} ({risk.severity.value})")

        db.commit()
        return count

    @staticmethod
    def get_user_notifications(
        db: Session,
        user_id: str,
        unread_only: bool = False,
        limit: int = 50,
    ) -> List[Notification]:
        query = db.query(Notification).filter(Notification.user_id == user_id)
        if unread_only:
            query = query.filter(Notification.is_read == False)
        return query.order_by(Notification.created_at.desc()).limit(limit).all()

    @staticmethod
    def mark_as_read(db: Session, notification_id: str, user_id: str) -> Optional[Notification]:
        notif = (
            db.query(Notification)
            .filter(Notification.id == notification_id, Notification.user_id == user_id)
            .first()
        )
        if notif:
            notif.is_read = True
            db.commit()
            db.refresh(notif)
        return notif

    @staticmethod
    def mark_all_as_read(db: Session, user_id: str) -> int:
        count = (
            db.query(Notification)
            .filter(Notification.user_id == user_id, Notification.is_read == False)
            .update({"is_read": True})
        )
        db.commit()
        return count

    @staticmethod
    def get_unread_count(db: Session, user_id: str) -> int:
        return (
            db.query(Notification)
            .filter(Notification.user_id == user_id, Notification.is_read == False)
            .count()
        )
