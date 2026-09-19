from datetime import timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.config.settings import settings
from app.models.user import User
from app.models.club import Club, ClubMembership, ClubRole, MembershipStatus
from app.models.join_request import JoinRequest, JoinRequestStatus
from app.models.notification import Notification, NotificationType
from app.schemas.auth import UserProfileUpdate, UserRegisterRequest
from app.services.email_service import EmailService
from app.utils.security import create_access_token, get_password_hash, verify_password


class AuthService:
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email.lower().strip()).first()

    @staticmethod
    def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        user = AuthService.get_user_by_email(db, email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    @staticmethod
    def register_user(db: Session, req: UserRegisterRequest) -> Tuple[User, Optional[Club], Optional[JoinRequest]]:
        existing = AuthService.get_user_by_email(db, req.email)
        if existing:
            raise ValueError(f"User with email '{req.email}' already exists.")

        user = User(
            email=req.email.lower().strip(),
            hashed_password=get_password_hash(req.password),
            full_name=req.full_name.strip(),
            phone_number=req.phone_number.strip() if req.phone_number else None,
        )
        db.add(user)
        db.flush()

        club = None
        join_req = None

        # 1. Target Club Application (Volunteer flow)
        if req.target_club_id:
            club = db.query(Club).filter(Club.id == req.target_club_id).first()
            if club:
                join_msg = req.message or f"Volunteer application from {user.full_name}"
                if req.skills:
                    join_msg += f" (Skills: {req.skills})"

                join_req = JoinRequest(
                    club_id=club.id,
                    user_id=user.id,
                    status=JoinRequestStatus.PENDING,
                    message=join_msg,
                )
                db.add(join_req)
                db.flush()

                # Notify Club Head and President
                leadership = (
                    db.query(ClubMembership)
                    .filter(
                        ClubMembership.club_id == club.id,
                        ClubMembership.status == MembershipStatus.ACTIVE,
                        ClubMembership.role.in_([ClubRole.CLUB_HEAD, ClubRole.PRESIDENT]),
                    )
                    .all()
                )

                for lead in leadership:
                    notif = Notification(
                        user_id=lead.user_id,
                        title=f"🤝 New Volunteer Application: {user.full_name}",
                        message=f"{user.full_name} has registered and applied to volunteer for {club.name}. Review application in Membership portal.",
                        type=NotificationType.SYSTEM,
                        link_url="/app/members",
                    )
                    db.add(notif)

                    lead_user = db.query(User).filter(User.id == lead.user_id).first()
                    if lead_user and lead_user.email:
                        html = EmailService.build_notification_html(
                            title=f"New Volunteer Application: {user.full_name}",
                            message=(
                                f"Hello {lead_user.full_name},<br><br>"
                                f"<strong>{user.full_name}</strong> ({user.email}) has signed up and requested to volunteer for <strong>{club.name}</strong>.<br><br>"
                                f"&bull; <strong>Phone:</strong> {user.phone_number or 'Not provided'}<br>"
                                f"&bull; <strong>Skills:</strong> {req.skills or 'General'}<br><br>"
                                f"Please review and approve their membership in your ClubOps dashboard."
                            ),
                            badge_text="Volunteer Application",
                            badge_color="#059669",
                            action_url="http://localhost:5173/app/members",
                            action_label="Review Application",
                        )
                        EmailService.send_email(
                            to_email=lead_user.email,
                            to_name=lead_user.full_name,
                            subject=f"New Volunteer Application for {club.name}: {user.full_name}",
                            html_content=html,
                        )

        # 2. Direct Club Creation (President setup fallback)
        elif req.club_name:
            code = req.club_code or req.club_name.lower().replace(" ", "-")[:20]
            club = Club(
                name=req.club_name.strip(),
                code=code,
                created_by_id=user.id,
            )
            db.add(club)
            db.flush()

            membership = ClubMembership(
                club_id=club.id,
                user_id=user.id,
                role=req.role or ClubRole.PRESIDENT,
                department="Executive Board",
            )
            db.add(membership)

        db.commit()
        db.refresh(user)
        if club:
            db.refresh(club)
        return user, club, join_req

    @staticmethod
    def update_user_profile(db: Session, user: User, update_data: UserProfileUpdate) -> User:
        if update_data.full_name is not None and update_data.full_name.strip():
            user.full_name = update_data.full_name.strip()
        if update_data.phone_number is not None:
            user.phone_number = update_data.phone_number.strip()
        if update_data.avatar_url is not None:
            user.avatar_url = update_data.avatar_url.strip()
        if update_data.password is not None and len(update_data.password.strip()) >= 6:
            user.hashed_password = get_password_hash(update_data.password.strip())
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def create_user_token(user: User, active_club_id: Optional[str] = None, active_role: Optional[str] = None) -> str:
        role = active_role
        club_id = active_club_id
        if not role and user.memberships:
            role = user.memberships[0].role.value
            club_id = user.memberships[0].club_id

        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        return create_access_token(
            subject=user.id,
            claims={
                "email": user.email,
                "role": role or "VOLUNTEER",
                "club_id": club_id,
            },
            expires_delta=expires_delta,
        )
