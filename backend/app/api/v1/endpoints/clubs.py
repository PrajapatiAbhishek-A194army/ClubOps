from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.deps import get_current_user, get_db, require_club_role
from app.models.club import Club, ClubMembership, ClubRole, MembershipStatus
from app.models.notification import Notification, NotificationType
from app.models.user import User
from app.schemas.club import (
    ClubCreate,
    ClubResponse,
    ClubUpdate,
    ClubWithRoleResponse,
    MemberCreate,
    MemberResponse,
    MemberUpdate,
)
from app.schemas.common import ApiResponse
from app.services.club_service import ClubService
from app.services.email_service import EmailService
from app.services.member_service import MemberService

router = APIRouter()


@router.get("/clubs/public", response_model=ApiResponse[List[ClubResponse]])
def list_public_clubs(db: Session = Depends(get_db)):
    """Lists active campus clubs for volunteer application."""
    clubs = db.query(Club).all()
    return ApiResponse(
        success=True,
        data=[
            ClubResponse(
                id=c.id,
                name=c.name,
                code=c.code,
                description=c.description,
                institution=c.institution,
                logo_url=c.logo_url,
                created_by_id=c.created_by_id,
                created_at=c.created_at,
                member_count=len(c.memberships),
            )
            for c in clubs
        ],
        message="Public clubs retrieved",
    )


