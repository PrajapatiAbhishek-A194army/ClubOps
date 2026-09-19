import logging
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.club import ClubMembership, ClubRole, MembershipStatus
from app.models.event import Event
from app.models.notification import Notification, NotificationType
from app.models.risk import Risk
from app.models.task import Task
from app.models.user import User
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)


class NotificationService:
    @staticmethod
    def dispatch_event_created(db: Session, event: Event) -> int:
        """
        Sends in-app notification and dispatches email notification to all
        active members and volunteers in the host club.
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
                    f"Staffing quota: {event.min_volunteers_required} volunteers. Explore schedules and roles!"
                ),
                type=NotificationType.EVENT_CREATED,
                link_url=f"/app/events/{event.id}",
            )
            db.add(notif)
            count += 1

            # Dispatch Transactional Email
            user = db.query(User).filter(User.id == m.user_id).first()
            if user and user.email:
                html = EmailService.build_notification_html(
                    title=f"New Event: {event.title}",
                    message=(
                        f"Hello {user.full_name},<br><br>"
                        f"A new event <strong>{event.title}</strong> has been planned on <strong>{date_str}</strong> at <em>{event.location}</em>.<br>"
                        f"Operating headcount target: {event.min_volunteers_required} volunteers."
                    ),
                    badge_text="New Club Event",
                    badge_color="#059669",
                    action_url=f"http://localhost:5173/app/events/{event.id}",
                    action_label="View Event Details",
                )
                EmailService.send_email(
                    to_email=user.email,
                    to_name=user.full_name,
                    subject=f"ClubOps Event Alert: {event.title}",
                    html_content=html,
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
        Sends an immediate notification & email to the volunteer assigned to a task.
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

        # Dispatch Transactional Email
        user = db.query(User).filter(User.id == assignee_id).first()
        if user and user.email:
            html = EmailService.build_notification_html(
                title=f"Task Assigned: {task.title}",
                message=(
                    f"Hi {user.full_name},<br><br>"
                    f"<strong>{assigner_name}</strong> has assigned you to the following task:<br><br>"
                    f"&bull; <strong>Title:</strong> {task.title}<br>"
                    f"&bull; <strong>Priority:</strong> {task.priority.value}<br>"
                    f"&bull; <strong>Due Date:</strong> {deadline_str}<br><br>"
                    f"Please review requirements and update your Kanban board status as you progress."
                ),
                badge_text="Task Assignment",
                badge_color="#2563eb",
                action_url="http://localhost:5173/app/tasks",
                action_label="Open Task Board",
            )
            EmailService.send_email(
                to_email=user.email,
                to_name=user.full_name,
                subject=f"New Task Assigned: {task.title}",
                html_content=html,
            )

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
                message=f"Event Risk Radar Alert: {risk.description}",
                type=NotificationType.RISK_ALERT,
                link_url=f"/app/risks",
            )
            db.add(notif)
            count += 1

            user = db.query(User).filter(User.id == uid).first()
            if user and user.email:
                html = EmailService.build_notification_html(
                    title=f"Risk Radar Alert: {risk.title}",
                    message=(
                        f"Hello {user.full_name},<br><br>"
                        f"ClubOps AI Risk Radar has flagged an operational issue requiring attention:<br><br>"
                        f"&bull; <strong>Severity:</strong> {risk.severity.value}<br>"
                        f"&bull; <strong>Details:</strong> {risk.description}<br><br>"
                        f"Review mitigation steps and coordinate response with your team."
                    ),
                    badge_text=f"{risk.severity.value} Risk Alert",
                    badge_color="#e11d48",
                    action_url="http://localhost:5173/app/risks",
                    action_label="Review Risk Radar",
                )
                EmailService.send_email(
                    to_email=user.email,
                    to_name=user.full_name,
                    subject=f"Risk Alert [{risk.severity.value}]: {risk.title}",
                    html_content=html,
                )

        db.commit()
        return count

    @staticmethod
    def dispatch_ai_briefing(
        db: Session,
        club_id: str,
        title: str,
        message: str,
        link_url: str = "/app/events",
    ) -> int:
        """
        Dispatches an AI Operations Copilot insight to the Club President and members.
        """
        memberships = (
            db.query(ClubMembership)
            .filter(
                ClubMembership.club_id == club_id,
                ClubMembership.status == MembershipStatus.ACTIVE,
            )
            .all()
        )

        count = 0
        for m in memberships:
            notif = Notification(
                user_id=m.user_id,
                title=title,
                message=message,
                type=NotificationType.SYSTEM,
                link_url=link_url,
            )
            db.add(notif)
            count += 1

            user = db.query(User).filter(User.id == m.user_id).first()
            if user and user.email:
                html = EmailService.build_notification_html(
                    title=title,
                    message=(
                        f"Hi {user.full_name},<br><br>"
                        f"{message}<br><br>"
                        f"Stay ahead with automated schedules and intelligent allocation."
                    ),
                    badge_text="AI Operations Copilot",
                    badge_color="#7c3aed",
                    action_url=f"http://localhost:5173{link_url}",
                    action_label="Open ClubOps",
                )
                EmailService.send_email(
                    to_email=user.email,
                    to_name=user.full_name,
                    subject=f"ClubOps AI Insight: {title}",
                    html_content=html,
                )

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
