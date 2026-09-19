from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.club import Club, ClubMembership, ClubRole
from app.schemas.club import ClubCreate, ClubUpdate


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

        # Creator automatically becomes Club President
        membership = ClubMembership(
            club_id=club.id,
            user_id=user_id,
            role=ClubRole.PRESIDENT,
            department="Executive Board",
        )
        db.add(membership)
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
