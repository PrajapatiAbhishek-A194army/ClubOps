import sys
from pathlib import Path

# Add backend to sys.path
sys.path.append(str(Path(__file__).resolve().parents[2]))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


from datetime import datetime, timedelta
from app.database.session import SessionLocal
from app.models.club import Club, ClubMembership, ClubRole
from app.models.event import Event, EventStatus, EventType
from app.models.task import Task, TaskPriority, TaskStatus
from app.models.user import User
from app.models.volunteer import AvailabilityStatus, CheckInStatus, VolunteerProfile
from app.utils.security import get_password_hash


def seed_demo_data():
    db = SessionLocal()
    try:
        print("🌱 Starting demo data seeding for ClubOps AI...")

        # Default demo password
        default_pwd_hash = get_password_hash("ClubOps2026!")

        # 1. Seed Users for all 5 roles
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

        users_by_email = {}
        for u_data in demo_users_data:
            existing = db.query(User).filter(User.email == u_data["email"]).first()
            if not existing:
                user = User(
                    email=u_data["email"],
                    full_name=u_data["full_name"],
                    hashed_password=default_pwd_hash,
                    avatar_url=u_data["avatar_url"],
                    is_superuser=u_data["is_superuser"],
                )
                db.add(user)
                db.flush()
                users_by_email[u_data["email"]] = user
                print(f"  ✓ Created user: {u_data['full_name']} ({u_data['email']})")
            else:
                users_by_email[u_data["email"]] = existing
                print(f"  ℹ User already exists: {u_data['email']}")

        # 2. Seed Campus Clubs
        clubs_data = [
            {
                "name": "Google Developer Student Club",
                "code": "gdsc-campus",
                "description": "University tech community focused on cloud, AI, and developer empowerment.",
                "institution": "Institute of Technology & Engineering",
                "created_by": users_by_email["president@clubops.ai"],
            },
            {
                "name": "Robotics & Automation Society",
                "code": "ras-campus",
                "description": "Building competitive battle bots, autonomous rovers, and IoT hardware projects.",
                "institution": "Institute of Technology & Engineering",
                "created_by": users_by_email["president@clubops.ai"],
            },
            {
                "name": "ACM Student Chapter",
                "code": "acm-campus",
                "description": "Advancing computing as a science & profession through hackathons and coding leagues.",
                "institution": "Institute of Technology & Engineering",
                "created_by": users_by_email["president@clubops.ai"],
            },
        ]

        clubs_by_code = {}
        for c_data in clubs_data:
            existing = db.query(Club).filter(Club.code == c_data["code"]).first()
            if not existing:
                club = Club(
                    name=c_data["name"],
                    code=c_data["code"],
                    description=c_data["description"],
                    institution=c_data["institution"],
                    created_by_id=c_data["created_by"].id,
                )
                db.add(club)
                db.flush()
                clubs_by_code[c_data["code"]] = club
                print(f"  ✓ Created club: {c_data['name']}")
            else:
                clubs_by_code[c_data["code"]] = existing
                print(f"  ℹ Club already exists: {c_data['name']}")

        # 3. Seed Club Memberships & Roles
        gdsc = clubs_by_code["gdsc-campus"]
        memberships_to_add = [
            (users_by_email["president@clubops.ai"], gdsc, ClubRole.PRESIDENT, "Executive Board"),
            (users_by_email["organizer@clubops.ai"], gdsc, ClubRole.CLUB_HEAD, "Club Head / Operations & Events"),
            (users_by_email["medialead@clubops.ai"], gdsc, ClubRole.VOLUNTEER, "Design & PR Squad"),
            (users_by_email["volunteer@clubops.ai"], gdsc, ClubRole.VOLUNTEER, "Logistics & Technical Desk"),
            (users_by_email["member@clubops.ai"], gdsc, ClubRole.MEMBER, "General Member"),
            # Cross-club memberships - Single President oversees all campus clubs
            (users_by_email["president@clubops.ai"], clubs_by_code["ras-campus"], ClubRole.PRESIDENT, "Executive Board"),
            (users_by_email["president@clubops.ai"], clubs_by_code["acm-campus"], ClubRole.PRESIDENT, "Executive Board"),
            (users_by_email["volunteer@clubops.ai"], clubs_by_code["ras-campus"], ClubRole.VOLUNTEER, "Hardware & Embedded Squad"),
        ]

        for user, club, role, dept in memberships_to_add:
            existing = (
                db.query(ClubMembership)
                .filter(ClubMembership.user_id == user.id, ClubMembership.club_id == club.id)
                .first()
            )
            if not existing:
                membership = ClubMembership(
                    user_id=user.id,
                    club_id=club.id,
                    role=role,
                    department=dept,
                )
                db.add(membership)
                print(f"  ✓ Linked {user.full_name} as {role.value} in {club.name} ({dept})")

        # 4. Seed Realistic Events
        events_to_seed = [
            {
                "club": gdsc,
                "created_by": users_by_email["president@clubops.ai"],
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
                        "assigned_to": "Alex President",
                    },
                    {
                        "id": "m2",
                        "title": "Faculty Advisor & Campus Venue Sanction",
                        "target_date": (datetime.utcnow() - timedelta(days=2)).strftime("%Y-%m-%d"),
                        "completed": True,
                        "assigned_to": "Priya Patel",
                    },
                    {
                        "id": "m3",
                        "title": "Sponsor Outreach & API Credits Contract",
                        "target_date": (datetime.utcnow() + timedelta(days=3)).strftime("%Y-%m-%d"),
                        "completed": False,
                        "assigned_to": "Aisha Verma",
                    },
                    {
                        "id": "m4",
                        "title": "Registrations Open & Team Formations",
                        "target_date": (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d"),
                        "completed": False,
                        "assigned_to": "Rahul Sharma",
                    },
                    {
                        "id": "m5",
                        "title": "Swag, Food Logistics & Volunteer Shift Briefing",
                        "target_date": (datetime.utcnow() + timedelta(days=16)).strftime("%Y-%m-%d"),
                        "completed": False,
                        "assigned_to": "Kabir Das",
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
                "created_by": users_by_email["organizer@clubops.ai"],
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
                        "assigned_to": "Priya Patel",
                    },
                    {
                        "id": "m2",
                        "title": "Docker & Kubernetes Lab Exercises Repo Prepared",
                        "target_date": (datetime.utcnow() + timedelta(days=14)).strftime("%Y-%m-%d"),
                        "completed": False,
                        "assigned_to": "Rahul Sharma",
                    },
                    {
                        "id": "m3",
                        "title": "Prerequisite Check & Attendance Cap (60 seats)",
                        "target_date": (datetime.utcnow() + timedelta(days=22)).strftime("%Y-%m-%d"),
                        "completed": False,
                        "assigned_to": "Sara Khan",
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
                "club": clubs_by_code["ras-campus"],
                "created_by": users_by_email["president@clubops.ai"],
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
                        "assigned_to": "Alex President",
                    },
                    {
                        "id": "m2",
                        "title": "Fire Marshall & Safety Hazard Inspection Clearance",
                        "target_date": (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d"),
                        "completed": False,
                        "assigned_to": "Alex President",
                    },
                    {
                        "id": "m3",
                        "title": "Team Weigh-in & Weapon Failsafe Inspection",
                        "target_date": (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d"),
                        "completed": False,
                        "assigned_to": "Rahul Sharma",
                    },
                ],
                "checklists": {
                    "sponsor_checklist": [
                        "Industrial Hardware tool supplier sponsor banners",
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

        for ev in events_to_seed:
            existing = db.query(Event).filter(Event.club_id == ev["club"].id, Event.slug == ev["slug"]).first()
            if not existing:
                event_obj = Event(
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
                db.add(event_obj)
                print(f"  ✓ Seeded event: {ev['title']} ({ev['status'].value})")
            else:
                existing.budget = ev["budget"]
                print(f"  ✓ Updated existing event budget to INR: {ev['title']} (₹{ev['budget']:,.0f})")

        db.flush()

        # 5. Seed Realistic Tasks with Strict Dependencies
        hackout_ev = db.query(Event).filter(Event.slug == "hackout-2026-national-ai").first()
        bootcamp_ev = db.query(Event).filter(Event.slug == "cloud-native-bootcamp").first()
        robowars_ev = db.query(Event).filter(Event.slug == "robowars-2026-combat-arena").first()

        # Create prerequisite tasks first
        tasks_data_stage_1 = [
            {
                "key": "t_sponsor_transfer",
                "club": gdsc,
                "event": hackout_ev,
                "creator": users_by_email["president@clubops.ai"],
                "assignee": users_by_email["organizer@clubops.ai"],
                "title": "Confirm Title Sponsor Deliverables & Bank Transfer",
                "description": "Receive signed contract and corporate funds transfer confirmation from title cloud sponsor.",
                "status": TaskStatus.DONE,
                "priority": TaskPriority.URGENT,
                "deadline": datetime.utcnow() + timedelta(days=2),
                "depends_on_key": None,
            },
            {
                "key": "t_badge_design",
                "club": gdsc,
                "event": hackout_ev,
                "creator": users_by_email["organizer@clubops.ai"],
                "assignee": users_by_email["medialead@clubops.ai"],
                "title": "Design Hackathon Attendee Badges and Lanyards",
                "description": "Prepare vector print-ready templates with sponsor logos, barcode spots, and participant categorizations.",
                "status": TaskStatus.DONE,
                "priority": TaskPriority.HIGH,
                "deadline": datetime.utcnow() + timedelta(days=4),
                "depends_on_key": None,
            },
            {
                "key": "t_procure_switches",
                "club": gdsc,
                "event": hackout_ev,
                "creator": users_by_email["president@clubops.ai"],
                "assignee": users_by_email["volunteer@clubops.ai"],
                "title": "Procure High-Speed Gigabit Switches & Lab Access Points",
                "description": "Acquire 8 24-port switches and industrial Wi-Fi access points from college IT department.",
                "status": TaskStatus.TODO,
                "priority": TaskPriority.URGENT,
                "deadline": datetime.utcnow() + timedelta(days=6),
                "depends_on_key": None,
            },
            {
                "key": "t_safety_inspect",
                "club": clubs_by_code["ras-campus"],
                "event": robowars_ev,
                "creator": users_by_email["president@clubops.ai"],
                "assignee": users_by_email["president@clubops.ai"],
                "title": "Inspect Combat Arena Polycarbonate Enclosure",
                "description": "Perform structural stability inspection and bullet-proof polycarbonate impact resistance testing.",
                "status": TaskStatus.TODO,
                "priority": TaskPriority.URGENT,
                "deadline": datetime.utcnow() + timedelta(days=3),
                "depends_on_key": None,
            },
        ]

        seeded_tasks_map = {}
        for t_data in tasks_data_stage_1:
            existing = db.query(Task).filter(Task.club_id == t_data["club"].id, Task.title == t_data["title"]).first()
            if not existing:
                task_obj = Task(
                    club_id=t_data["club"].id,
                    event_id=t_data["event"].id if t_data["event"] else None,
                    creator_id=t_data["creator"].id if t_data["creator"] else None,
                    assignee_id=t_data["assignee"].id if t_data["assignee"] else None,
                    title=t_data["title"],
                    description=t_data["description"],
                    status=t_data["status"],
                    priority=t_data["priority"],
                    deadline=t_data["deadline"],
                )
                db.add(task_obj)
                db.flush()
                seeded_tasks_map[t_data["key"]] = task_obj
                print(f"  ✓ Seeded task: {t_data['title']} ({t_data['status'].value})")
            else:
                seeded_tasks_map[t_data["key"]] = existing

        # Dependent tasks (Stage 2)
        tasks_data_stage_2 = [
            {
                "key": "t_print_badges",
                "club": gdsc,
                "event": hackout_ev,
                "creator": users_by_email["organizer@clubops.ai"],
                "assignee": users_by_email["volunteer@clubops.ai"],
                "title": "Print 400 Attendee Badges & Assemble Welcome Kits",
                "description": "Send badge print files to vendor and assemble lanyard tags with NFC tags.",
                "status": TaskStatus.IN_PROGRESS,
                "priority": TaskPriority.HIGH,
                "deadline": datetime.utcnow() + timedelta(days=12),
                "depends_on_key": "t_badge_design",  # Prereq is DONE -> Not blocked!
            },
            {
                "key": "t_av_stage_rigging",
                "club": gdsc,
                "event": hackout_ev,
                "creator": users_by_email["organizer@clubops.ai"],
                "assignee": users_by_email["volunteer@clubops.ai"],
                "title": "Convention Hall Main Stage AV Rigging & Network Deployment",
                "description": "Deploy network switches and wire up projector and live stage feed.",
                "status": TaskStatus.BLOCKED,
                "priority": TaskPriority.HIGH,
                "deadline": datetime.utcnow() + timedelta(days=14),
                "depends_on_key": "t_procure_switches",  # Prereq is TODO -> BLOCKED!
            },
            {
                "key": "t_publish_sponsor_logos",
                "club": gdsc,
                "event": hackout_ev,
                "creator": users_by_email["president@clubops.ai"],
                "assignee": users_by_email["medialead@clubops.ai"],
                "title": "Broadcast Sponsor Announcements on Instagram & LinkedIn",
                "description": "Feature premier sponsor deliverables across campus social media handles.",
                "status": TaskStatus.IN_PROGRESS,
                "priority": TaskPriority.MEDIUM,
                "deadline": datetime.utcnow() + timedelta(days=8),
                "depends_on_key": "t_sponsor_transfer",  # Prereq is DONE
            },
            {
                "key": "t_docker_scans",
                "club": gdsc,
                "event": bootcamp_ev,
                "creator": users_by_email["organizer@clubops.ai"],
                "assignee": users_by_email["volunteer@clubops.ai"],
                "title": "Docker Base Image Vulnerability Scans & Lab Repos",
                "description": "Pre-pull student sandbox container images onto all 60 lab workstations.",
                "status": TaskStatus.TODO,
                "priority": TaskPriority.HIGH,
                "deadline": datetime.utcnow() + timedelta(days=20),
                "depends_on_key": None,
            },
            {
                "key": "t_scales_calibration",
                "club": clubs_by_code["ras-campus"],
                "event": robowars_ev,
                "creator": users_by_email["president@clubops.ai"],
                "assignee": users_by_email["volunteer@clubops.ai"],
                "title": "Calibrate Digital Scales for 15kg & 30kg Bot Weigh-ins",
                "description": "Safety weigh-in calibration before teams are cleared to enter the combat arena.",
                "status": TaskStatus.BLOCKED,
                "priority": TaskPriority.MEDIUM,
                "deadline": datetime.utcnow() + timedelta(days=9),
                "depends_on_key": "t_safety_inspect",  # Prereq is TODO -> BLOCKED!
            },
        ]

        for t_data in tasks_data_stage_2:
            existing = db.query(Task).filter(Task.club_id == t_data["club"].id, Task.title == t_data["title"]).first()
            prereq_task = seeded_tasks_map.get(t_data.get("depends_on_key"))
            if not existing:
                task_obj = Task(
                    club_id=t_data["club"].id,
                    event_id=t_data["event"].id if t_data["event"] else None,
                    creator_id=t_data["creator"].id if t_data["creator"] else None,
                    assignee_id=t_data["assignee"].id if t_data["assignee"] else None,
                    title=t_data["title"],
                    description=t_data["description"],
                    status=t_data["status"],
                    priority=t_data["priority"],
                    deadline=t_data["deadline"],
                    depends_on_task_id=prereq_task.id if prereq_task else None,
                )
                db.add(task_obj)
                print(f"  ✓ Seeded dependent task: {t_data['title']} ({t_data['status'].value})")
            else:
                if prereq_task and not existing.depends_on_task_id:
                    existing.depends_on_task_id = prereq_task.id
                    print(f"  ✓ Linked dependency for existing task: {existing.title}")

        # 6. Seed Realistic Volunteer Profiles with Skills & Availability
        volunteers_seed_data = [
            {
                "club": gdsc,
                "user": users_by_email["volunteer@clubops.ai"],
                "skills": [
                    "Audio / Visual (AV)",
                    "Network & Wi-Fi Setup",
                    "Hardware & Robotics",
                    "Python / Backend",
                    "Registration Desk",
                    "Crowd Management",
                    "Food & Catering",
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
                "user": users_by_email["member@clubops.ai"],
                "skills": [
                    "Social Media & Live PR",
                    "Photography",
                    "Registration Desk",
                    "Graphic Design",
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
            {
                "club": gdsc,
                "user": users_by_email["medialead@clubops.ai"],
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
        ]

        for v_data in volunteers_seed_data:
            existing_vol = db.query(VolunteerProfile).filter(
                VolunteerProfile.club_id == v_data["club"].id,
                VolunteerProfile.user_id == v_data["user"].id,
            ).first()
            if not existing_vol:
                vol_obj = VolunteerProfile(
                    club_id=v_data["club"].id,
                    user_id=v_data["user"].id,
                    skills=v_data["skills"],
                    department=v_data["department"],
                    availability_status=v_data["availability_status"],
                    availability_notes=v_data["availability_notes"],
                    available_hours_per_week=v_data["available_hours_per_week"],
                    check_in_status=v_data["check_in_status"],
                    checked_in_at=v_data["checked_in_at"],
                    phone_number=v_data["phone_number"],
                    rating=v_data["rating"],
                )
                db.add(vol_obj)
                print(f"  ✓ Seeded volunteer profile: {v_data['user'].full_name} ({v_data['availability_status'].value})")
            else:
                existing_vol.skills = v_data["skills"]
                existing_vol.department = v_data["department"]
                existing_vol.availability_status = v_data["availability_status"]
                existing_vol.availability_notes = v_data["availability_notes"]
                existing_vol.phone_number = v_data["phone_number"]
                print(f"  ✓ Updated volunteer profile: {v_data['user'].full_name}")

        db.commit()

        print("✅ Demo data successfully seeded into PostgreSQL!")

    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding demo data: {str(e)}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_data()
