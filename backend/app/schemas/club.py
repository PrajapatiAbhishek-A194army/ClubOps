from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.club import ClubRole


class ClubBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    institution: Optional[str] = "University Campus"
    logo_url: Optional[str] = None


class ClubCreate(ClubBase):
    club_head_user_id: Optional[str] = None
    club_head_email: Optional[str] = None


class ClubUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    institution: Optional[str] = None
    logo_url: Optional[str] = None


class ClubResponse(ClubBase):
    id: str
    created_by_id: Optional[str] = None
    created_at: datetime
    member_count: int = 0

    class Config:
        from_attributes = True


class ClubWithRoleResponse(ClubResponse):
    user_role: ClubRole
    department: Optional[str] = None


class MemberCreate(BaseModel):
    email: str
    role: ClubRole = ClubRole.MEMBER
    department: Optional[str] = "General"


class MemberUpdate(BaseModel):
    role: Optional[ClubRole] = None
    department: Optional[str] = None


class MemberResponse(BaseModel):
    membership_id: str
    user_id: str
    email: str
    full_name: str
    avatar_url: Optional[str] = None
    role: ClubRole
    department: Optional[str] = "General"
    joined_at: datetime

    class Config:
        from_attributes = True


class AssignClubHeadRequest(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    send_email: bool = True

