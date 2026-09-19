from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from app.models.club import ClubRole


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    club_id: Optional[str] = None
    exp: Optional[int] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    club_name: Optional[str] = None
    club_code: Optional[str] = None
    role: Optional[ClubRole] = ClubRole.PRESIDENT


class UserSummary(BaseModel):
    id: str
    email: str
    full_name: str
    avatar_url: Optional[str] = None
    role: Optional[str] = "MEMBER"
    club_id: Optional[str] = None

    class Config:
        from_attributes = True


class UserMembershipSummary(BaseModel):
    club_id: str
    club_name: str
    club_code: str
    role: ClubRole
    department: Optional[str] = None


class UserProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str
    avatar_url: Optional[str] = None
    role: Optional[str] = "MEMBER"
    active_role: Optional[str] = None
    active_club_id: Optional[str] = None
    memberships: List[UserMembershipSummary] = []

    class Config:
        from_attributes = True

