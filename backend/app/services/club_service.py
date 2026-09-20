from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.club import Club, ClubMembership, ClubRole
from app.models.user import User
from app.schemas.club import ClubCreate, ClubUpdate
from app.utils.security import get_password_hash


class ClubService:
    @staticmethod
    def get_club_by_id(db: Session, club_id: str) -> Optional[Club]:
        return db.query(Club).filter(Club.id == club_id).first()

    @staticmethod
    def get_club_by_code(db: Session, code: str) -> Optional[Club]:
        return db.query(Club).filter(Club.code == code.lower().strip()).first()

    @staticmethod
    def create_club(db: Session, user_id: str, club_in: ClubCreate) -> Club:
        existing = ClubService.get_club_by_code(db, club_in.code)
        if existing:
            raise ValueError(f"Club with code '{club_in.code}' already exists.")

        # College Principal / Single President Enforcement:
        # Check if there is an existing platform president
        creator = db.query(User).filter(User.id == user_id).first()
        platform_pres_membership = (
            db.query(ClubMembership)
            .filter(ClubMembership.role == ClubRole.PRESIDENT)
            .first()
        )
        if platform_pres_membership and platform_pres_membership.user_id != user_id:
            if not getattr(creator, "is_superuser", False) and getattr(creator, "email", "") != "president@clubops.ai":
                raise ValueError("Only the College Principal / President (Platform Admin) can create new clubs.")

        club = Club(
            name=club_in.name.strip(),
            code=club_in.code.lower().strip(),
            description=club_in.description,
            institution=club_in.institution,
            logo_url=club_in.logo_url,
            created_by_id=user_id,
        )
        db.add(club)
        db.flush()

        # Creator (President / Principal) automatically becomes Club President
        membership = ClubMembership(
            club_id=club.id,
            user_id=user_id,
            role=ClubRole.PRESIDENT,
            department="Executive Board",
        )
        db.add(membership)

        # Assign Club Head during club creation if specified
        head_user = None
        if club_in.club_head_user_id:
            head_user = db.query(User).filter(User.id == club_in.club_head_user_id).first()
            if not head_user:
                raise ValueError("Specified Club Head user ID does not exist.")
        elif club_in.club_head_email:
            email_clean = club_in.club_head_email.lower().strip()
            head_user = db.query(User).filter(User.email == email_clean).first()
            if not head_user:
                head_name = email_clean.split("@")[0].replace(".", " ").title()
                head_user = User(
                    email=email_clean,
                    full_name=head_name,
                    hashed_password=get_password_hash("ClubOps2026!"),
                )
                db.add(head_user)
                db.flush()

        if head_user:
            if head_user.id == user_id:
                raise ValueError("The President cannot be assigned as Club Head. A separate Club Head must be assigned.")

            # Enforce single-club head constraint across the platform
            head_in_other = (
                db.query(ClubMembership)
                .filter(
                    ClubMembership.user_id == head_user.id,
                    ClubMembership.role == ClubRole.CLUB_HEAD,
                    ClubMembership.club_id != club.id,
                )
                .first()
            )
            if head_in_other:
                other_club = db.query(Club).filter(Club.id == head_in_other.club_id).first()
                other_name = other_club.name if other_club else head_in_other.club_id
                raise ValueError(
                    f"User '{head_user.email}' is already the active Club Head of '{other_name}'. A user can only be the Club Head of one club."
                )

            head_membership = ClubMembership(
                club_id=club.id,
                user_id=head_user.id,
                role=ClubRole.CLUB_HEAD,
                department="Club Head / Operations",
            )
            db.add(head_membership)

        db.commit()
        db.refresh(club)
        return club

    @staticmethod
    def get_user_clubs(db: Session, user_id: str) -> List[dict]:
        memberships = (
            db.query(ClubMembership)
            .filter(ClubMembership.user_id == user_id)
            .all()
        )
        results = []
        for m in memberships:
            club = m.club
            if not club:
                continue
            results.append({
                "id": club.id,
                "name": club.name,
                "code": club.code,
                "description": club.description,
                "institution": club.institution,
                "logo_url": club.logo_url,
                "created_by_id": club.created_by_id,
                "created_at": club.created_at,
                "member_count": len(club.memberships) if club.memberships else 0,
                "user_role": m.role,
                "department": m.department,
            })
        return results

    @staticmethod
    def update_club(db: Session, club: Club, club_in: ClubUpdate) -> Club:
        for field, value in club_in.model_dump(exclude_unset=True).items():
            setattr(club, field, value)
        db.commit()
        db.refresh(club)
        return club
