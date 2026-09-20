"""
add_demo_volunteers.py - Run from E:\ClubOps\backend
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app.database.session import SessionLocal
from app.models.club import Club, ClubMembership, ClubRole
from app.models.user import User
from app.models.volunteer import VolunteerProfile, AvailabilityStatus
from app.utils.security import get_password_hash

db = SessionLocal()

clubs = db.query(Club).all()
print("Available clubs:")
for c in clubs:
    print(f"  {c.id}  |  {c.name}  |  {c.code}")

target_club = None
for c in clubs:
    n = c.name.lower(); co = (c.code or "").lower()
    if "code" in n or "coder" in n or "code" in co:
        target_club = c
        break
if not target_club and clubs:
    target_club = clubs[0]
if not target_club:
    print("No club found"); db.close(); sys.exit(1)

print(f"\nTarget club: {target_club.name} (id={target_club.id})")

pwd = get_password_hash("Volunteer2026!")
vols = [
    {"email":"vol.arjun@clubops.ai","full_name":"Arjun Sharma","avatar_url":"https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun","skills":["Python","Backend Development","API Design","FastAPI"],"department":"Backend Team","phone":"+91-9001234567"},
    {"email":"vol.meera@clubops.ai","full_name":"Meera Nair","avatar_url":"https://api.dicebear.com/7.x/avataaars/svg?seed=Meera","skills":["UI/UX Design","Figma","Frontend Development","React"],"department":"Design & Frontend","phone":"+91-9001234568"},
    {"email":"vol.rahul@clubops.ai","full_name":"Rahul Gupta","avatar_url":"https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul","skills":["Machine Learning","Data Science","Python","TensorFlow"],"department":"AI / ML Team","phone":"+91-9001234569"},
    {"email":"vol.sneha@clubops.ai","full_name":"Sneha Reddy","avatar_url":"https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha","skills":["Event Management","Marketing","Social Media","Canva"],"department":"Events & Outreach","phone":"+91-9001234570"},
    {"email":"vol.karan@clubops.ai","full_name":"Karan Mehta","avatar_url":"https://api.dicebear.com/7.x/avataaars/svg?seed=Karan","skills":["DevOps","Cloud Computing","Docker","AWS"],"department":"Infrastructure","phone":"+91-9001234571"},
    {"email":"vol.prachi@clubops.ai","full_name":"Prachi Singh","avatar_url":"https://api.dicebear.com/7.x/avataaars/svg?seed=Prachi","skills":["Content Writing","Documentation","Research","Communication"],"department":"Knowledge & Docs","phone":"+91-9001234572"},
]

for vd in vols:
    user = db.query(User).filter(User.email == vd["email"]).first()
    if not user:
        user = User(email=vd["email"],full_name=vd["full_name"],hashed_password=pwd,avatar_url=vd["avatar_url"],is_superuser=False,is_active=True)
        db.add(user); db.flush()
        print(f"  Created user: {vd['full_name']}")
    else:
        print(f"  Exists: {vd['full_name']}")

    mem = db.query(ClubMembership).filter(ClubMembership.user_id==user.id,ClubMembership.club_id==target_club.id).first()
    if not mem:
        db.add(ClubMembership(user_id=user.id,club_id=target_club.id,role=ClubRole.VOLUNTEER,department=vd["department"]))
        db.flush(); print(f"    -> Membership added")

    prof = db.query(VolunteerProfile).filter(VolunteerProfile.user_id==user.id,VolunteerProfile.club_id==target_club.id).first()
    if not prof:
        db.add(VolunteerProfile(user_id=user.id,club_id=target_club.id,skills=vd["skills"],department=vd["department"],availability_status=AvailabilityStatus.AVAILABLE,available_hours_per_week=15,phone_number=vd["phone"],rating=4.8))
        db.flush(); print(f"    -> Profile + skills added: {vd['skills']}")

db.commit(); db.close()
print("\nDone! Password for all volunteers: Volunteer2026!")
for vd in vols: print(f"  {vd['email']}  |  {vd['full_name']}")
