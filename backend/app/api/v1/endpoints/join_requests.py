from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_club_role
from app.models.club import ClubRole
from app.models.join_request import JoinRequestStatus
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.join_request import (
    JoinRequestCreate,
    JoinRequestResponse,
    JoinRequestReview,
)
from app.services.join_request_service import JoinRequestService

router = APIRouter()

LEADERSHIP_ROLES = [ClubRole.PRESIDENT, ClubRole.CLUB_HEAD, getattr(ClubRole, "ORGANIZER", ClubRole.CLUB_HEAD)]


@router.post("/clubs/{club_id}/join-requests", response_model=ApiResponse[JoinRequestResponse], status_code=status.HTTP_201_CREATED)
def submit_join_request(
    club_id: str,
    req_in: JoinRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submits a volunteer application to join a club."""
    try:
        req = JoinRequestService.create_request(
            db=db,
            club_id=club_id,
            user_id=current_user.id,
            message=req_in.message,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return ApiResponse(
        success=True,
        data=req,
        message="Join request submitted to Club Head for review",
    )


@router.get("/clubs/{club_id}/join-requests", response_model=ApiResponse[List[JoinRequestResponse]])
def list_join_requests(
    club_id: str,
    status: Optional[JoinRequestStatus] = Query(None, description="Filter by status (PENDING, APPROVED, REJECTED)"),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(LEADERSHIP_ROLES)),
    db: Session = Depends(get_db),
):
    """Lists join requests for club leadership to review."""
    requests = JoinRequestService.get_club_requests(db=db, club_id=club_id, status=status)
    return ApiResponse(
        success=True,
        data=requests,
        message="Join requests retrieved",
    )


@router.patch("/clubs/{club_id}/join-requests/{request_id}", response_model=ApiResponse[JoinRequestResponse])
def review_join_request(
    club_id: str,
    request_id: str,
    review_in: JoinRequestReview,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(LEADERSHIP_ROLES)),
    db: Session = Depends(get_db),
):
    """Approves or rejects a volunteer join request (restricted to Club Head or President)."""
    try:
        updated = JoinRequestService.review_request(
            db=db,
            request_id=request_id,
            reviewer_id=current_user.id,
            new_status=review_in.status,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return ApiResponse(
        success=True,
        data=updated,
        message=f"Join request {updated.status.value}",
    )