@router.post("/clubs", response_model=ApiResponse[ClubResponse])
def create_club(
    club_in: ClubCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Creates a new student organization club. Creator automatically becomes President."""
    try:
        club = ClubService.create_club(db, current_user.id, club_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return ApiResponse(
        success=True,
        data=ClubResponse(
            id=club.id,
            name=club.name,
            code=club.code,
            description=club.description,
            institution=club.institution,
            logo_url=club.logo_url,
            created_by_id=club.created_by_id,
            created_at=club.created_at,
            member_count=1,
        ),
        message=f"Club '{club.name}' created successfully",
    )


@router.get("/clubs", response_model=ApiResponse[List[ClubWithRoleResponse]])
def list_user_clubs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists all clubs where the authenticated user is an active member or president."""
    clubs = ClubService.get_user_clubs(db, current_user.id)
    return ApiResponse(
        success=True,
        data=[
            ClubWithRoleResponse(
                id=c["id"],
                name=c["name"],
                code=c["code"],
                description=c["description"],
                institution=c["institution"],
                logo_url=c["logo_url"],
                created_by_id=c["created_by_id"],
                created_at=c["created_at"],
                member_count=c["member_count"],
                user_role=c["user_role"],
                department=c.get("department"),
            )
            for c in clubs
        ],
        message="User clubs retrieved",
    )


@router.get("/clubs/{club_id}", response_model=ApiResponse[ClubResponse])
def get_club(
    club_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves club details by ID."""
    club = ClubService.get_club_by_id(db, club_id)
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    return ApiResponse(
        success=True,
        data=ClubResponse(
            id=club.id,
            name=club.name,
            code=club.code,
            description=club.description,
            institution=club.institution,
            logo_url=club.logo_url,
            created_by_id=club.created_by_id,
            created_at=club.created_at,
            member_count=len(club.memberships),
        ),
        message="Club details retrieved",
    )


@router.put("/clubs/{club_id}", response_model=ApiResponse[ClubResponse])
def update_club(
    club_id: str,
    club_in: ClubUpdate,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role([ClubRole.PRESIDENT, ClubRole.CLUB_HEAD])),
    db: Session = Depends(get_db),
):
    """Updates club metadata (President or Club Head)."""
    target = ClubService.get_club_by_id(db, club_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    updated = ClubService.update_club(db, target, club_in)
    return ApiResponse(
        success=True,
        data=ClubResponse(
            id=updated.id,
            name=updated.name,
            code=updated.code,
            description=updated.description,
            institution=updated.institution,
            logo_url=updated.logo_url,
            created_by_id=updated.created_by_id,
            created_at=updated.created_at,
            member_count=len(updated.memberships),
        ),
        message="Club profile updated",
    )


@router.get("/clubs/{club_id}/members", response_model=ApiResponse[List[MemberResponse]])
def get_club_members(
    club_id: str,
    role: Optional[ClubRole] = Query(None),
    department: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role([ClubRole.PRESIDENT, ClubRole.CLUB_HEAD, ClubRole.ORGANIZER, ClubRole.TEAM_LEAD, ClubRole.VOLUNTEER, ClubRole.MEMBER])),
    db: Session = Depends(get_db),
):
    """Lists all members of the specified club."""
    members = MemberService.get_club_members(db, club_id, role, department)
    return ApiResponse(
        success=True,
        data=[MemberResponse(**m) for m in members],
        message="Club members retrieved",
    )


@router.post("/clubs/{club_id}/members", response_model=ApiResponse[MemberResponse], status_code=status.HTTP_201_CREATED)
def add_club_member(
    club_id: str,
    member_in: MemberCreate,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role([ClubRole.PRESIDENT, ClubRole.CLUB_HEAD])),
    db: Session = Depends(get_db),
):
    """Adds a new member directly to the club."""
    try:
        new_membership = MemberService.add_member(db, club_id, member_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return ApiResponse(
        success=True,
        data=MemberResponse(
            membership_id=new_membership.id,
            user_id=new_membership.user.id,
            email=new_membership.user.email,
            full_name=new_membership.user.full_name,
            avatar_url=new_membership.user.avatar_url,
            role=new_membership.role,
            department=new_membership.department,
            joined_at=new_membership.joined_at,
        ),
        message=f"Added '{new_membership.user.full_name}' to club roster",
    )


@router.put("/clubs/{club_id}/members/{membership_id}", response_model=ApiResponse[MemberResponse])
def update_member_role(
    club_id: str,
    membership_id: str,
    update_in: MemberUpdate,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role([ClubRole.PRESIDENT])),
    db: Session = Depends(get_db),
):
    """Updates a club member's role or department (President only)."""
    target = MemberService.get_membership_by_id(db, membership_id)
    if not target or target.club_id != club_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership record not found")

    updated = MemberService.update_member(db, target, update_in)
    return ApiResponse(
        success=True,
        data=MemberResponse(
            membership_id=updated.id,
            user_id=updated.user.id,
            email=updated.user.email,
            full_name=updated.user.full_name,
            avatar_url=updated.user.avatar_url,
            role=updated.role,
            department=updated.department,
            joined_at=updated.joined_at,
        ),
        message="Member role updated",
    )


@router.post("/clubs/{club_id}/assign-club-head", response_model=ApiResponse[MemberResponse])
def assign_club_head(
    club_id: str,
    payload: dict,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role([ClubRole.PRESIDENT])),
    db: Session = Depends(get_db),
):
    """
    Appoints or changes the Club Head for a club (President only).
    Enforces the domain rule: Single Active Club Head per club.
    """
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="user_id is required")

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    # Enforce: A user can only be the Club Head of ONE club across the platform
    other_club_headship = (
        db.query(ClubMembership)
        .filter(
            ClubMembership.user_id == target_user.id,
            ClubMembership.club_id != club_id,
            ClubMembership.role == ClubRole.CLUB_HEAD,
            ClubMembership.status == MembershipStatus.ACTIVE,
        )
        .first()
    )
    if other_club_headship:
        other_club = db.query(Club).filter(Club.id == other_club_headship.club_id).first()
        other_club_name = other_club.name if other_club else "another club"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User {target_user.full_name} is already the active Club Head of '{other_club_name}'. A user can only be the Club Head of one club.",
        )

    # Demote existing Club Head in this club to VOLUNTEER
    existing_head = (
        db.query(ClubMembership)
        .filter(
            ClubMembership.club_id == club_id,
            ClubMembership.role == ClubRole.CLUB_HEAD,
            ClubMembership.user_id != target_user.id,
        )
        .first()
    )
    if existing_head:
        existing_head.role = ClubRole.VOLUNTEER

    # Find or create membership for target user
    target_membership = (
        db.query(ClubMembership)
        .filter(ClubMembership.club_id == club_id, ClubMembership.user_id == target_user.id)
        .first()
    )
    if not target_membership:
        target_membership = ClubMembership(
            club_id=club_id,
            user_id=target_user.id,
            role=ClubRole.CLUB_HEAD,
            department="Executive Leadership",
        )
        db.add(target_membership)
    else:
        target_membership.role = ClubRole.CLUB_HEAD
        target_membership.department = "Executive Leadership"

    db.commit()
    db.refresh(target_membership)

    # Dispatch in-app notification & Brevo email to the appointed Club Head
    notif = Notification(
        user_id=target_user.id,
        title=f"⭐ Appointed Club Head: {club.name}",
        message=f"{current_user.full_name} (President) has appointed you as the official Club Head of {club.name}. You now have operational authority over events, tasks, and volunteer approvals.",
        type=NotificationType.SYSTEM,
        link_url="/app/settings",
    )
    db.add(notif)
    db.commit()

    if target_user.email:
        html = EmailService.build_notification_html(
            title=f"Appointed Club Head of {club.name}",
            message=(
                f"Congratulations {target_user.full_name},<br><br>"
                f"<strong>{current_user.full_name}</strong> (President) has designated you as the official <strong>Club Head</strong> of <strong>{club.name}</strong>.<br><br>"
                f"You have executive control over event logistics, task allocations, and volunteer approvals."
            ),
            badge_text="Executive Appointment",
            badge_color="#7c3aed",
            action_url="http://localhost:5173/app",
            action_label="Access Club Leadership",
        )
        EmailService.send_email(
            to_email=target_user.email,
            to_name=target_user.full_name,
            subject=f"ClubOps Appointment: You are now Club Head of {club.name}",
            html_content=html,
        )

    return ApiResponse(
        success=True,
        data=MemberResponse(
            membership_id=target_membership.id,
            user_id=target_user.id,
            email=target_user.email,
            full_name=target_user.full_name,
            avatar_url=target_user.avatar_url,
            role=target_membership.role,
            department=target_membership.department,
            joined_at=target_membership.joined_at,
        ),
        message=f"'{target_user.full_name}' is now the active Club Head of {club.name}",
    )


@router.delete("/clubs/{club_id}/members/{membership_id}", response_model=ApiResponse[bool])
def remove_club_member(
    club_id: str,
    membership_id: str,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role([ClubRole.PRESIDENT])),
    db: Session = Depends(get_db),
):
    """Removes a member from the club (President only)."""
    target = MemberService.get_membership_by_id(db, membership_id)
    if not target or target.club_id != club_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership record not found")

    if target.user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="President cannot remove themselves")

    MemberService.remove_member(db, target)
    return ApiResponse(
        success=True,
        data=True,
        message="Member removed from club roster",
    )
