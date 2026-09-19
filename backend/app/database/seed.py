import sys
from pathlib import Path

# Add backend to sys.path
sys.path.append(str(Path(__file__).resolve().parents[2]))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


from app.database.session import SessionLocal
from app.models.club import Club, ClubMembership, ClubRole
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
