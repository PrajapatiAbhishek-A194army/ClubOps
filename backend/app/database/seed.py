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
from app.models.user import User
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
                "email": "techlead@clubops.ai",
                "full_name": "Rahul Sharma",
                "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul",
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
                "created_by": users_by_email["organizer@clubops.ai"],
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
            (users_by_email["organizer@clubops.ai"], gdsc, ClubRole.ORGANIZER, "Operations & Events"),
            (users_by_email["techlead@clubops.ai"], gdsc, ClubRole.TEAM_LEAD, "Technical Committee"),
            (users_by_email["medialead@clubops.ai"], gdsc, ClubRole.TEAM_LEAD, "Design & PR"),
            (users_by_email["volunteer@clubops.ai"], gdsc, ClubRole.VOLUNTEER, "Logistics & Desk"),
            (users_by_email["member@clubops.ai"], gdsc, ClubRole.MEMBER, "General Member"),
            # Cross-club memberships
            (users_by_email["president@clubops.ai"], clubs_by_code["ras-campus"], ClubRole.PRESIDENT, "Executive Board"),
            (users_by_email["techlead@clubops.ai"], clubs_by_code["ras-campus"], ClubRole.TEAM_LEAD, "Hardware & Embedded"),
            (users_by_email["organizer@clubops.ai"], clubs_by_code["acm-campus"], ClubRole.PRESIDENT, "Executive Board"),
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
