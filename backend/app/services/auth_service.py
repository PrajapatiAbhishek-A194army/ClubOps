from datetime import timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.config.settings import settings
from app.models.user import User
from app.models.club import Club, ClubMembership, ClubRole
from app.schemas.auth import UserRegisterRequest
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
    def register_user(db: Session, req: UserRegisterRequest) -> Tuple[User, Optional[Club]]:
        existing = AuthService.get_user_by_email(db, req.email)
        if existing:
            raise ValueError(f"User with email '{req.email}' already exists.")

        user = User(
            email=req.email.lower().strip(),
            hashed_password=get_password_hash(req.password),
            full_name=req.full_name.strip(),
        )
        db.add(user)
        db.flush()

        club = None
        if req.club_name:
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
        return user, club

    @staticmethod
    def create_user_token(user: User, active_club_id: Optional[str] = None, active_role: Optional[str] = None) -> str:
        # Determine primary role from first membership if not specified
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
                "role": role or "MEMBER",
                "club_id": club_id,
            },
            expires_delta=expires_delta,
        )
