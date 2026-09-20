from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_club_role
from app.models.club import Club, ClubRole
from app.models.user import User
from app.schemas.audit import (
    AuditLogEntry,
    ChainIntegrityReport,
    GovernanceMatrixResponse,
    SecuritySummaryResponse,
)
from app.schemas.common import ApiResponse
from app.services.audit_service import AuditService

router = APIRouter()

LEADERSHIP_ROLES = [
    ClubRole.PRESIDENT,
    ClubRole.CLUB_HEAD,
    getattr(ClubRole, "ORGANIZER", ClubRole.CLUB_HEAD),
]


@router.get("/clubs/{club_id}/audit", response_model=ApiResponse[dict])
def get_audit_logs(
    club_id: str,
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    result: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(LEADERSHIP_ROLES)),
    db: Session = Depends(get_db),
):
    """
    Returns filterable, paginated cryptographic audit logs for the club.
    Restricted to Club Head and President.
    """
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    entries, total = AuditService.query_logs(
        club_id=club_id,
        action=action,
        entity_type=entity_type,
        result=result,
        source=source,
        search=search,
        limit=limit,
        offset=offset,
        db=db,
    )

    return ApiResponse(
        data={
            "entries": [e.model_dump(mode="json") for e in entries],
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    )


@router.get("/clubs/{club_id}/audit/verify-integrity", response_model=ApiResponse[ChainIntegrityReport])
def verify_audit_integrity(
    club_id: str,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(LEADERSHIP_ROLES)),
    db: Session = Depends(get_db),
):
    """
    Cryptographically validates every SHA-256 hash in the club's audit chain
    from genesis to the latest record, detecting any unauthorized tampering.
    Restricted to Club Head and President.
    """
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    report = AuditService.verify_chain_integrity(club_id, db)
    return ApiResponse(data=report)


@router.get("/clubs/{club_id}/audit/summary", response_model=ApiResponse[SecuritySummaryResponse])
def get_security_summary(
    club_id: str,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(LEADERSHIP_ROLES)),
    db: Session = Depends(get_db),
):
    """
    Returns security telemetry overview including total events, denied attempts,
    and live integrity status. Restricted to Club Head and President.
    """
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    summary = AuditService.get_security_summary(club_id, db)
    return ApiResponse(data=summary)


@router.get("/clubs/{club_id}/audit/governance", response_model=ApiResponse[GovernanceMatrixResponse])
def get_governance_matrix(
    club_id: str,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(LEADERSHIP_ROLES)),
    db: Session = Depends(get_db),
):
    """
    Returns the student organization separation of duties permissions matrix.
    Restricted to Club Head and President.
    """
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    matrix = AuditService.get_governance_matrix(club_id)
    return ApiResponse(data=matrix)


@router.get("/clubs/{club_id}/audit/export")
def export_audit_csv(
    club_id: str,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role([ClubRole.PRESIDENT, ClubRole.CLUB_HEAD])),
    db: Session = Depends(get_db),
):
    """
    Exports full tamper-evident audit log as CSV for institutional deans and faculty advisors.
    Restricted to Club President / Club Head.
    """
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    csv_data = AuditService.export_audit_csv(club_id, db)
    filename = f"clubops_audit_chain_{club.code or club_id[:8]}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
