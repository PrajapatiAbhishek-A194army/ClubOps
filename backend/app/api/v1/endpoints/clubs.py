from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.deps import get_current_user, get_db, require_club_role
from app.models.club import ClubRole
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
from app.services.member_service import MemberService

router = APIRouter()


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
    """Lists all clubs where the authenticated user holds a membership."""
    clubs_data = ClubService.get_user_clubs(db, current_user.id)
    return ApiResponse(
        success=True,
        data=[ClubWithRoleResponse(**c) for c in clubs_data],
        message="User clubs retrieved",
    )


@router.get("/clubs/{club_id}", response_model=ApiResponse[ClubResponse])
def get_club(
    club_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves club details and metrics."""
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
    )


@router.post("/clubs/{club_id}/members", response_model=ApiResponse[MemberResponse])
def add_club_member(
    club_id: str,
    member_in: MemberCreate,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role([ClubRole.PRESIDENT, ClubRole.CLUB_HEAD, ClubRole.ORGANIZER])),
    db: Session = Depends(get_db),
):
    """Adds a new member or invites a student to the club."""
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
        message=f"Added '{member_in.email}' as {member_in.role.value}",
    )


@router.get("/clubs/{club_id}/members", response_model=ApiResponse[List[MemberResponse]])
def get_club_members(
    club_id: str,
    role: Optional[ClubRole] = Query(None),
    department: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists all members of a club with optional filtering by role and committee."""
    # Ensure user has access to view members
    members = MemberService.get_club_members(db, club_id, role=role, department=department)
    return ApiResponse(
        success=True,
        data=[MemberResponse(**m) for m in members],
        message="Club roster retrieved",
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
