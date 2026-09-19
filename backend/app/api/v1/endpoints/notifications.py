from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.notification import (
    AIBriefingRequest,
    NotificationResponse,
    NotificationUnreadCount,
    TestEmailRequest,
)
from app.services.email_service import EmailService
from app.services.notification_service import NotificationService

router = APIRouter()


@router.get("", response_model=ApiResponse[List[NotificationResponse]])
def get_my_notifications(
    unread_only: bool = Query(False, description="Filter only unread alerts"),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetches in-app notifications for the authenticated user."""
    notifications = NotificationService.get_user_notifications(
        db=db,
        user_id=current_user.id,
        unread_only=unread_only,
        limit=limit,
    )
    return ApiResponse(
        success=True,
        data=[NotificationResponse.model_validate(n) for n in notifications],
        message="Notifications retrieved",
    )


@router.get("/unread-count", response_model=ApiResponse[NotificationUnreadCount])
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns active unread notification count for the badge."""
    count = NotificationService.get_unread_count(db=db, user_id=current_user.id)
    return ApiResponse(
        success=True,
        data=NotificationUnreadCount(unread_count=count),
    )


@router.patch("/{notification_id}/read", response_model=ApiResponse[NotificationResponse])
def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Marks a single notification as read."""
    notif = NotificationService.mark_as_read(
        db=db,
        notification_id=notification_id,
        user_id=current_user.id,
    )
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    return ApiResponse(
        success=True,
        data=NotificationResponse.model_validate(notif),
        message="Notification marked as read",
    )


@router.post("/read-all", response_model=ApiResponse[dict])
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Marks all notifications as read for current user."""
    count = NotificationService.mark_all_as_read(db=db, user_id=current_user.id)
    return ApiResponse(
        success=True,
        data={"marked_read": count},
        message=f"{count} notifications marked as read",
    )


@router.post("/send-test-email", response_model=ApiResponse[dict])
def send_test_email(
    payload: TestEmailRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Sends a test notification email via Brevo transactional email API.
    """
    target_email = payload.recipient_email or current_user.email
    target_name = current_user.full_name or "ClubOps User"

    html = EmailService.build_notification_html(
        title=payload.subject or "ClubOps Notification Test",
        message=payload.message or "This is a test notification from your ClubOps platform.",
        badge_text="Email Delivery Test",
        badge_color="#059669",
        action_url="http://localhost:5173/app",
        action_label="Open ClubOps Portal",
    )

    result = EmailService.send_email(
        to_email=target_email,
        to_name=target_name,
        subject=payload.subject or "ClubOps Notification Test",
        html_content=html,
    )

    return ApiResponse(
        success=result.get("success", False),
        data=result,
        message="Test email dispatch processed",
    )


@router.post("/trigger-ai-briefing", response_model=ApiResponse[dict])
def trigger_ai_briefing(
    payload: AIBriefingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generates and broadcasts an AI Operations briefing notification & email
    to club leadership and active members.
    """
    count = NotificationService.dispatch_ai_briefing(
        db=db,
        club_id=payload.club_id,
        title=payload.title,
        message=payload.message,
        link_url=payload.link_url,
    )
    return ApiResponse(
        success=True,
        data={"notifications_dispatched": count},
        message=f"AI briefing dispatched to {count} club members",
    )
