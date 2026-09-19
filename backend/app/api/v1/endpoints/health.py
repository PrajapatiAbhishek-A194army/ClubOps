from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.config.settings import settings
from app.database.session import get_db
from app.schemas.common import ApiResponse, HealthResponse

router = APIRouter()


@router.get("/health", response_model=ApiResponse[HealthResponse])
def check_health(db: Session = Depends(get_db)):
    """Health check endpoint checking API and database connectivity."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    health_info = HealthResponse(
        status="healthy" if "unhealthy" not in db_status else "degraded",
        version="1.0.0",
        environment=settings.ENVIRONMENT,
        database=db_status,
    )
    return ApiResponse(
        success="unhealthy" not in db_status,
        data=health_info,
        message="ClubOps AI backend service operational",
    )
