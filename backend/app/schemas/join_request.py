from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.join_request import JoinRequestStatus


class JoinRequestCreate(BaseModel):
    message: Optional[str] = Field(None, max_length=500)


class JoinRequestReview(BaseModel):
    status: JoinRequestStatus  # APPROVED or REJECTED


class JoinRequestResponse(BaseModel):
    id: str
    club_id: str
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    status: JoinRequestStatus
    message: Optional[str] = None
    requested_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewed_by_id: Optional[str] = None

    class Config:
        from_attributes = True
