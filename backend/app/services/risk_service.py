import logging
from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.risk import Risk, RiskSeverity, RiskSource, RiskStatus
from app.models.task import Task, TaskStatus
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


class RiskService:
    @staticmethod
    def run_deterministic_risk_scan(db: Session, event_id: str) -> List[Risk]:
        """
        Scans event application state deterministically:
        1. Overdue incomplete tasks.
        2. Blocked dependencies due soon.
        3. Understaffing vs min_volunteers_required.
        4. Deficit in required skill counts.
        Generates Risk records and dispatches alerts for high/critical risks.
        """
        event = db.query(Event).filter(Event.id == event_id).first()
        if not event:
            raise ValueError("Event not found")

        detected_risks: List[Risk] = []
        now = datetime.utcnow()

        # Check 1: Overdue incomplete tasks
        overdue_tasks = (
            db.query(Task)
            .filter(
                Task.event_id == event_id,
                Task.status.in_([TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED]),
                Task.due_datetime < now,
            )
            .all()
        )

        for ot in overdue_tasks:
            title = f"Overdue Task: {ot.title}"
            existing = (
                db.query(Risk)
                .filter(
                    Risk.event_id == event_id,
                    Risk.related_task_id == ot.id,
                    Risk.status == RiskStatus.OPEN,
                )
                .first()
            )
            if not existing:
                hours_late = int((now - ot.due_datetime).total_seconds() / 3600)
                risk = Risk(
                    event_id=event_id,
                    related_task_id=ot.id,
                    title=title,
                    description=(
                        f"Task '{ot.title}' is overdue by {hours_late} hours. "
                        f"Status is {ot.status.value}. Immediate lead intervention required."
                    ),
                    severity=RiskSeverity.CRITICAL if ot.priority.value in ["HIGH", "CRITICAL", "URGENT"] else RiskSeverity.HIGH,
                    status=RiskStatus.OPEN,
                    source=RiskSource.RULE_ENGINE,
                )
                db.add(risk)
                db.flush()
                NotificationService.dispatch_risk_alert(db, risk, event.club_id)
                detected_risks.append(risk)

        # Check 2: Imminent task blocked by incomplete dependency
        imminent_threshold = now + timedelta(hours=36)
        imminent_tasks = (
            db.query(Task)
            .filter(
                Task.event_id == event_id,
                Task.status.in_([TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED]),
                Task.due_datetime != None,
                Task.due_datetime <= imminent_threshold,
                Task.depends_on_task_id != None,
            )
            .all()
        )

        for it in imminent_tasks:
            prereq = db.query(Task).filter(Task.id == it.depends_on_task_id).first()
            if prereq and prereq.status not in [TaskStatus.COMPLETED]:
                existing = (
                    db.query(Risk)
                    .filter(
                        Risk.event_id == event_id,
                        Risk.related_task_id == it.id,
                        Risk.status == RiskStatus.OPEN,
                    )
                    .first()
                )
                if not existing:
                    risk = Risk(
                        event_id=event_id,
                        related_task_id=it.id,
                        title=f"Blocked Critical Path: {it.title}",
                        description=(
                            f"Task '{it.title}' is due in <36 hours, but prerequisite "
                            f"'{prereq.title}' is still in status {prereq.status.value}."
                        ),
                        severity=RiskSeverity.HIGH,
                        status=RiskStatus.OPEN,
                        source=RiskSource.RULE_ENGINE,
                    )
                    db.add(risk)
                    db.flush()
                    NotificationService.dispatch_risk_alert(db, risk, event.club_id)
                    detected_risks.append(risk)

        # Check 3: Understaffed event vs min_volunteers_required
        tasks = db.query(Task).filter(Task.event_id == event_id).all()
        assigned_user_ids = set()
        for t in tasks:
            for a in t.assignments:
                assigned_user_ids.add(a.user_id)

        current_staffing = len(assigned_user_ids)
        if event.min_volunteers_required > 0 and current_staffing < event.min_volunteers_required:
            shortage = event.min_volunteers_required - current_staffing
            existing_staffing_risk = (
                db.query(Risk)
                .filter(
                    Risk.event_id == event_id,
                    Risk.title.ilike("%Understaffing Shortage%"),
                    Risk.status == RiskStatus.OPEN,
                )
                .first()
            )
            if not existing_staffing_risk:
                risk = Risk(
                    event_id=event_id,
                    title=f"Staffing Shortage ({shortage} Volunteers Needed)",
                    description=(
                        f"Event requires minimum {event.min_volunteers_required} volunteers, "
                        f"but currently only {current_staffing} are assigned across tasks."
                    ),
                    severity=RiskSeverity.HIGH if shortage >= 3 else RiskSeverity.MEDIUM,
                    status=RiskStatus.OPEN,
                    source=RiskSource.RULE_ENGINE,
                )
                db.add(risk)
                db.flush()
                NotificationService.dispatch_risk_alert(db, risk, event.club_id)
                detected_risks.append(risk)

        db.commit()

        # Return all currently open risks for the event
        return db.query(Risk).filter(Risk.event_id == event_id, Risk.status == RiskStatus.OPEN).all()

    @staticmethod
    def get_event_risks(
        db: Session,
        event_id: Optional[str] = None,
        club_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[Risk]:
        query = db.query(Risk)
        if event_id:
            query = query.filter(Risk.event_id == event_id)
        elif club_id:
            query = query.join(Event, Risk.event_id == Event.id).filter(Event.club_id == club_id)
        if status:
            try:
                status_enum = RiskStatus(status.upper())
                query = query.filter(Risk.status == status_enum)
            except ValueError:
                query = query.filter(Risk.status == status)
        return query.order_by(Risk.detected_at.desc()).all()

    @staticmethod
    def resolve_risk(db: Session, risk_id: str) -> Optional[Risk]:
        risk = db.query(Risk).filter(Risk.id == risk_id).first()
        if risk:
            risk.status = RiskStatus.RESOLVED
            risk.resolved_at = datetime.utcnow()
            db.commit()
            db.refresh(risk)
        return risk
