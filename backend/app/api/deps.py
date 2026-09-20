from typing import Generator, List, Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.config.settings import settings
from app.database.session import SessionLocal
from app.models.club import ClubMembership, ClubRole
from app.models.user import User
from app.schemas.auth import TokenPayload
from app.utils.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False,
)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_token_payload(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
) -> TokenPayload:
    # Check Authorization header first, fallback to persistent cookie
    if not token:
        token = request.cookies.get("clubops_token") or request.cookies.get("access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload_dict = decode_access_token(token)
    if not payload_dict or not payload_dict.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return TokenPayload(**payload_dict)


def get_current_user(
    db: Session = Depends(get_db),
    token_payload: TokenPayload = Depends(get_current_token_payload),
) -> User:
    user = db.query(User).filter(User.id == token_payload.sub).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User associated with this token not found",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )
    return user


def require_club_role(allowed_roles: List[ClubRole]):
    """Enforces deny-by-default role authorization on club endpoints."""
    def role_checker(
        club_id: str,
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> ClubMembership:
        membership = (
            db.query(ClubMembership)
            .filter(ClubMembership.club_id == club_id, ClubMembership.user_id == user.id)
            .first()
        )
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this club",
            )
        if membership.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action requires one of the following roles: {[r.value for r in allowed_roles]}",
            )
        return membership

    return role_checker
