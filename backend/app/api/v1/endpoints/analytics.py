from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_club_role
from app.models.club import Club, ClubRole
from app.models.user import User
from app.schemas.analytics import AIExecutiveSummary, FullAnalyticsReportResponse
from app.schemas.common import ApiResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter()

ALL_ROLES = [
    ClubRole.PRESIDENT,
    ClubRole.CLUB_HEAD,
    ClubRole.VOLUNTEER,
    ClubRole.MEMBER,
    getattr(ClubRole, "ORGANIZER", ClubRole.CLUB_HEAD),
]


@router.get("/clubs/{club_id}/analytics/overview", response_model=ApiResponse[FullAnalyticsReportResponse])
def get_analytics_overview(
    club_id: str,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(ALL_ROLES)),
    db: Session = Depends(get_db),
):
    """
    Returns unified operations analytics report, health score breakdown,
    Recharts time-series data, and AI executive recommendations.
    """
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    report = AnalyticsService.get_full_overview(club_id, db)
    return ApiResponse(data=report)


@router.get("/clubs/{club_id}/analytics/ai-insights", response_model=ApiResponse[AIExecutiveSummary])
def get_ai_insights(
    club_id: str,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(ALL_ROLES)),
    db: Session = Depends(get_db),
):
    """
    Generates on-demand AI executive operational assessment powered by Groq LLM.
    """
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    overview = AnalyticsService.get_full_overview(club_id, db)
    return ApiResponse(data=overview.ai_insights)


@router.get("/clubs/{club_id}/analytics/export")
def export_analytics_csv(
    club_id: str,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(ALL_ROLES)),
    db: Session = Depends(get_db),
):
    """
    Generates and exports comprehensive institutional compliance report as CSV.
    """
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    csv_data = AnalyticsService.generate_csv_report(club_id, db)
    filename = f"clubops_{club.code or club_id[:8]}_operations_report.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
