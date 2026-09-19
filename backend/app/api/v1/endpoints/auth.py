from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    Token,
    UserProfileResponse,
    UserRegisterRequest,
    UserMembershipSummary,
)
from app.schemas.common import ApiResponse
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/auth/signup", response_model=ApiResponse[Token])
def signup(req: UserRegisterRequest, db: Session = Depends(get_db)):
    """Registers a new user and optional initial club."""
    try:
        user, club = AuthService.register_user(db, req)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    token_str = AuthService.create_user_token(
        user=user,
        active_club_id=club.id if club else None,
        active_role=req.role.value if req.role else "PRESIDENT",
    )
    return ApiResponse(
        success=True,
        data=Token(
            access_token=token_str,
            token_type="bearer",
            expires_in=60 * 60 * 24,
        ),
        message="Account registered successfully",
    )


@router.post("/auth/login", response_model=ApiResponse[Token])
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """Authenticates credentials against PostgreSQL and returns JWT token."""
    user = AuthService.authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_str = AuthService.create_user_token(user)
    return ApiResponse(
        success=True,
        data=Token(
            access_token=token_str,
            token_type="bearer",
            expires_in=60 * 60 * 24,
        ),
        message="Authentication successful",
    )


@router.get("/auth/me", response_model=ApiResponse[UserProfileResponse])
def get_current_user_profile(user: User = Depends(get_current_user)):
    """Returns the authenticated user identity and club memberships."""
    memberships_summary = [
        UserMembershipSummary(
            club_id=m.club_id,
            club_name=m.club.name if m.club else "Club",
            club_code=m.club.code if m.club else "club",
            role=m.role,
            department=m.department,
        )
        for m in user.memberships
    ]

    active_club_id = user.memberships[0].club_id if user.memberships else None
    active_role = user.memberships[0].role.value if user.memberships else "MEMBER"

    profile = UserProfileResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        role=active_role,
        active_role=active_role,
        active_club_id=active_club_id,
        memberships=memberships_summary,
    )

    return ApiResponse(
        success=True,
        data=profile,
        message="Session active",
    )
