from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_club_role
from app.models.club import ClubRole
from app.models.user import User
from app.models.volunteer import AvailabilityStatus, CheckInStatus
from app.schemas.common import ApiResponse
from app.schemas.task import TaskResponse
from app.schemas.volunteer import (
    AIVolunteerMatchRequest,
    AIVolunteerMatchResponse,
    VolunteerAssignRequest,
    VolunteerAvailabilityUpdate,
    VolunteerCheckInUpdate,
    VolunteerCreate,
    VolunteerResponse,
    VolunteerUpdate,
)
from app.services.task_service import enrich_task_response
from app.services.volunteer_service import VolunteerService

router = APIRouter()


@router.get("/clubs/{club_id}/volunteers", response_model=ApiResponse[List[VolunteerResponse]])
def list_volunteers(
    club_id: str,
    availability: Optional[AvailabilityStatus] = Query(None, description="Filter by availability status"),
    skill: Optional[str] = Query(None, description="Filter by skill tag (e.g. AV, Python, Registration)"),
    search: Optional[str] = Query(None, description="Search by name, email, department, or skill"),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role([ClubRole.PRESIDENT, ClubRole.ORGANIZER, ClubRole.TEAM_LEAD, ClubRole.VOLUNTEER, ClubRole.MEMBER])),
    db: Session = Depends(get_db),
):
    """Lists all volunteers in the club with skills, availability, and active task workloads."""
    volunteers = VolunteerService.get_club_volunteers(
        db=db,
        club_id=club_id,
        availability=availability,
        skill=skill,
        search=search,
    )
    return ApiResponse(
        success=True,
        data=volunteers,
        message=f"Retrieved {len(volunteers)} volunteer profiles",
    )


@router.get("/clubs/{club_id}/volunteers/{volunteer_id}", response_model=ApiResponse[VolunteerResponse])
def get_volunteer_details(
    club_id: str,
    volunteer_id: str,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role([ClubRole.PRESIDENT, ClubRole.ORGANIZER, ClubRole.TEAM_LEAD, ClubRole.VOLUNTEER, ClubRole.MEMBER])),
    db: Session = Depends(get_db),
):
    """Retrieves full volunteer profile including assigned tasks and check-in history."""
    volunteer = VolunteerService.get_volunteer_by_id(db, volunteer_id)
    if not volunteer or volunteer.club_id != club_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Volunteer profile not found in this club",
        )
    return ApiResponse(success=True, data=volunteer, message="Volunteer profile retrieved")


@router.post("/clubs/{club_id}/volunteers", response_model=ApiResponse[VolunteerResponse])
def create_volunteer_profile(
    club_id: str,
    payload: VolunteerCreate,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role([ClubRole.PRESIDENT, ClubRole.ORGANIZER, ClubRole.TEAM_LEAD])),
    db: Session = Depends(get_db),
):
    """Creates or updates a volunteer's profile and initial skill mapping."""
    volunteer = VolunteerService.create_or_update_profile(db, club_id, payload)
    return ApiResponse(
        success=True,
        data=volunteer,
        message=f"Volunteer profile saved for {volunteer.full_name}",
    )


@router.put("/clubs/{club_id}/volunteers/{volunteer_id}", response_model=ApiResponse[VolunteerResponse])
def update_volunteer_profile(
    club_id: str,
    volunteer_id: str,
    payload: VolunteerUpdate,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role([ClubRole.PRESIDENT, ClubRole.ORGANIZER, ClubRole.TEAM_LEAD, ClubRole.VOLUNTEER])),
    db: Session = Depends(get_db),
):
    """Updates volunteer profile details, skills, department, and weekly capacity."""
    profile_entity = VolunteerService.get_volunteer_profile_entity(db, volunteer_id)
    if not profile_entity or profile_entity.club_id != club_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Volunteer profile not found")

    # If role is VOLUNTEER, verify they are only updating their own profile
    if membership.role == ClubRole.VOLUNTEER and profile_entity.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot edit another volunteer's profile")

    updated = VolunteerService.update_profile(db, profile_entity, payload)
    return ApiResponse(success=True, data=updated, message="Volunteer profile updated successfully")


@router.patch("/clubs/{club_id}/volunteers/{volunteer_id}/availability", response_model=ApiResponse[VolunteerResponse])
def update_availability(
    club_id: str,
    volunteer_id: str,
    payload: VolunteerAvailabilityUpdate,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role([ClubRole.PRESIDENT, ClubRole.ORGANIZER, ClubRole.TEAM_LEAD, ClubRole.VOLUNTEER])),
    db: Session = Depends(get_db),
):
    """Fast-toggle availability status (AVAILABLE, BUSY, ON_SHIFT, UNAVAILABLE)."""
    profile_entity = VolunteerService.get_volunteer_profile_entity(db, volunteer_id)
    if not profile_entity or profile_entity.club_id != club_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Volunteer profile not found")

    if membership.role == ClubRole.VOLUNTEER and profile_entity.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot edit another volunteer's availability")

    updated = VolunteerService.update_availability(db, profile_entity, payload)
    return ApiResponse(
        success=True,
        data=updated,
        message=f"Availability updated to {payload.availability_status.value}",
    )


@router.patch("/clubs/{club_id}/volunteers/{volunteer_id}/check-in", response_model=ApiResponse[VolunteerResponse])
def toggle_check_in(
    club_id: str,
    volunteer_id: str,
    payload: VolunteerCheckInUpdate,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role([ClubRole.PRESIDENT, ClubRole.ORGANIZER, ClubRole.TEAM_LEAD, ClubRole.VOLUNTEER])),
    db: Session = Depends(get_db),
):
    """Check in or check out a volunteer on-site for event attendance."""
    profile_entity = VolunteerService.get_volunteer_profile_entity(db, volunteer_id)
    if not profile_entity or profile_entity.club_id != club_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Volunteer profile not found")

    updated = VolunteerService.toggle_check_in(db, profile_entity, payload)
    status_label = "Checked In" if payload.check_in_status == CheckInStatus.CHECKED_IN else "Checked Out"
    return ApiResponse(
        success=True,
        data=updated,
        message=f"Volunteer marked as {status_label}",
    )


@router.post("/clubs/{club_id}/volunteers/ai-match", response_model=ApiResponse[AIVolunteerMatchResponse])
def match_volunteers_with_ai(
    club_id: str,
    req: AIVolunteerMatchRequest,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role([ClubRole.PRESIDENT, ClubRole.ORGANIZER, ClubRole.TEAM_LEAD])),
    db: Session = Depends(get_db),
):
    """AI recommendations for assigning the best volunteer to a task based on skills and workload."""
    recommendations = VolunteerService.recommend_volunteers_with_ai(db, club_id, req)
    return ApiResponse(
        success=True,
        data=recommendations,
        message="AI volunteer matchmaking analysis completed",
    )


@router.post("/clubs/{club_id}/volunteers/assign", response_model=ApiResponse[TaskResponse])
def assign_volunteer(
    club_id: str,
    payload: VolunteerAssignRequest,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role([ClubRole.PRESIDENT, ClubRole.ORGANIZER, ClubRole.TEAM_LEAD])),
    db: Session = Depends(get_db),
):
    """Assigns an AI-recommended or selected volunteer directly to a task."""
    try:
        updated_task = VolunteerService.assign_volunteer_to_task(
            db=db,
            club_id=club_id,
            task_id=payload.task_id,
            volunteer_user_id=payload.volunteer_user_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return ApiResponse(
        success=True,
        data=enrich_task_response(updated_task),
        message=f"Task assigned to volunteer successfully",
    )
