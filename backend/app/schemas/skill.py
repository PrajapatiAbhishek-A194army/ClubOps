from typing import Optional
from pydantic import BaseModel, Field


class SkillCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    category: str = "General"
    description: Optional[str] = None


class SkillResponse(BaseModel):
    id: str
    name: str
    category: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class VolunteerSkillCreate(BaseModel):
    skill_id: str
    proficiency: int = Field(..., ge=1, le=5)
    experience_years: float = Field(0.0, ge=0.0)


class VolunteerSkillResponse(BaseModel):
    id: str
    user_id: str
    skill_id: str
    skill_name: str
    category: str
    proficiency: int
    experience_years: float

    class Config:
        from_attributes = True
