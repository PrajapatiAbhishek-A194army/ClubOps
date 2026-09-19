from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_user_token
from app.config.settings import settings
from app.schemas.auth import LoginRequest, Token, TokenPayload, UserSummary
from app.schemas.common import ApiResponse
from app.utils.security import create_access_token, get_password_hash, verify_password

router = APIRouter()

# Mock user store for Foundation phase sanity testing
DEMO_PASSWORD_HASH = get_password_hash("ClubOps2026!")
DEMO_USER = {
    "id": "usr_demo_president_01",
    "email": "president@clubops.ai",
    "name": "Alex President",
    "role": "PRESIDENT",
    "club_id": "club_main_01",
}


@router.post("/auth/login", response_model=ApiResponse[Token])
def login(credentials: LoginRequest):
    """Generates an access token for valid credentials."""
    # Foundation verification flow
    if credentials.email == DEMO_USER["email"] and verify_password(credentials.password, DEMO_PASSWORD_HASH):
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        token_str = create_access_token(
            subject=DEMO_USER["id"],
            claims={
                "email": DEMO_USER["email"],
                "role": DEMO_USER["role"],
                "club_id": DEMO_USER["club_id"],
            },
            expires_delta=expires_delta,
        )
        token_data = Token(
            access_token=token_str,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
        return ApiResponse(
            success=True,
            data=token_data,
            message="Authentication successful",
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password",
        headers={"WWW-Authenticate": "Bearer"},
    )


@router.get("/auth/me", response_model=ApiResponse[UserSummary])
def get_current_user(token_payload: TokenPayload = Depends(get_current_user_token)):
    """Validates the JWT token and returns authenticated identity."""
    user = UserSummary(
        id=token_payload.sub or "unknown",
        email=token_payload.email or "unknown@clubops.ai",
        name="Alex President" if token_payload.sub == DEMO_USER["id"] else "Club Member",
        role=token_payload.role or "MEMBER",
        club_id="club_main_01",
    )
    return ApiResponse(
        success=True,
        data=user,
        message="Session verified",
    )
