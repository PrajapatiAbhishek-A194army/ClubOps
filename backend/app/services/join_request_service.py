from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.club import Club, ClubMembership, ClubRole, MembershipStatus
from app.models.join_request import JoinRequest, JoinRequestStatus
from app.models.notification import Notification, NotificationType
from app.models.user import User
from app.schemas.join_request import JoinRequestResponse
from app.services.email_service import EmailService


class JoinRequestService:
    @staticmethod
    def create_request(
        db: Session,
        club_id: str,
        user_id: str,
        message: Optional[str] = None,
    ) -> JoinRequestResponse:
        club = db.query(Club).filter(Club.id == club_id).first()
        if not club:
            raise ValueError("Club not found")

        # Check existing membership
        existing_member = (
            db.query(ClubMembership)
            .filter(ClubMembership.club_id == club_id, ClubMembership.user_id == user_id)
            .first()
        )
        if existing_member and existing_member.status == MembershipStatus.ACTIVE:
            raise ValueError("You are already an active member of this club")

        # Check pending request
        pending = (
            db.query(JoinRequest)
            .filter(
                JoinRequest.club_id == club_id,
                JoinRequest.user_id == user_id,
                JoinRequest.status == JoinRequestStatus.PENDING,
            )
            .first()
        )
        if pending:
            raise ValueError("You already have a pending join request for this club")

        req = JoinRequest(
            club_id=club_id,
            user_id=user_id,
            message=message,
            status=JoinRequestStatus.PENDING,
        )
        db.add(req)
        db.commit()
        db.refresh(req)

        user = db.query(User).filter(User.id == user_id).first()
        return JoinRequestResponse(
            id=req.id,
            club_id=req.club_id,
            user_id=req.user_id,
            user_name=user.full_name if user else None,
            user_email=user.email if user else None,
            user_phone=user.phone_number if user else None,
            user_avatar=user.avatar_url if user else None,
            status=req.status,
            message=req.message,
            requested_at=req.requested_at,
        )

    @staticmethod
    def review_request(
        db: Session,
        request_id: str,
        reviewer_id: str,
        new_status: JoinRequestStatus,
    ) -> JoinRequestResponse:
        req = db.query(JoinRequest).filter(JoinRequest.id == request_id).first()
        if not req:
            raise ValueError("Join request not found")

        if req.status != JoinRequestStatus.PENDING:
            raise ValueError(f"Cannot review request already in '{req.status.value}' state")

        req.status = new_status
        req.reviewed_at = datetime.utcnow()
        req.reviewed_by_id = reviewer_id

        club = db.query(Club).filter(Club.id == req.club_id).first()
        club_name = club.name if club else "Club"
        user = db.query(User).filter(User.id == req.user_id).first()

        # If approved, transactionally activate or create ClubMembership as VOLUNTEER
        if new_status == JoinRequestStatus.APPROVED:
            existing_m = (
                db.query(ClubMembership)
                .filter(ClubMembership.club_id == req.club_id, ClubMembership.user_id == req.user_id)
                .first()
            )
            if existing_m:
                existing_m.role = ClubRole.VOLUNTEER
                existing_m.status = MembershipStatus.ACTIVE
            else:
                membership = ClubMembership(
                    club_id=req.club_id,
                    user_id=req.user_id,
                    role=ClubRole.VOLUNTEER,
                    status=MembershipStatus.ACTIVE,
                    department="General Volunteer",
                )
                db.add(membership)

            # In-app notification to volunteer
            notif = Notification(
                user_id=req.user_id,
                title=f"Application Approved: Welcome to {club_name}!",
                message=f"Congratulations! Your volunteer application to join {club_name} has been approved. You now have active volunteer access.",
                type=NotificationType.SYSTEM,
                link_url="/app/dashboard",
            )
            db.add(notif)

            # Transactional email via Brevo
            if user and user.email:
                html = EmailService.build_notification_html(
                    title=f"Welcome to {club_name}!",
                    message=(
                        f"Hello {user.full_name},<br><br>"
                        f"Congratulations! Your volunteer application to join <strong>{club_name}</strong> has been approved by the club leadership.<br><br>"
                        f"You are now registered as an active Volunteer. You can log in to your ClubOps dashboard, access upcoming club events, and accept task shifts."
                    ),
                    badge_text="Application Approved",
                    badge_color="#059669",
                    action_url="http://localhost:5173/login",
                    action_label="Log In to ClubOps",
                )
                EmailService.send_email(
                    to_email=user.email,
                    to_name=user.full_name,
                    subject=f"Welcome to {club_name} - Volunteer Application Approved!",
                    html_content=html,
                )

        elif new_status == JoinRequestStatus.REJECTED:
            # In-app notification
            notif = Notification(
                user_id=req.user_id,
                title=f"Application Update: {club_name}",
                message=f"Your volunteer application to join {club_name} was not approved for this operational cycle.",
                type=NotificationType.SYSTEM,
                link_url="/",
            )
            db.add(notif)

            # Transactional email via Brevo
            if user and user.email:
                html = EmailService.build_notification_html(
                    title=f"Application Status: {club_name}",
                    message=(
                        f"Hello {user.full_name},<br><br>"
                        f"Thank you for your interest in joining <strong>{club_name}</strong>.<br><br>"
                        f"After review, the club leadership was unable to approve your application for the current operational cycle."
                    ),
                    badge_text="Application Reviewed",
                    badge_color="#6b7280",
                    action_url="http://localhost:5173",
                    action_label="Explore Other Clubs",
                )
                EmailService.send_email(
                    to_email=user.email,
                    to_name=user.full_name,
                    subject=f"Update regarding your application to {club_name}",
                    html_content=html,
                )

        db.commit()
        db.refresh(req)

        return JoinRequestResponse(
            id=req.id,
            club_id=req.club_id,
            user_id=req.user_id,
            user_name=user.full_name if user else None,
            user_email=user.email if user else None,
            user_phone=user.phone_number if user else None,
            user_avatar=user.avatar_url if user else None,
            status=req.status,
            message=req.message,
            requested_at=req.requested_at,
            reviewed_at=req.reviewed_at,
            reviewed_by_id=req.reviewed_by_id,
        )

    @staticmethod
    def get_club_requests(
        db: Session,
        club_id: str,
        status: Optional[JoinRequestStatus] = None,
    ) -> List[JoinRequestResponse]:
        query = db.query(JoinRequest).filter(JoinRequest.club_id == club_id)
        if status:
            query = query.filter(JoinRequest.status == status)

        records = query.order_by(JoinRequest.requested_at.desc()).all()
        results = []
        for r in records:
            user = db.query(User).filter(User.id == r.user_id).first()
            results.append(
                JoinRequestResponse(
                    id=r.id,
                    club_id=r.club_id,
                    user_id=r.user_id,
                    user_name=user.full_name if user else None,
                    user_email=user.email if user else None,
                    user_phone=user.phone_number if user else None,
                    user_avatar=user.avatar_url if user else None,
                    status=r.status,
                    message=r.message,
                    requested_at=r.requested_at,
                    reviewed_at=r.reviewed_at,
                    reviewed_by_id=r.reviewed_by_id,
                )
            )
        return results
