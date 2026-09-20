from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.club import Club, ClubMembership, ClubRole
from app.models.user import User
from app.schemas.club import MemberCreate, MemberUpdate
from app.utils.security import get_password_hash


class MemberService:
    @staticmethod
    def get_membership(db: Session, club_id: str, user_id: str) -> Optional[ClubMembership]:
        return (
            db.query(ClubMembership)
            .filter(ClubMembership.club_id == club_id, ClubMembership.user_id == user_id)
            .first()
        )

    @staticmethod
    def get_membership_by_id(db: Session, membership_id: str) -> Optional[ClubMembership]:
        return db.query(ClubMembership).filter(ClubMembership.id == membership_id).first()

    @staticmethod
    def add_member(db: Session, club_id: str, member_in: MemberCreate) -> ClubMembership:
        email = member_in.email.lower().strip()
        user = db.query(User).filter(User.email == email).first()

        # If user doesn't exist yet, create account with temporary default credentials
        if not user:
            name = email.split("@")[0].replace(".", " ").title()
            user = User(
                email=email,
                full_name=name,
                hashed_password=get_password_hash("ClubOps2026!"),
            )
            db.add(user)
            db.flush()

        existing = MemberService.get_membership(db, club_id, user.id)
        if existing:
            raise ValueError(f"User '{email}' is already a member of this club.")

        # Single President Rule: President is the College Principal / Super Admin.
        # No other user or Club Head can be made President.
        if member_in.role == ClubRole.PRESIDENT:
            if not getattr(user, "is_superuser", False) and user.email != "president@clubops.ai":
                raise ValueError(
                    "A member or Club Head cannot be made President. There is only one President (College Principal) across the platform."
                )

        # Hard Rule 1: A user can be Club Head of at most ONE club across the platform.
        if member_in.role == ClubRole.CLUB_HEAD:
            head_in_other = (
                db.query(ClubMembership)
                .filter(
                    ClubMembership.user_id == user.id,
                    ClubMembership.role == ClubRole.CLUB_HEAD,
                    ClubMembership.club_id != club_id,
                )
                .first()
            )
            if head_in_other:
                other_club = db.query(Club).filter(Club.id == head_in_other.club_id).first()
                other_name = other_club.name if other_club else head_in_other.club_id
                raise ValueError(
                    f"User is already the active Club Head of '{other_name}'. A user can only be the Club Head of one club."
                )

            # Hard Rule 2: A club can have at most ONE active Club Head.
            existing_head = (
                db.query(ClubMembership)
                .filter(ClubMembership.club_id == club_id, ClubMembership.role == ClubRole.CLUB_HEAD)
                .first()
            )
            if existing_head:
                existing_head.role = ClubRole.VOLUNTEER

        membership = ClubMembership(
            club_id=club_id,
            user_id=user.id,
            role=member_in.role,
            department=member_in.department or "General",
        )
        db.add(membership)
        db.commit()
        db.refresh(membership)
        return membership

    @staticmethod
    def get_club_members(
        db: Session,
        club_id: str,
        role: Optional[ClubRole] = None,
        department: Optional[str] = None,
    ) -> List[dict]:
        query = (
            db.query(ClubMembership, User)
            .join(User, ClubMembership.user_id == User.id)
            .filter(ClubMembership.club_id == club_id)
        )
        if role:
            query = query.filter(ClubMembership.role == role)
        if department:
            query = query.filter(ClubMembership.department == department)

        records = query.all()
        results = []
        for membership, user in records:
            results.append({
                "membership_id": membership.id,
                "user_id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "avatar_url": user.avatar_url,
                "role": membership.role,
                "department": membership.department,
                "joined_at": membership.joined_at,
            })
        return results

    @staticmethod
    def update_member(db: Session, membership: ClubMembership, update_in: MemberUpdate) -> ClubMembership:
        if update_in.role is not None:
            # Single President Rule: Member or Club Head cannot be made President.
            if update_in.role == ClubRole.PRESIDENT:
                user = db.query(User).filter(User.id == membership.user_id).first()
                if not getattr(user, "is_superuser", False) and getattr(user, "email", "") != "president@clubops.ai":
                    raise ValueError(
                        "A member or Club Head cannot be made President. There is only one President (College Principal) across the platform."
                    )

            if update_in.role == ClubRole.CLUB_HEAD:
                # Hard Rule 1: A user can be Club Head of at most ONE club across the platform.
                head_in_other = (
                    db.query(ClubMembership)
                    .filter(
                        ClubMembership.user_id == membership.user_id,
                        ClubMembership.role == ClubRole.CLUB_HEAD,
                        ClubMembership.club_id != membership.club_id,
                    )
                    .first()
                )
                if head_in_other:
                    other_club = db.query(Club).filter(Club.id == head_in_other.club_id).first()
                    other_name = other_club.name if other_club else head_in_other.club_id
                    raise ValueError(
                        f"User is already the active Club Head of '{other_name}'. A user can only be the Club Head of one club."
                    )

                # Hard Rule 2: A club can have at most ONE active Club Head.
                if membership.role != ClubRole.CLUB_HEAD:
                    existing_head = (
                        db.query(ClubMembership)
                        .filter(
                            ClubMembership.club_id == membership.club_id,
                            ClubMembership.role == ClubRole.CLUB_HEAD,
                            ClubMembership.id != membership.id,
                        )
                        .first()
                    )
                    if existing_head:
                        existing_head.role = ClubRole.VOLUNTEER

            membership.role = update_in.role
        if update_in.department is not None:
            membership.department = update_in.department
        db.commit()
        db.refresh(membership)
        return membership

    @staticmethod
    def remove_member(db: Session, membership: ClubMembership) -> None:
        db.delete(membership)
        db.commit()
