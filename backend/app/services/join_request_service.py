from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.club import Club, ClubMembership, ClubRole, MembershipStatus
from app.models.join_request import JoinRequest, JoinRequestStatus
from app.models.user import User
from app.schemas.join_request import JoinRequestResponse


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
        if existing_member:
            raise ValueError("You are already a member of this club")

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

        # If approved, transactionally create active ClubMembership
        if new_status == JoinRequestStatus.APPROVED:
            membership = ClubMembership(
                club_id=req.club_id,
                user_id=req.user_id,
                role=ClubRole.VOLUNTEER,
                status=MembershipStatus.ACTIVE,
                department="General Volunteer",
            )
            db.add(membership)

        db.commit()
        db.refresh(req)

        user = db.query(User).filter(User.id == req.user_id).first()
        return JoinRequestResponse(
            id=req.id,
            club_id=req.club_id,
            user_id=req.user_id,
            user_name=user.full_name if user else None,
            user_email=user.email if user else None,
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
                    status=r.status,
                    message=r.message,
                    requested_at=r.requested_at,
                    reviewed_at=r.reviewed_at,
                    reviewed_by_id=r.reviewed_by_id,
                )
            )
        return results
