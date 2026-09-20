from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    Token,
    UserProfileResponse,
    UserProfileUpdate,
    UserRegisterRequest,
    UserMembershipSummary,
)
from app.schemas.common import ApiResponse
from app.services.auth_service import AuthService

router = APIRouter()

COOKIE_MAX_AGE = 30 * 24 * 60 * 60  # 30 days


@router.post("/auth/signup", response_model=ApiResponse[Token])
def signup(req: UserRegisterRequest, response: Response, db: Session = Depends(get_db)):
    """Registers a new volunteer or initial club user."""
    try:
        user, club, join_req = AuthService.register_user(db, req)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    assigned_role = "PRESIDENT" if club and club.created_by_id == user.id else "VOLUNTEER"
    token_str = AuthService.create_user_token(
        user=user,
        active_club_id=club.id if club else None,
        active_role=assigned_role,
    )
    
    # Store token in persistent cookie for seamless session recovery
    response.set_cookie(
        key="clubops_token",
        value=token_str,
        max_age=COOKIE_MAX_AGE,
        httponly=False,
        samesite="lax",
        secure=False,
        path="/",
    )

    msg = "Volunteer registration submitted! Application sent to Club Head for approval." if join_req else "Account registered successfully"
    return ApiResponse(
        success=True,
        data=Token(
            access_token=token_str,
            token_type="bearer",
            expires_in=COOKIE_MAX_AGE,
        ),
        message=msg,
    )


@router.post("/auth/login", response_model=ApiResponse[Token])
def login(credentials: LoginRequest, response: Response, db: Session = Depends(get_db)):
    """Authenticates credentials against PostgreSQL and returns JWT token."""
    user = AuthService.authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_str = AuthService.create_user_token(user)

    # Store token in persistent cookie for seamless session recovery
    response.set_cookie(
        key="clubops_token",
        value=token_str,
        max_age=COOKIE_MAX_AGE,
        httponly=False,
        samesite="lax",
        secure=False,
        path="/",
    )

    return ApiResponse(
        success=True,
        data=Token(
            access_token=token_str,
            token_type="bearer",
            expires_in=COOKIE_MAX_AGE,
        ),
        message="Authentication successful",
    )


@router.post("/auth/logout", response_model=ApiResponse[dict])
def logout(response: Response):
    """Terminates session by clearing authentication cookies."""
    response.delete_cookie(key="clubops_token", path="/")
    response.delete_cookie(key="access_token", path="/")
    return ApiResponse(
        success=True,
        data={"logged_out": True},
        message="Session successfully terminated",
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
    active_role = user.memberships[0].role.value if user.memberships else "VOLUNTEER"

    profile = UserProfileResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        phone_number=user.phone_number,
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


@router.put("/auth/me", response_model=ApiResponse[UserProfileResponse])
def update_current_user_profile(
    update_in: UserProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Updates the authenticated user's profile details."""
    updated_user = AuthService.update_user_profile(db, user, update_in)

    memberships_summary = [
        UserMembershipSummary(
            club_id=m.club_id,
            club_name=m.club.name if m.club else "Club",
            club_code=m.club.code if m.club else "club",
            role=m.role,
            department=m.department,
        )
        for m in updated_user.memberships
    ]

    active_club_id = updated_user.memberships[0].club_id if updated_user.memberships else None
    active_role = updated_user.memberships[0].role.value if updated_user.memberships else "VOLUNTEER"

    profile = UserProfileResponse(
        id=updated_user.id,
        email=updated_user.email,
        full_name=updated_user.full_name,
        phone_number=updated_user.phone_number,
        avatar_url=updated_user.avatar_url,
        role=active_role,
        active_role=active_role,
        active_club_id=active_club_id,
        memberships=memberships_summary,
    )

    return ApiResponse(
        success=True,
        data=profile,
        message="Profile updated successfully",
    )
