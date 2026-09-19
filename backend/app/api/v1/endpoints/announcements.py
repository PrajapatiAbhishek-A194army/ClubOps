from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_club_role
from app.models.club import ClubRole
from app.models.event import Event
from app.models.user import User
from app.schemas.announcement import (
    AIGenerateAnnouncementRequest,
    AIGenerateAnnouncementResponse,
    AnnouncementCreate,
    AnnouncementPublishRequest,
    AnnouncementResponse,
    AnnouncementUpdate,
)
from app.schemas.common import ApiResponse
from app.services.announcement_service import AnnouncementService

router = APIRouter()

PUBLISH_ROLES = [ClubRole.PRESIDENT, ClubRole.CLUB_HEAD]
CREATOR_ROLES = [
    ClubRole.PRESIDENT,
    ClubRole.CLUB_HEAD,
    getattr(ClubRole, "ORGANIZER", ClubRole.CLUB_HEAD),
    getattr(ClubRole, "TEAM_LEAD", ClubRole.VOLUNTEER),
]
ALL_ROLES = [
    ClubRole.PRESIDENT,
    ClubRole.CLUB_HEAD,
    ClubRole.VOLUNTEER,
    ClubRole.MEMBER,
    getattr(ClubRole, "ORGANIZER", ClubRole.CLUB_HEAD),
    getattr(ClubRole, "TEAM_LEAD", ClubRole.VOLUNTEER),
]


def _serialize_announcement(ann, db: Session) -> AnnouncementResponse:
    event_title = None
    if ann.event_id:
        ev = db.query(Event).filter(Event.id == ann.event_id).first()
        if ev:
            event_title = ev.title

    creator_name = None
    if ann.created_by_id:
        u = db.query(User).filter(User.id == ann.created_by_id).first()
        if u:
            creator_name = u.full_name

    return AnnouncementResponse(
        id=ann.id,
        club_id=ann.club_id,
        event_id=ann.event_id,
        event_title=event_title,
        title=ann.title,
        content=ann.content,
        created_by_id=ann.created_by_id,
        creator_name=creator_name,
        created_source=ann.created_source.value if hasattr(ann.created_source, "value") else str(ann.created_source),
        status=ann.status.value if hasattr(ann.status, "value") else str(ann.status),
        category=ann.category or "GENERAL",
        target_channel=ann.target_channel or "EMAIL",
        email_broadcast_sent=ann.email_broadcast_sent or False,
        email_sent_count=ann.email_sent_count or 0,
        created_at=ann.created_at,
        published_at=ann.published_at,
    )


@router.get("/clubs/{club_id}/announcements", response_model=ApiResponse[List[AnnouncementResponse]])
def list_announcements(
    club_id: str,
    status: Optional[str] = Query(None, description="Filter by status (DRAFT, PUBLISHED)"),
    category: Optional[str] = Query(None, description="Filter by category"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(ALL_ROLES)),
    db: Session = Depends(get_db),
):
    """Lists all announcements for a club."""
    announcements = AnnouncementService.get_club_announcements(
        db=db,
        club_id=club_id,
        status=status,
        category=category,
        skip=skip,
        limit=limit,
    )
    return ApiResponse(
        success=True,
        data=[_serialize_announcement(a, db) for a in announcements],
        message="Club announcements retrieved",
    )


@router.post("/clubs/{club_id}/announcements/generate-ai", response_model=ApiResponse[AIGenerateAnnouncementResponse])
def generate_ai_announcement(
    club_id: str,
    gen_req: AIGenerateAnnouncementRequest,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(CREATOR_ROLES)),
    db: Session = Depends(get_db),
):
    """
    Generates an engaging, category-specific announcement draft using Groq LLM
    with tailored formatting and deterministic fallback.
    """
    ai_draft = AnnouncementService.generate_ai_announcement(
        db=db,
        club_id=club_id,
        req=gen_req,
    )
    return ApiResponse(
        success=True,
        data=ai_draft,
        message="AI announcement draft generated successfully",
    )


@router.post("/clubs/{club_id}/announcements", response_model=ApiResponse[AnnouncementResponse], status_code=status.HTTP_201_CREATED)
def create_announcement(
    club_id: str,
    ann_in: AnnouncementCreate,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(CREATOR_ROLES)),
    db: Session = Depends(get_db),
):
    """Creates a new announcement draft or published notice."""
    ann = AnnouncementService.create_announcement(
        db=db,
        club_id=club_id,
        creator_id=current_user.id,
        ann_in=ann_in,
    )
    return ApiResponse(
        success=True,
        data=_serialize_announcement(ann, db),
        message="Announcement created successfully",
    )


@router.get("/clubs/{club_id}/announcements/{announcement_id}", response_model=ApiResponse[AnnouncementResponse])
def get_announcement(
    club_id: str,
    announcement_id: str,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(ALL_ROLES)),
    db: Session = Depends(get_db),
):
    """Retrieves single announcement details."""
    ann = AnnouncementService.get_announcement_by_id(db=db, club_id=club_id, announcement_id=announcement_id)
    if not ann:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found in this club")
    return ApiResponse(
        success=True,
        data=_serialize_announcement(ann, db),
    )


@router.put("/clubs/{club_id}/announcements/{announcement_id}", response_model=ApiResponse[AnnouncementResponse])
def update_announcement(
    club_id: str,
    announcement_id: str,
    ann_update: AnnouncementUpdate,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(CREATOR_ROLES)),
    db: Session = Depends(get_db),
):
    """Updates an existing announcement."""
    ann = AnnouncementService.get_announcement_by_id(db=db, club_id=club_id, announcement_id=announcement_id)
    if not ann:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found in this club")

    updated = AnnouncementService.update_announcement(db=db, announcement=ann, ann_update=ann_update)
    return ApiResponse(
        success=True,
        data=_serialize_announcement(updated, db),
        message="Announcement updated successfully",
    )


@router.post("/clubs/{club_id}/announcements/{announcement_id}/publish", response_model=ApiResponse[AnnouncementResponse])
def publish_announcement(
    club_id: str,
    announcement_id: str,
    publish_req: AnnouncementPublishRequest,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(PUBLISH_ROLES)),
    db: Session = Depends(get_db),
):
    """
    Publishes an announcement, dispatches in-app notifications to all club members,
    and optionally executes a multi-channel email broadcast via Brevo transactional API.
    (Restricted to Club President and Club Head).
    """
    try:
        published = AnnouncementService.publish_announcement(
            db=db,
            club_id=club_id,
            announcement_id=announcement_id,
            publisher=current_user,
            broadcast_email=publish_req.broadcast_email,
            dispatch_in_app=publish_req.dispatch_in_app,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return ApiResponse(
        success=True,
        data=_serialize_announcement(published, db),
        message=f"Announcement published! {published.email_sent_count} emails broadcasted via Brevo.",
    )


@router.delete("/clubs/{club_id}/announcements/{announcement_id}", response_model=ApiResponse[dict])
def delete_announcement(
    club_id: str,
    announcement_id: str,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(PUBLISH_ROLES)),
    db: Session = Depends(get_db),
):
    """Deletes an announcement (Restricted to President and Club Head)."""
    ann = AnnouncementService.get_announcement_by_id(db=db, club_id=club_id, announcement_id=announcement_id)
    if not ann:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found in this club")

    AnnouncementService.delete_announcement(db=db, announcement=ann)
    return ApiResponse(
        success=True,
        data={"deleted_announcement_id": announcement_id},
        message="Announcement deleted successfully",
    )
