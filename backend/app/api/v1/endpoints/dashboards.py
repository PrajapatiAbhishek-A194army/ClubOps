from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_club_role
from app.models.club import Club, ClubRole
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.dashboard import (
    OrganizerDashboardData,
    PresidentDashboardData,
    UnifiedDashboardResponse,
    VolunteerCheckInRequest,
    VolunteerDashboardData,
)
from app.services.dashboard_service import DashboardService

router = APIRouter()

ALL_ROLES = [
    ClubRole.PRESIDENT,
    ClubRole.CLUB_HEAD,
    ClubRole.VOLUNTEER,
    ClubRole.MEMBER,
]


@router.get("/clubs/{club_id}/dashboard", response_model=ApiResponse[UnifiedDashboardResponse])
def get_club_dashboard(
    club_id: str,
    perspective: Optional[str] = Query("PRESIDENT", description="PRESIDENT, CLUB_HEAD, VOLUNTEER"),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(ALL_ROLES)),
    db: Session = Depends(get_db),
):
    """
    Returns unified role-based dashboard metrics for President, Club Head,
    or Volunteer in a single fast network round-trip.
    """
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    role_key = (perspective or "PRESIDENT").upper()

    data_payload = {}
    if role_key == "PRESIDENT":
        pres_data = DashboardService.get_president_metrics(db=db, club_id=club_id)
        data_payload = pres_data.model_dump()
    elif role_key in ["CLUB_HEAD", "ORGANIZER"]:
        head_data = DashboardService.get_club_head_metrics(db=db, club_id=club_id)
        data_payload = head_data.model_dump()
    else:
        vol_data = DashboardService.get_volunteer_metrics(db=db, club_id=club_id, user_id=current_user.id)
        data_payload = vol_data.model_dump()

    return ApiResponse(
        success=True,
        data=UnifiedDashboardResponse(
            perspective=role_key,
            club_id=club_id,
            club_name=club.name,
            data=data_payload,
        ),
        message=f"{role_key} dashboard metrics retrieved",
    )


@router.post("/clubs/{club_id}/dashboard/check-in", response_model=ApiResponse[dict])
def volunteer_check_in(
    club_id: str,
    payload: VolunteerCheckInRequest,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(ALL_ROLES)),
    db: Session = Depends(get_db),
):
    """
    Toggles volunteer event shift check-in status (CHECKED_IN / CHECKED_OUT).
    """
    new_status = DashboardService.volunteer_check_in(
        db=db,
        club_id=club_id,
        user_id=current_user.id,
        status_str=payload.status,
    )
    return ApiResponse(
        success=True,
        data={"user_id": current_user.id, "check_in_status": new_status},
        message=f"Status updated to {new_status}",
    )
