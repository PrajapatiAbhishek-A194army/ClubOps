# Automated Test for Club Head Uniqueness
from app.database.session import SessionLocal
from app.models.club import Club, ClubMembership, ClubRole, ClubStatus
from app.models.user import User
from app.schemas.club import MemberCreate, MemberUpdate
from app.services.member_service import MemberService
from app.utils.security import get_password_hash


def test_club_head_uniqueness_enforced():
    db = SessionLocal()
    import uuid
    uid = uuid.uuid4().hex[:6]
    try:
        # Create test club
        club = Club(
            name=f"Robotics AI Guild {uid}",
            code=f"robaiguild_{uid}",
            status=ClubStatus.ACTIVE,
        )
        db.add(club)
        db.flush()

        # Add Head 1
        m1 = MemberService.add_member(
            db=db,
            club_id=club.id,
            member_in=MemberCreate(
                email="firsthead@test.clubops",
                role=ClubRole.CLUB_HEAD,
                department="Leadership",
            ),
        )
        assert m1.role == ClubRole.CLUB_HEAD

        # Add Head 2 -> Must automatically demote Head 1 to VOLUNTEER
        m2 = MemberService.add_member(
            db=db,
            club_id=club.id,
            member_in=MemberCreate(
                email="secondhead@test.clubops",
                role=ClubRole.CLUB_HEAD,
                department="Leadership",
            ),
        )
        assert m2.role == ClubRole.CLUB_HEAD

        db.refresh(m1)
        assert m1.role == ClubRole.VOLUNTEER

        # Count active club heads in this club -> Must be exactly 1
        head_count = (
            db.query(ClubMembership)
            .filter(ClubMembership.club_id == club.id, ClubMembership.role == ClubRole.CLUB_HEAD)
            .count()
        )
        assert head_count == 1

    finally:
        db.rollback()
        db.close()
