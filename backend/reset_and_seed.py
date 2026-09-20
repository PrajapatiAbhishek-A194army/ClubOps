import sys
from pathlib import Path
from datetime import datetime, timedelta

# Ensure backend root in path
sys.path.insert(0, str(Path(__file__).resolve().parent))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from sqlalchemy import text
from app.database.session import SessionLocal
from app.models.club import Club, ClubMembership, ClubRole, ClubStatus
from app.models.event import Event, EventStatus, EventType
from app.models.task import Task, TaskPriority, TaskStatus
from app.models.user import User
from app.models.volunteer import AvailabilityStatus, CheckInStatus, VolunteerProfile
from app.models.meeting import Meeting, ActionItem, ActionItemStatus
from app.models.announcement import Announcement, AnnouncementStatus, AnnouncementSource
from app.models.risk import Risk, RiskSeverity, RiskStatus, RiskSource
from app.models.notification import Notification, NotificationType
from app.utils.security import get_password_hash


def reset_and_seed():
    db = SessionLocal()
    try:
        print("🧹 Cleaning all testing and cluttered data from database...")

        tables = [
            "chat_messages",
            "action_items",
            "meetings",
            "announcements",
            "notifications",
            "risks",
            "audit_logs",
            "task_assignments",
            "tasks",
            "event_members",
            "events",
            "availabilities",
            "volunteer_skills",
            "volunteer_profiles",
            "skills",
            "join_requests",
            "club_memberships",
            "clubs",
            "document_chunks",
            "documents",
            "users",
        ]

        is_sqlite = db.bind.dialect.name == "sqlite"
        if is_sqlite:
            db.execute(text("PRAGMA foreign_keys = OFF;"))
            for t in tables:
                try:
                    db.execute(text(f'DELETE FROM "{t}";'))
                except Exception as e:
                    pass
            db.execute(text("PRAGMA foreign_keys = ON;"))
        else:
            for t in tables:
                try:
                    db.execute(text(f'TRUNCATE TABLE "{t}" RESTART IDENTITY CASCADE;'))
                except Exception as e:
                    pass

        db.commit()
        print("✨ Database wiped completely clean.")

        print("\n🌱 Seeding high-quality, realistic dummy data for testing...")

        # 1. Seed Core Demo Users
        default_pwd_hash = get_password_hash("ClubOps2026!")

        demo_users_data = [
            {
                "email": "president@clubops.ai",
                "full_name": "Alex President",
                "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
                "is_superuser": True,
            },
            {
                "email": "organizer@clubops.ai",
                "full_name": "Priya Patel",
                "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
                "is_superuser": False,
            },
            {
                "email": "medialead@clubops.ai",
                "full_name": "Aisha Verma",
                "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Aisha",
                "is_superuser": False,
            },
            {
                "email": "volunteer@clubops.ai",
                "full_name": "Kabir Das",
                "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Kabir",
                "is_superuser": False,
            },
            {
                "email": "member@clubops.ai",
                "full_name": "Sara Khan",
                "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Sara",
                "is_superuser": False,
            },
        ]

        users = {}
        for u in demo_users_data:
            user_obj = User(
                email=u["email"],
                full_name=u["full_name"],
                hashed_password=default_pwd_hash,
                avatar_url=u["avatar_url"],
                is_superuser=u["is_superuser"],
            )
            db.add(user_obj)
            db.flush()
            users[u["email"]] = user_obj
            print(f"  ✓ User: {u['full_name']} ({u['email']})")

        # 2. Seed Campus Clubs
        clubs_data = [
            {
                "name": "Google Developer Student Club",
                "code": "gdsc-campus",
                "description": "University tech community focused on cloud, AI, and developer empowerment.",
                "institution": "Institute of Technology & Engineering",
                "created_by": users["president@clubops.ai"],
            },
            {
                "name": "Robotics & Automation Society",
                "code": "ras-campus",
                "description": "Building competitive battle bots, autonomous rovers, and IoT hardware projects.",
                "institution": "Institute of Technology & Engineering",
                "created_by": users["president@clubops.ai"],
            },
            {
                "name": "ACM Student Chapter",
                "code": "acm-campus",
                "description": "Advancing computing as a science & profession through hackathons and leagues.",
                "institution": "Institute of Technology & Engineering",
                "created_by": users["president@clubops.ai"],
            },
        ]

        clubs = {}
        for c in clubs_data:
            club_obj = Club(
                name=c["name"],
                code=c["code"],
                description=c["description"],
                institution=c["institution"],
                created_by_id=c["created_by"].id,
                status=ClubStatus.ACTIVE,
            )
            db.add(club_obj)
            db.flush()
            clubs[c["code"]] = club_obj
            print(f"  ✓ Club: {c['name']}")

        # 3. Seed Club Memberships & Roles
        # Single Club Head constraint: Priya Patel is ONLY Club Head of GDSC
        # President: Alex President oversees campus clubs
        memberships = [
            (users["president@clubops.ai"], clubs["gdsc-campus"], ClubRole.PRESIDENT, "Executive Board"),
            (users["organizer@clubops.ai"], clubs["gdsc-campus"], ClubRole.CLUB_HEAD, "Operations & Events"),
            (users["medialead@clubops.ai"], clubs["gdsc-campus"], ClubRole.VOLUNTEER, "Design & PR Squad"),
            (users["volunteer@clubops.ai"], clubs["gdsc-campus"], ClubRole.VOLUNTEER, "Technical & Logistics"),
            (users["member@clubops.ai"], clubs["gdsc-campus"], ClubRole.MEMBER, "General Member"),
            # Cross-club memberships
            (users["president@clubops.ai"], clubs["ras-campus"], ClubRole.PRESIDENT, "Executive Board"),
            (users["volunteer@clubops.ai"], clubs["ras-campus"], ClubRole.VOLUNTEER, "Hardware & Embedded"),
            (users["president@clubops.ai"], clubs["acm-campus"], ClubRole.PRESIDENT, "Executive Board"),
            (users["member@clubops.ai"], clubs["acm-campus"], ClubRole.MEMBER, "General Member"),
        ]

        for user, club, role, dept in memberships:
            m = ClubMembership(
                user_id=user.id,
                club_id=club.id,
                role=role,
                department=dept,
            )
            db.add(m)
            print(f"  ✓ Linked {user.full_name} as {role.value} in {club.name}")

        # 4. Seed Realistic Events with Concrete Milestone Dates & Real Roles
        gdsc = clubs["gdsc-campus"]
        ras = clubs["ras-campus"]

        events_data = [
            {
                "club": gdsc,
                "created_by": users["president@clubops.ai"],
                "title": "HackOut 2026: 36-Hour National AI Hackathon",
                "slug": "hackout-2026-national-ai",
                "description": "Annual flagship hackathon bringing 350+ student developers together to build production AI agents and developer tooling.",
                "location": "Main Campus Convention Hall & Innovation Center",
                "event_type": EventType.HACKATHON,
                "status": EventStatus.ON_TRACK,
                "start_date": datetime.utcnow() + timedelta(days=18),
                "end_date": datetime.utcnow() + timedelta(days=20),
                "budget": 150000.0,
                "timeline": [
                    {
                        "id": "m1",
                        "title": "Theme Finalization & Problem Statements Released",
                        "target_date": (datetime.utcnow() - timedelta(days=5)).strftime("%Y-%m-%d"),
                        "completed": True,
                        "assigned_to": "President",
                    },
                    {
                        "id": "m2",
                        "title": "Faculty Advisor & Campus Venue Sanction",
                        "target_date": (datetime.utcnow() - timedelta(days=2)).strftime("%Y-%m-%d"),
                        "completed": True,
                        "assigned_to": "Club Head",
                    },
                    {
                        "id": "m3",
                        "title": "Sponsor Outreach & API Credits Contract",
                        "target_date": (datetime.utcnow() + timedelta(days=3)).strftime("%Y-%m-%d"),
                        "completed": False,
                        "assigned_to": "Club Head",
                    },
                    {
                        "id": "m4",
                        "title": "Registrations Open & Team Formations",
                        "target_date": (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d"),
                        "completed": False,
                        "assigned_to": "Volunteer",
                    },
                    {
                        "id": "m5",
                        "title": "Swag, Food Logistics & Volunteer Shift Briefing",
                        "target_date": (datetime.utcnow() + timedelta(days=16)).strftime("%Y-%m-%d"),
                        "completed": False,
                        "assigned_to": "Volunteer",
                    },
                ],
                "checklists": {
                    "sponsor_checklist": [
                        "Deliverable agreement signed by Cloud partner",
                        "Keynote slide deck and sponsor banner verified",
                        "API sandbox access codes tested with student emails",
                    ],
                    "judge_checklist": [
                        "Rubric: Architecture (30%), Impact (30%), Execution (40%)",
                        "Briefing meeting link dispatched to 6 industry judges",
                        "Scoreboard live synchronization link prepared",
                    ],
                    "volunteer_specs": [
                        "Registration desk: 4 volunteers (08:00 - 12:00)",
                        "Server and network room monitoring: 2 volunteers",
                        "Midnight snack & energy drink distribution: 6 volunteers",
                    ],
                },
            },
            {
                "club": gdsc,
                "created_by": users["organizer@clubops.ai"],
                "title": "Cloud Native & Kubernetes Hands-on Bootcamp",
                "slug": "cloud-native-bootcamp",
                "description": "Full-day intensive workshop guiding students through containerizing FastAPI applications, microservices, and CI/CD pipelines.",
                "location": "Computer Center Lab 4",
                "event_type": EventType.WORKSHOP,
                "status": EventStatus.PLANNING,
                "start_date": datetime.utcnow() + timedelta(days=32),
                "end_date": datetime.utcnow() + timedelta(days=32, hours=8),
                "budget": 25000.0,
                "timeline": [
                    {
                        "id": "m1",
                        "title": "Lab Reservation & High-Speed Network Sanction",
                        "target_date": (datetime.utcnow() + timedelta(days=5)).strftime("%Y-%m-%d"),
                        "completed": True,
                        "assigned_to": "Club Head",
                    },
                    {
                        "id": "m2",
                        "title": "Docker & Kubernetes Lab Exercises Repo Prepared",
                        "target_date": (datetime.utcnow() + timedelta(days=14)).strftime("%Y-%m-%d"),
                        "completed": False,
                        "assigned_to": "Volunteer",
                    },
                    {
                        "id": "m3",
                        "title": "Prerequisite Check & Attendance Cap (60 seats)",
                        "target_date": (datetime.utcnow() + timedelta(days=22)).strftime("%Y-%m-%d"),
                        "completed": False,
                        "assigned_to": "Volunteer",
                    },
                ],
                "checklists": {
                    "sponsor_checklist": [
                        "Cloud credits coupon distribution sheet prepared",
                    ],
                    "judge_checklist": [],
                    "volunteer_specs": [
                        "Lab workstation setup & OS image sanity check: 3 volunteers",
                        "Attendance badge check & sticker handout: 2 volunteers",
                    ],
                },
            },
            {
                "club": ras,
                "created_by": users["president@clubops.ai"],
                "title": "RoboWars 2026: Campus Combat Arena",
                "slug": "robowars-2026-combat-arena",
                "description": "High-octane lightweight (15kg & 30kg) combat robotics championship featuring 24 university bot teams.",
                "location": "University Outdoor Sports Complex",
                "event_type": EventType.EXPO,
                "status": EventStatus.AT_RISK,
                "start_date": datetime.utcnow() + timedelta(days=11),
                "end_date": datetime.utcnow() + timedelta(days=12),
                "budget": 180000.0,
                "timeline": [
                    {
                        "id": "m1",
                        "title": "Polycarbonate Safety Arena Construction",
                        "target_date": (datetime.utcnow() - timedelta(days=3)).strftime("%Y-%m-%d"),
                        "completed": True,
                        "assigned_to": "President",
                    },
                    {
                        "id": "m2",
                        "title": "Fire Marshall & Safety Hazard Clearance",
                        "target_date": (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d"),
                        "completed": False,
                        "assigned_to": "President",
                    },
                    {
                        "id": "m3",
                        "title": "Team Weigh-in & Weapon Failsafe Inspection",
                        "target_date": (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d"),
                        "completed": False,
                        "assigned_to": "Volunteer",
                    },
                ],
                "checklists": {
                    "sponsor_checklist": [
                        "Industrial hardware tool supplier sponsor banners",
                    ],
                    "judge_checklist": [
                        "Combat scoring guidelines: Aggression, Control, Damage",
                        "3 Emergency stop switches operational at judge table",
                    ],
                    "volunteer_specs": [
                        "Pit safety marshals: 4 volunteers",
                        "Arena sweep & debris removal crew: 4 volunteers",
                    ],
                },
            },
        ]

        events = {}
        for ev in events_data:
            ev_obj = Event(
                club_id=ev["club"].id,
                created_by_id=ev["created_by"].id,
                title=ev["title"],
                slug=ev["slug"],
                description=ev["description"],
                location=ev["location"],
                event_type=ev["event_type"],
                status=ev["status"],
                start_date=ev["start_date"],
                end_date=ev["end_date"],
                budget=ev["budget"],
                timeline=ev["timeline"],
                checklists=ev["checklists"],
            )
            db.add(ev_obj)
            db.flush()
            events[ev["slug"]] = ev_obj
            print(f"  ✓ Event: {ev['title']} ({ev['status'].value})")

        # 5. Seed Tasks with Clean Dependency Graph
        hackout_ev = events["hackout-2026-national-ai"]
        bootcamp_ev = events["cloud-native-bootcamp"]
        robowars_ev = events["robowars-2026-combat-arena"]

        # Prerequisite tasks
        t1 = Task(
            club_id=gdsc.id,
            event_id=hackout_ev.id,
            creator_id=users["president@clubops.ai"].id,
            assignee_id=users["organizer@clubops.ai"].id,
            title="Confirm Title Sponsor Deliverables & Bank Transfer",
            description="Receive signed contract and corporate funds transfer confirmation from title cloud sponsor.",
            status=TaskStatus.DONE,
            priority=TaskPriority.URGENT,
            deadline=datetime.utcnow() + timedelta(days=2),
        )
        t2 = Task(
            club_id=gdsc.id,
            event_id=hackout_ev.id,
            creator_id=users["organizer@clubops.ai"].id,
            assignee_id=users["medialead@clubops.ai"].id,
            title="Design Hackathon Attendee Badges and Lanyards",
            description="Prepare vector print-ready templates with sponsor logos, barcode spots, and participant categorizations.",
            status=TaskStatus.DONE,
            priority=TaskPriority.HIGH,
            deadline=datetime.utcnow() + timedelta(days=4),
        )
        t3 = Task(
            club_id=gdsc.id,
            event_id=hackout_ev.id,
            creator_id=users["president@clubops.ai"].id,
            assignee_id=users["volunteer@clubops.ai"].id,
            title="Procure High-Speed Gigabit Switches & Lab Access Points",
            description="Acquire 8 24-port switches and industrial Wi-Fi access points from college IT department.",
            status=TaskStatus.TODO,
            priority=TaskPriority.URGENT,
            deadline=datetime.utcnow() + timedelta(days=6),
        )
        t4 = Task(
            club_id=ras.id,
            event_id=robowars_ev.id,
            creator_id=users["president@clubops.ai"].id,
            assignee_id=users["president@clubops.ai"].id,
            title="Inspect Combat Arena Polycarbonate Enclosure",
            description="Perform structural stability inspection and bullet-proof polycarbonate impact resistance testing.",
            status=TaskStatus.TODO,
            priority=TaskPriority.URGENT,
            deadline=datetime.utcnow() + timedelta(days=3),
        )

        db.add_all([t1, t2, t3, t4])
        db.flush()

        # Dependent tasks
        t5 = Task(
            club_id=gdsc.id,
            event_id=hackout_ev.id,
            creator_id=users["organizer@clubops.ai"].id,
            assignee_id=users["volunteer@clubops.ai"].id,
            title="Print 400 Attendee Badges & Assemble Welcome Kits",
            description="Send badge print files to vendor and assemble lanyard tags with NFC tags.",
            status=TaskStatus.IN_PROGRESS,
            priority=TaskPriority.HIGH,
            deadline=datetime.utcnow() + timedelta(days=12),
            depends_on_task_id=t2.id,  # Prereq DONE -> Not blocked
        )
        t6 = Task(
            club_id=gdsc.id,
            event_id=hackout_ev.id,
            creator_id=users["organizer@clubops.ai"].id,
            assignee_id=users["volunteer@clubops.ai"].id,
            title="Convention Hall Main Stage AV Rigging & Network Deployment",
            description="Deploy network switches and wire up projector and live stage feed.",
            status=TaskStatus.BLOCKED,
            priority=TaskPriority.HIGH,
            deadline=datetime.utcnow() + timedelta(days=14),
            depends_on_task_id=t3.id,  # Prereq TODO -> BLOCKED!
        )
        t7 = Task(
            club_id=gdsc.id,
            event_id=hackout_ev.id,
            creator_id=users["president@clubops.ai"].id,
            assignee_id=users["medialead@clubops.ai"].id,
            title="Broadcast Sponsor Announcements on Instagram & LinkedIn",
            description="Feature premier sponsor deliverables across campus social media handles.",
            status=TaskStatus.IN_PROGRESS,
            priority=TaskPriority.MEDIUM,
            deadline=datetime.utcnow() + timedelta(days=8),
            depends_on_task_id=t1.id,  # Prereq DONE
        )
        t8 = Task(
            club_id=gdsc.id,
            event_id=bootcamp_ev.id,
            creator_id=users["organizer@clubops.ai"].id,
            assignee_id=users["volunteer@clubops.ai"].id,
            title="Docker Base Image Vulnerability Scans & Lab Repos",
            description="Pre-pull student sandbox container images onto all 60 lab workstations.",
            status=TaskStatus.TODO,
            priority=TaskPriority.HIGH,
            deadline=datetime.utcnow() + timedelta(days=20),
        )

        db.add_all([t5, t6, t7, t8])
        db.flush()
        print("  ✓ Seeded 8 realistic tasks with dependencies")

        # 6. Seed Volunteer Profiles
        volunteers_seed = [
            {
                "club": gdsc,
                "user": users["volunteer@clubops.ai"],
                "skills": [
                    "Audio / Visual (AV)",
                    "Network & Wi-Fi Setup",
                    "Hardware & Robotics",
                    "Python / Backend",
                    "Registration Desk",
                    "Crowd Management",
                    "Equipment Transport",
                ],
                "department": "Technical & Logistics Operations",
                "availability_status": AvailabilityStatus.AVAILABLE,
                "availability_notes": "Available for morning and afternoon shifts, weekends open",
                "available_hours_per_week": 20,
                "check_in_status": CheckInStatus.CHECKED_IN,
                "checked_in_at": datetime.utcnow() - timedelta(hours=2),
                "phone_number": "+91 98765 43210",
                "rating": 4.9,
            },
            {
                "club": gdsc,
                "user": users["medialead@clubops.ai"],
                "skills": [
                    "Graphic Design",
                    "Videography",
                    "Emcee & Anchoring",
                    "Speaker Liaison",
                ],
                "department": "Design & PR",
                "availability_status": AvailabilityStatus.ON_SHIFT,
                "availability_notes": "Managing event live streaming and guest speaker introductions",
                "available_hours_per_week": 16,
                "check_in_status": CheckInStatus.CHECKED_IN,
                "checked_in_at": datetime.utcnow() - timedelta(hours=3),
                "phone_number": "+91 98222 33445",
                "rating": 4.9,
            },
            {
                "club": gdsc,
                "user": users["member@clubops.ai"],
                "skills": [
                    "Social Media & Live PR",
                    "Photography",
                    "Registration Desk",
                ],
                "department": "Media & PR",
                "availability_status": AvailabilityStatus.AVAILABLE,
                "availability_notes": "Available after 2 PM daily, carries personal DSLR equipment",
                "available_hours_per_week": 12,
                "check_in_status": CheckInStatus.CHECKED_OUT,
                "checked_in_at": None,
                "phone_number": "+91 98111 22334",
                "rating": 4.8,
            },
        ]

        for v in volunteers_seed:
            vol_obj = VolunteerProfile(
                club_id=v["club"].id,
                user_id=v["user"].id,
                skills=v["skills"],
                department=v["department"],
                availability_status=v["availability_status"],
                availability_notes=v["availability_notes"],
                available_hours_per_week=v["available_hours_per_week"],
                check_in_status=v["check_in_status"],
                checked_in_at=v["checked_in_at"],
                phone_number=v["phone_number"],
                rating=v["rating"],
            )
            db.add(vol_obj)
        db.flush()
        print("  ✓ Seeded volunteer profiles & skills")

        # 7. Seed Meetings & Action Items
        m1 = Meeting(
            club_id=gdsc.id,
            event_id=hackout_ev.id,
            created_by_id=users["organizer@clubops.ai"].id,
            title="HackOut 2026 Core Operations Standup",
            transcript_text=(
                "Priya: We need to coordinate convention center power sanction and air conditioning with estate office.\n"
                "Kabir: I will visit the IT center to pick up the 8 gigabit switches tomorrow.\n"
                "Aisha: Social graphics are ready; I'll schedule the sponsor shoutouts on Instagram and LinkedIn."
            ),
            meeting_date=datetime.utcnow() - timedelta(days=1),
            processed_at=datetime.utcnow() - timedelta(days=1),
        )
        db.add(m1)
        db.flush()

        ai1 = ActionItem(
            meeting_id=m1.id,
            title="Coordinate convention center power sanction with estate office",
            description="Request 15kW 3-phase load clearance for hacker bays.",
            suggested_owner="Priya Patel",
            suggested_deadline=datetime.utcnow() + timedelta(days=2),
            confidence_score=0.96,
            status=ActionItemStatus.CONFIRMED,
        )
        ai2 = ActionItem(
            meeting_id=m1.id,
            title="Procure gigabit network switches from IT department",
            description="Collect 8 switches and verify patch cables.",
            suggested_owner="Kabir Das",
            suggested_deadline=datetime.utcnow() + timedelta(days=1),
            confidence_score=0.98,
            status=ActionItemStatus.CONVERTED,
            created_task_id=t3.id,
        )
        ai3 = ActionItem(
            meeting_id=m1.id,
            title="Schedule premier sponsor shoutout announcements",
            description="Post graphics approved by title partner.",
            suggested_owner="Aisha Verma",
            suggested_deadline=datetime.utcnow() + timedelta(days=3),
            confidence_score=0.94,
            status=ActionItemStatus.CONFIRMED,
        )
        db.add_all([ai1, ai2, ai3])
        print("  ✓ Seeded meetings & extracted action items")

        # 8. Seed Announcements
        ann1 = Announcement(
            club_id=gdsc.id,
            event_id=hackout_ev.id,
            title="🚀 HackOut 2026: Official Registrations & Problem Statements Released!",
            content="Welcome student developers! Registrations for HackOut 2026 are officially open. Over ₹1,50,000 in cash prizes and cloud credits. Form teams of 2-4 and submit your team applications through the campus portal.",
            created_by_id=users["organizer@clubops.ai"].id,
            created_source=AnnouncementSource.MANUAL,
            status=AnnouncementStatus.PUBLISHED,
            category="GENERAL",
            target_channel="IN_APP",
            published_at=datetime.utcnow() - timedelta(days=3),
        )
        ann2 = Announcement(
            club_id=gdsc.id,
            event_id=hackout_ev.id,
            title="📢 Volunteer Roster & Pre-Event Briefing Session",
            content="Mandatory operations briefing for all confirmed volunteers this Thursday at 4:00 PM in Innovation Center Hall 204. Badges, logistics shifts, and emergency desk contacts will be distributed.",
            created_by_id=users["organizer@clubops.ai"].id,
            created_source=AnnouncementSource.MANUAL,
            status=AnnouncementStatus.PUBLISHED,
            category="EVENT",
            target_channel="IN_APP",
            published_at=datetime.utcnow() - timedelta(days=1),
        )
        ann3 = Announcement(
            club_id=gdsc.id,
            event_id=bootcamp_ev.id,
            title="🛠️ Cloud Bootcamp Lab Image Pre-requisites",
            content="Draft guidelines for Computer Center Lab 4 workstations before the Kubernetes bootcamp session begins.",
            created_by_id=users["organizer@clubops.ai"].id,
            created_source=AnnouncementSource.AI_DRAFTED,
            status=AnnouncementStatus.DRAFT,
            category="ACADEMIC",
            target_channel="IN_APP",
        )
        db.add_all([ann1, ann2, ann3])
        print("  ✓ Seeded realistic campus announcements")

        # 9. Seed Risk Radar Items
        r1 = Risk(
            event_id=hackout_ev.id,
            related_task_id=t6.id,
            title="HIGH RISK: Main Stage AV Rigging Blocked by Switch Procurement",
            description="The AV Rigging and network deployment task is currently blocked because prerequisite switch procurement is still pending.",
            severity=RiskSeverity.HIGH,
            status=RiskStatus.OPEN,
            source=RiskSource.RULE_ENGINE,
        )
        r2 = Risk(
            event_id=hackout_ev.id,
            title="Wi-Fi Bandwidth Bottleneck for 350+ Hackathon Participants",
            description="Projected bandwidth requirement during live demos exceeds default auditorium AP limits. Secondary Wi-Fi controller required.",
            severity=RiskSeverity.MEDIUM,
            status=RiskStatus.OPEN,
            source=RiskSource.AI,
        )
        db.add_all([r1, r2])
        print("  ✓ Seeded risk radar items")

        # 10. Seed Notifications for Users
        for email, u in users.items():
            sample_notifs = [
                Notification(
                    user_id=u.id,
                    title="🤖 AI Operations Briefing",
                    message="Operational roadmap for HackOut 2026 is synced. Milestones and dependencies updated.",
                    type=NotificationType.SYSTEM,
                    link_url=f"/app/events/{hackout_ev.id}",
                    is_read=False,
                    created_at=datetime.utcnow() - timedelta(minutes=20),
                ),
                Notification(
                    user_id=u.id,
                    title="⚠️ Risk Radar Alert: AV Rigging Blocked",
                    message="Prerequisite hardware procurement is delaying Main Stage AV Rigging.",
                    type=NotificationType.RISK_ALERT,
                    link_url="/app/risks",
                    is_read=False,
                    created_at=datetime.utcnow() - timedelta(hours=1),
                ),
                Notification(
                    user_id=u.id,
                    title="📋 Task Assigned: Procurement Review",
                    message="Assigned task in GDSC operations queue. Due in 6 days.",
                    type=NotificationType.TASK_ASSIGNED,
                    link_url="/app/tasks",
                    is_read=True,
                    created_at=datetime.utcnow() - timedelta(hours=4),
                ),
                Notification(
                    user_id=u.id,
                    title="📅 New Event Scheduled: HackOut 2026",
                    message="Flagship 36-Hour Hackathon approved by campus leadership.",
                    type=NotificationType.EVENT_CREATED,
                    link_url=f"/app/events/{hackout_ev.id}",
                    is_read=True,
                    created_at=datetime.utcnow() - timedelta(days=1),
                ),
            ]
            db.add_all(sample_notifs)
        print("  ✓ Seeded notifications across all demo accounts")

        db.commit()
        print("\n🎉 Database successfully reset and seeded with pristine dummy data!")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error during reset and seed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    reset_and_seed()
