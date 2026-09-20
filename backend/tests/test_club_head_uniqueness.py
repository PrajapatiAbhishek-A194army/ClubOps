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


def test_club_head_cannot_be_made_president():
    import pytest
    db = SessionLocal()
    import uuid
    uid = uuid.uuid4().hex[:6]
    try:
        club = Club(name=f"Club Pres Test {uid}", code=f"club_pres_{uid}", status=ClubStatus.ACTIVE)
        db.add(club)
        db.flush()

        head_email = f"head_nopres_{uid}@test.clubops"
        m = MemberService.add_member(
            db=db,
            club_id=club.id,
            member_in=MemberCreate(
                email=head_email,
                role=ClubRole.CLUB_HEAD,
                department="Leadership",
            ),
        )
        assert m.role == ClubRole.CLUB_HEAD

        # Attempt to make Club Head into a President -> Must fail with ValueError
        with pytest.raises(ValueError) as excinfo:
            MemberService.update_member(
                db=db,
                membership=m,
                update_in=MemberUpdate(role=ClubRole.PRESIDENT),
            )
        assert "cannot be made President" in str(excinfo.value)

    finally:
        db.rollback()
        db.close()


def test_president_assigns_club_head_during_creation():
    from app.services.club_service import ClubService
    from app.schemas.club import ClubCreate
    db = SessionLocal()
    import uuid
    uid = uuid.uuid4().hex[:6]
    try:
        pres_user = db.query(User).filter(User.email == "president@clubops.ai").first()
        if not pres_user:
            pres_user = User(
                email="president@clubops.ai",
                full_name="Alex President",
                hashed_password="hash",
                is_superuser=True,
            )
            db.add(pres_user)
            db.flush()

        head_email = f"newclubhead_{uid}@test.clubops"
        new_club = ClubService.create_club(
            db=db,
            user_id=pres_user.id,
            club_in=ClubCreate(
                name=f"CyberSec Guild {uid}",
                code=f"cybersec_{uid}",
                description="Ethical hacking and defense club",
                club_head_email=head_email,
            ),
        )
        assert new_club.id is not None

        # Verify memberships: President is President, specified email is Club Head
        pres_m = (
            db.query(ClubMembership)
            .filter(ClubMembership.club_id == new_club.id, ClubMembership.user_id == pres_user.id)
            .first()
        )
        assert pres_m is not None
        assert pres_m.role == ClubRole.PRESIDENT

        head_user = db.query(User).filter(User.email == head_email).first()
        assert head_user is not None

        head_m = (
            db.query(ClubMembership)
            .filter(ClubMembership.club_id == new_club.id, ClubMembership.user_id == head_user.id)
            .first()
        )
        assert head_m is not None
        assert head_m.role == ClubRole.CLUB_HEAD

    finally:
        db.rollback()
        db.close()


