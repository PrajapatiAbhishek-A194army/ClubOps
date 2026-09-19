import logging
from datetime import datetime, timedelta
from app.database.session import Base, SessionLocal, engine
from app.models.club import Club, ClubMembership, ClubRole, ClubStatus, MembershipStatus
from app.models.event import Event, EventMember, EventMemberRole, EventMemberStatus, EventStatus, EventType
from app.models.notification import Notification, NotificationType
from app.models.risk import Risk, RiskSeverity, RiskSource, RiskStatus
from app.models.skill import Skill, VolunteerSkill
from app.models.task import (
    AssignmentSource,
    AssignmentStatus,
    Task,
    TaskAssignment,
    TaskCreatedSource,
    TaskPriority,
    TaskStatus,
)
from app.models.user import User
from app.models.availability import Availability, AvailabilityStatus
from app.models.meeting import Meeting, ActionItem, ActionItemStatus
from app.models.document import Document, DocumentChunk
from app.utils.security import get_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_master")


def seed_database():
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        existing_user = db.query(User).filter(User.email == "president@demo.clubops").first()
        if existing_user:
            logger.info("Database already seeded with demo accounts. Refreshing demo state...")
            return

        demo_password = get_password_hash("DemoPass123!")
        now = datetime.utcnow()

        # 1. Users
        president = User(
            email="president@demo.clubops",
            hashed_password=demo_password,
            full_name="Dr. Vikram Sharma",
            phone_number="+91-98765-43210",
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
            is_active=True,
            is_superuser=True,
        )
        head_amit = User(
            email="head@demo.clubops",
            hashed_password=demo_password,
            full_name="Amit Verma",
            phone_number="+91-98765-11111",
            avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
            is_active=True,
        )
        head_neha = User(
            email="head2@demo.clubops",
            hashed_password=demo_password,
            full_name="Neha Gupta",
            phone_number="+91-98765-22222",
            avatar_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
            is_active=True,
        )
        volunteer_rahul = User(
            email="volunteer@demo.clubops",
            hashed_password=demo_password,
            full_name="Rahul Deshmukh",
            phone_number="+91-98765-33333",
            avatar_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
            is_active=True,
        )
        volunteer_priya = User(
            email="priya@demo.clubops",
            hashed_password=demo_password,
            full_name="Priya Nair",
            phone_number="+91-98765-44444",
            avatar_url="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
            is_active=True,
        )
        volunteer_arjun = User(
            email="arjun@demo.clubops",
            hashed_password=demo_password,
            full_name="Arjun Patel",
            phone_number="+91-98765-55555",
            avatar_url="https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150",
            is_active=True,
        )
        volunteer_sneha = User(
            email="sneha@demo.clubops",
            hashed_password=demo_password,
            full_name="Sneha Rao",
            phone_number="+91-98765-66666",
            avatar_url="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
            is_active=True,
        )
        volunteer_kavya = User(
            email="kavya@demo.clubops",
            hashed_password=demo_password,
            full_name="Kavya Reddy",
            phone_number="+91-98765-77777",
            avatar_url="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
            is_active=True,
        )
        volunteer_rohan = User(
            email="rohan@demo.clubops",
            hashed_password=demo_password,
            full_name="Rohan Mehra",
            phone_number="+91-98765-88888",
            avatar_url="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150",
            is_active=True,
        )

        all_users = [
            president, head_amit, head_neha, volunteer_rahul,
            volunteer_priya, volunteer_arjun, volunteer_sneha,
            volunteer_kavya, volunteer_rohan,
        ]
        db.add_all(all_users)
        db.flush()

        # 2. Clubs
        coder_club = Club(
            name="CoderClub",
            code="coder",
            description="The premier software development and technical innovation club on campus.",
            institution="Apex Institute of Technology",
            status=ClubStatus.ACTIVE,
            created_by_id=president.id,
        )
        robotics_club = Club(
            name="RoboticsClub",
            code="robotics",
            description="Autonomous systems, embedded IoT engineering, and annual rover competitions.",
            institution="Apex Institute of Technology",
            status=ClubStatus.ACTIVE,
            created_by_id=president.id,
        )
        db.add_all([coder_club, robotics_club])
        db.flush()

        # 3. Memberships
        memberships = [
            # CoderClub
            ClubMembership(club_id=coder_club.id, user_id=president.id, role=ClubRole.PRESIDENT, department="Governance"),
            ClubMembership(club_id=coder_club.id, user_id=head_amit.id, role=ClubRole.CLUB_HEAD, department="Technical Ops"),
            ClubMembership(club_id=coder_club.id, user_id=volunteer_rahul.id, role=ClubRole.VOLUNTEER, department="Data & Analytics"),
            ClubMembership(club_id=coder_club.id, user_id=volunteer_priya.id, role=ClubRole.VOLUNTEER, department="Venue & Logistics"),
            ClubMembership(club_id=coder_club.id, user_id=volunteer_arjun.id, role=ClubRole.VOLUNTEER, department="Design & Media"),
            ClubMembership(club_id=coder_club.id, user_id=volunteer_sneha.id, role=ClubRole.VOLUNTEER, department="Event Operations"),
            ClubMembership(club_id=coder_club.id, user_id=volunteer_kavya.id, role=ClubRole.VOLUNTEER, department="Technical"),
            ClubMembership(club_id=coder_club.id, user_id=volunteer_rohan.id, role=ClubRole.VOLUNTEER, department="Audio Visual"),

            # RoboticsClub
            ClubMembership(club_id=robotics_club.id, user_id=president.id, role=ClubRole.PRESIDENT, department="Governance"),
            ClubMembership(club_id=robotics_club.id, user_id=head_neha.id, role=ClubRole.CLUB_HEAD, department="Hardware Lead"),
            ClubMembership(club_id=robotics_club.id, user_id=volunteer_rahul.id, role=ClubRole.VOLUNTEER, department="Firmware"),
        ]
        db.add_all(memberships)
        db.flush()

        # 4. Skills Catalog
        skills_data = [
            ("Power BI", "Technical", "Data modeling, DAX queries, and dashboard development"),
            ("Python", "Technical", "Scripting, FastAPI backend, and algorithmic problem solving"),
            ("Event Management", "Operations", "Timeline tracking, vendor relations, and team coordination"),
            ("Audio/Visual", "Media", "Projector routing, sound mixing, and livestream broadcast"),
            ("Logistics", "Operations", "Registration desks, equipment transport, and crowd control"),
            ("Design & Media", "Creative", "Figma posters, branding guidelines, and social carousels"),
            ("Sponsorship", "Finance", "Corporate outreach, pitch decks, and budget reconciliation"),
        ]
        skill_map = {}
        for name, cat, desc in skills_data:
            s = Skill(name=name, category=cat, description=desc)
            db.add(s)
            db.flush()
            skill_map[name] = s

        # Volunteer Skills
        volunteer_skills = [
            # Rahul
            VolunteerSkill(user_id=volunteer_rahul.id, skill_id=skill_map["Power BI"].id, proficiency=5, experience_years=2.5),
            VolunteerSkill(user_id=volunteer_rahul.id, skill_id=skill_map["Python"].id, proficiency=4, experience_years=2.0),
            VolunteerSkill(user_id=volunteer_rahul.id, skill_id=skill_map["Event Management"].id, proficiency=3, experience_years=1.0),

            # Priya
            VolunteerSkill(user_id=volunteer_priya.id, skill_id=skill_map["Logistics"].id, proficiency=5, experience_years=2.0),
            VolunteerSkill(user_id=volunteer_priya.id, skill_id=skill_map["Event Management"].id, proficiency=4, experience_years=1.5),

            # Arjun
            VolunteerSkill(user_id=volunteer_arjun.id, skill_id=skill_map["Design & Media"].id, proficiency=5, experience_years=3.0),

            # Rohan
            VolunteerSkill(user_id=volunteer_rohan.id, skill_id=skill_map["Audio/Visual"].id, proficiency=5, experience_years=2.0),

            # Kavya
            VolunteerSkill(user_id=volunteer_kavya.id, skill_id=skill_map["Power BI"].id, proficiency=4, experience_years=1.5),
            VolunteerSkill(user_id=volunteer_kavya.id, skill_id=skill_map["Python"].id, proficiency=4, experience_years=2.0),
        ]
        db.add_all(volunteer_skills)

        # 5. Availability
        availabilities = [
            Availability(user_id=volunteer_rahul.id, start_datetime=now - timedelta(days=1), end_datetime=now + timedelta(days=14), status=AvailabilityStatus.AVAILABLE),
            Availability(user_id=volunteer_priya.id, start_datetime=now - timedelta(days=1), end_datetime=now + timedelta(days=14), status=AvailabilityStatus.AVAILABLE),
            Availability(user_id=volunteer_arjun.id, start_datetime=now - timedelta(days=1), end_datetime=now + timedelta(days=14), status=AvailabilityStatus.AVAILABLE),
            Availability(user_id=volunteer_rohan.id, start_datetime=now - timedelta(days=1), end_datetime=now + timedelta(days=14), status=AvailabilityStatus.AVAILABLE),
        ]
        db.add_all(availabilities)
        db.flush()

        # 6. Events
        event_start = now + timedelta(days=5)
        event_end = event_start + timedelta(hours=6)
        power_bi_event = Event(
            club_id=coder_club.id,
            created_by_id=head_amit.id,
            title="Hands-on Power BI Workshop",
            slug="hands-on-power-bi-workshop",
            description="Intensive 1-day masterclass on Power BI dashboarding, DAX expressions, and live enterprise data pipelines for 300 students.",
            location="Campus Central Auditorium",
            event_type=EventType.WORKSHOP,
            status=EventStatus.PLANNED,
            start_date=event_start,
            end_date=event_end,
            budget=25000.0,
            min_volunteers_required=8,
            skill_requirements=[
                {"skill_name": "Power BI", "required_count": 3, "assigned_count": 2},
                {"skill_name": "Audio/Visual", "required_count": 2, "assigned_count": 1},
                {"skill_name": "Logistics", "required_count": 2, "assigned_count": 1},
                {"skill_name": "Design & Media", "required_count": 1, "assigned_count": 1},
            ],
        )
        db.add(power_bi_event)
        db.flush()

        # Event Members
        db.add_all([
            EventMember(event_id=power_bi_event.id, user_id=head_amit.id, role=EventMemberRole.EVENT_COORDINATOR, status=EventMemberStatus.CONFIRMED),
            EventMember(event_id=power_bi_event.id, user_id=volunteer_rahul.id, role=EventMemberRole.VOLUNTEER, status=EventMemberStatus.CONFIRMED),
            EventMember(event_id=power_bi_event.id, user_id=volunteer_priya.id, role=EventMemberRole.VOLUNTEER, status=EventMemberStatus.CONFIRMED),
            EventMember(event_id=power_bi_event.id, user_id=volunteer_arjun.id, role=EventMemberRole.VOLUNTEER, status=EventMemberStatus.CONFIRMED),
            EventMember(event_id=power_bi_event.id, user_id=volunteer_rohan.id, role=EventMemberRole.VOLUNTEER, status=EventMemberStatus.CONFIRMED),
        ])
        db.flush()

        # 7. Tasks across visual Kanban progression states
        # Prerequisite task
        t_permission = Task(
            club_id=coder_club.id,
            event_id=power_bi_event.id,
            creator_id=head_amit.id,
            title="Dean Approval & Permission Letter",
            description="Obtain formal stamped venue permission from the Student Affairs Council.",
            priority=TaskPriority.CRITICAL,
            status=TaskStatus.TODO,
            due_datetime=now + timedelta(hours=18),
            created_source=TaskCreatedSource.MANUAL,
        )
        db.add(t_permission)
        db.flush()

        # Blocked task (depends on permission)
        t_venue = Task(
            club_id=coder_club.id,
            event_id=power_bi_event.id,
            creator_id=head_amit.id,
            assignee_id=volunteer_priya.id,
            title="Confirm Auditorium Booking & Audio Key",
            description="Collect key from estate officer and confirm seating capacity for 300 attendees.",
            priority=TaskPriority.HIGH,
            status=TaskStatus.BLOCKED,
            due_datetime=now + timedelta(hours=24),
            depends_on_task_id=t_permission.id,
            created_source=TaskCreatedSource.MANUAL,
        )
        db.add(t_venue)
        db.flush()

        # In Progress task
        t_dataset = Task(
            club_id=coder_club.id,
            event_id=power_bi_event.id,
            creator_id=head_amit.id,
            assignee_id=volunteer_rahul.id,
            title="Prepare Power BI Sample Datasets & Labs",
            description="Clean e-commerce sales dataset and prepare exercise workbook for workshop attendees.",
            priority=TaskPriority.HIGH,
            status=TaskStatus.IN_PROGRESS,
            due_datetime=now + timedelta(days=2),
            created_source=TaskCreatedSource.AI,
        )
        # Completed tasks
        t_poster = Task(
            club_id=coder_club.id,
            event_id=power_bi_event.id,
            creator_id=head_amit.id,
            assignee_id=volunteer_arjun.id,
            title="Design & Finalize Event Flyer and Badges",
            description="Create 1080x1080 social media flyers and printable attendee lanyard name cards.",
            priority=TaskPriority.MEDIUM,
            status=TaskStatus.COMPLETED,
            due_datetime=now - timedelta(days=1),
            created_source=TaskCreatedSource.AI,
        )
        t_av = Task(
            club_id=coder_club.id,
            event_id=power_bi_event.id,
            creator_id=head_amit.id,
            assignee_id=volunteer_rohan.id,
            title="Conduct Audio Visual & Mic Check",
            description="Verify lapel mics, HDMI switchers, and auditorium PA system.",
            priority=TaskPriority.HIGH,
            status=TaskStatus.TODO,
            due_datetime=now + timedelta(days=3),
            created_source=TaskCreatedSource.AI,
        )

        db.add_all([t_dataset, t_poster, t_av])
        db.flush()

        # Task Assignments
        db.add_all([
            TaskAssignment(task_id=t_venue.id, user_id=volunteer_priya.id, assigned_by_id=head_amit.id, assignment_source=AssignmentSource.AI_APPROVED),
            TaskAssignment(task_id=t_dataset.id, user_id=volunteer_rahul.id, assigned_by_id=head_amit.id, assignment_source=AssignmentSource.AI_APPROVED),
            TaskAssignment(task_id=t_poster.id, user_id=volunteer_arjun.id, assigned_by_id=head_amit.id, assignment_source=AssignmentSource.AI_APPROVED),
            TaskAssignment(task_id=t_av.id, user_id=volunteer_rohan.id, assigned_by_id=head_amit.id, assignment_source=AssignmentSource.AI_APPROVED),
        ])

        # 8. Meeting & Action Items (Demonstrating Meeting Intelligence)
        meeting = Meeting(
            club_id=coder_club.id,
            event_id=power_bi_event.id,
            created_by_id=head_amit.id,
            title="Core Team Standup #1",
            transcript_text=(
                "Rahul will prepare the Power BI dataset by Friday.\n"
                "Priya will confirm the venue tomorrow.\n"
                "Arjun will prepare social media creatives by Thursday."
            ),
            meeting_date=now - timedelta(days=1),
            processed_at=now,
        )
        db.add(meeting)
        db.flush()

        db.add_all([
            ActionItem(meeting_id=meeting.id, title="Prepare Power BI dataset", suggested_owner="Rahul", suggested_deadline=now + timedelta(days=2), confidence_score=0.96, status=ActionItemStatus.CONVERTED, created_task_id=t_dataset.id),
            ActionItem(meeting_id=meeting.id, title="Confirm venue booking", suggested_owner="Priya", suggested_deadline=now + timedelta(days=1), confidence_score=0.94, status=ActionItemStatus.CONFIRMED),
            ActionItem(meeting_id=meeting.id, title="Prepare social media creatives", suggested_owner="Arjun", suggested_deadline=now + timedelta(days=3), confidence_score=0.92, status=ActionItemStatus.CONVERTED, created_task_id=t_poster.id),
        ])

        # 9. Detected Risks (Deterministic Radar)
        db.add_all([
            Risk(
                event_id=power_bi_event.id,
                related_task_id=t_venue.id,
                title="HIGH RISK: Venue Confirmation Blocked by Pending Permission",
                description="Venue booking is due in 24 hours, but prerequisite 'Dean Approval & Permission Letter' is still in status TODO.",
                severity=RiskSeverity.HIGH,
                status=RiskStatus.OPEN,
                source=RiskSource.RULE_ENGINE,
                detected_at=now - timedelta(hours=2),
            ),
            Risk(
                event_id=power_bi_event.id,
                title="Staffing Shortage (3 Volunteers Needed)",
                description="Event requires minimum 8 volunteers across Power BI, A/V, and Logistics. Currently 5 volunteers are confirmed.",
                severity=RiskSeverity.HIGH,
                status=RiskStatus.OPEN,
                source=RiskSource.RULE_ENGINE,
                detected_at=now - timedelta(hours=1),
            ),
        ])

        # 10. Notifications (Demonstrating Multi-Channel Alerts)
        db.add_all([
            Notification(
                user_id=volunteer_rahul.id,
                title="New Event: Hands-on Power BI Workshop",
                message="CoderClub announced 'Hands-on Power BI Workshop' on campus. Staffing needs: 8 volunteers.",
                type=NotificationType.EVENT_CREATED,
                link_url=f"/app/events/{power_bi_event.id}",
                is_read=False,
            ),
            Notification(
                user_id=volunteer_rahul.id,
                title="Task Assigned: Prepare Power BI Sample Datasets",
                message="Amit Verma assigned you to 'Prepare Power BI Sample Datasets' (HIGH priority, due in 2 days).",
                type=NotificationType.TASK_ASSIGNED,
                link_url="/app/tasks",
                is_read=False,
            ),
            Notification(
                user_id=head_amit.id,
                title="[HIGH RISK] Venue Confirmation Blocked",
                message="Event Risk Alert: Prerequisite Dean approval is still pending while venue booking deadline approaches.",
                type=NotificationType.RISK_ALERT,
                link_url="/app/risks",
                is_read=False,
            ),
        ])

        # 11. Institutional Knowledge Document
        doc = Document(
            club_id=coder_club.id,
            name="AIT_Auditorium_Operating_Procedures_2025.pdf",
            file_path="/storage/documents/AIT_Auditorium_Operating_Procedures_2025.pdf",
            file_type="application/pdf",
            uploaded_by_id=head_amit.id,
        )
        db.add(doc)
        db.flush()

        db.add_all([
            DocumentChunk(
                document_id=doc.id,
                chunk_index=0,
                chunk_text="All student technical workshops with more than 150 attendees must obtain Dean of Student Affairs sign-off at least 48 hours prior to event commencement. AV keys must be signed out from room 104.",
            ),
            DocumentChunk(
                document_id=doc.id,
                chunk_index=1,
                chunk_text="Power BI and lab workshops requiring institutional wifi hotspots must reserve subnet block B with the campus IT helpdesk 3 business days in advance.",
            ),
        ])

        db.commit()
        logger.info("Master database seed completed successfully!")

    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
