from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_club_role
from app.models.club import ClubMembership, ClubRole
from app.models.event import Event
from app.models.risk import Risk
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.risk import RiskResolveRequest, RiskResponse
from app.services.risk_service import RiskService

router = APIRouter()

LEADERSHIP_ROLES = [
    ClubRole.PRESIDENT,
    ClubRole.CLUB_HEAD,
    getattr(ClubRole, "ORGANIZER", ClubRole.CLUB_HEAD),
]


def _verify_leadership(user: User, club_id: str, db: Session):
    if user.is_superuser or getattr(user, "role", None) == ClubRole.PRESIDENT:
        return
    membership = (
        db.query(ClubMembership)
        .filter(ClubMembership.club_id == club_id, ClubMembership.user_id == user.id)
        .first()
    )
    if not membership or membership.role not in LEADERSHIP_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: only Club Heads and Presidents can access Risk & Deadlines Radar.",
        )


@router.get("", response_model=ApiResponse[List[RiskResponse]])
def get_risks(
    event_id: Optional[str] = Query(None, description="Target event ID (optional)"),
    club_id: Optional[str] = Query(None, description="Target club ID (optional)"),
    status: Optional[str] = Query(None, description="Filter by risk status (e.g. OPEN, RESOLVED)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves all detected risks and anomalies for an event or club. Restricted to Club Head and President."""
    target_club_id = club_id
    if not target_club_id and event_id:
        ev = db.query(Event).filter(Event.id == event_id).first()
        if ev:
            target_club_id = ev.club_id

    if target_club_id:
        _verify_leadership(current_user, target_club_id, db)

    risks = RiskService.get_event_risks(db=db, event_id=event_id, club_id=club_id, status=status)
    return ApiResponse(
        success=True,
        data=[RiskResponse.model_validate(r) for r in risks],
        message="Event risks retrieved",
    )


@router.post("/scan", response_model=ApiResponse[List[RiskResponse]])
def scan_event_risks(
    event_id: str = Query(..., description="Target event ID to scan"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Executes deterministic risk radar analysis. Restricted to Club Head and President.
    - Scans overdue tasks
    - Scans blocked critical path dependencies
    - Scans volunteer understaffing and skill shortages
    - Automatically emits real-time notifications for critical and high risks
    """
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    _verify_leadership(current_user, ev.club_id, db)

    try:
        risks = RiskService.run_deterministic_risk_scan(db=db, event_id=event_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    return ApiResponse(
        success=True,
        data=[RiskResponse.model_validate(r) for r in risks],
        message=f"Risk radar completed: {len(risks)} active risks monitored",
    )


@router.patch("/{risk_id}/resolve", response_model=ApiResponse[RiskResponse])
def resolve_risk(
    risk_id: str,
    resolve_req: RiskResolveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Marks a risk as resolved or mitigated. Restricted to Club Head and President."""
    risk_obj = db.query(Risk).filter(Risk.id == risk_id).first()
    if not risk_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risk record not found")

    _verify_leadership(current_user, risk_obj.club_id, db)

    risk = RiskService.resolve_risk(db=db, risk_id=risk_id)
    return ApiResponse(
        success=True,
        data=RiskResponse.model_validate(risk),
        message="Risk resolved successfully",
    )

