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
                email=f"firsthead_{uid}@test.clubops",
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
                email=f"secondhead_{uid}@test.clubops",
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


def test_user_cannot_be_head_of_multiple_clubs():
    import pytest
    db = SessionLocal()
    import uuid
    uid = uuid.uuid4().hex[:6]
    try:
        club_a = Club(name=f"Club A {uid}", code=f"club_a_{uid}", status=ClubStatus.ACTIVE)
        club_b = Club(name=f"Club B {uid}", code=f"club_b_{uid}", status=ClubStatus.ACTIVE)
        db.add(club_a)
        db.add(club_b)
        db.flush()

        head_email = f"singlehead_{uid}@test.clubops"

        # Appoint user as Club Head in Club A -> Success
        m_a = MemberService.add_member(
            db=db,
            club_id=club_a.id,
            member_in=MemberCreate(
                email=head_email,
                role=ClubRole.CLUB_HEAD,
                department="Leadership",
            ),
        )
        assert m_a.role == ClubRole.CLUB_HEAD

        # Attempt to appoint the same user as Club Head in Club B -> Must fail with ValueError
        with pytest.raises(ValueError) as excinfo:
            MemberService.add_member(
                db=db,
                club_id=club_b.id,
                member_in=MemberCreate(
                    email=head_email,
                    role=ClubRole.CLUB_HEAD,
                    department="Leadership",
                ),
            )
        assert "already the active Club Head" in str(excinfo.value)

    finally:
        db.rollback()
        db.close()

