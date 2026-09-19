from datetime import datetime, timedelta
from app.database.session import SessionLocal
from app.models.user import User
from app.models.club import Club, ClubMembership
from app.models.event import Event
from app.models.task import Task
from app.models.risk import Risk
from app.models.notification import Notification, NotificationType

def seed_notifications():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        club = db.query(Club).first()
        events = db.query(Event).all()
        tasks = db.query(Task).all()
        risks = db.query(Risk).all()

        print(f"Seeding notifications for {len(users)} users...")

        sample_notifs = [
            {
                "title": "🤖 AI Operations Briefing",
                "message": "AI Staffing matchmaker has finalized team allocations for HackOut 2026 with 0 schedule overlap. Check approved volunteer rosters.",
                "type": NotificationType.SYSTEM,
                "link_url": f"/app/events/{events[0].id if events else ''}",
            },
            {
                "title": "⚠️ Risk Radar Alert: Wi-Fi Bottleneck",
                "message": "Critical dependency identified: 400 attendees require high-bandwidth infrastructure. Review mitigation action plan.",
                "type": NotificationType.RISK_ALERT,
                "link_url": "/app/risks",
            },
            {
                "title": "📋 Task Assigned: Title Sponsor Deliverables",
                "message": "Alex President assigned you to confirm sponsorship deliverables and verify payment gateway access.",
                "type": NotificationType.TASK_ASSIGNED,
                "link_url": "/app/tasks",
            },
            {
                "title": f"📅 New Event: {events[0].title if events else 'Cloud Bootcamp'}",
                "message": f"New campus initiative scheduled. Target quota: {events[0].min_volunteers_required if events else 8} student volunteers.",
                "type": NotificationType.EVENT_CREATED,
                "link_url": f"/app/events/{events[0].id if events else ''}",
            },
            {
                "title": "🤝 Join Request Received",
                "message": "New student application received for Club Membership. Review credentials in Membership portal.",
                "type": NotificationType.SYSTEM,
                "link_url": "/app/members",
            }
        ]

        # Add notifications for every user so everyone has active notifications
        total_created = 0
        for u in users:
            # Check existing notifications
            existing_count = db.query(Notification).filter(Notification.user_id == u.id).count()
            if existing_count < 3:
                for idx, n in enumerate(sample_notifs):
                    created_at = datetime.utcnow() - timedelta(minutes=15 * (idx + 1))
                    notif = Notification(
                        user_id=u.id,
                        title=n["title"],
                        message=n["message"],
                        type=n["type"],
                        is_read=(idx > 2),  # First 3 are unread
                        link_url=n["link_url"],
                        created_at=created_at,
                    )
                    db.add(notif)
                    total_created += 1

        db.commit()
        print(f"Successfully seeded {total_created} notifications across {len(users)} users!")
    except Exception as e:
        db.rollback()
        print("Error seeding notifications:", e)
    finally:
        db.close()

if __name__ == "__main__":
    seed_notifications()
