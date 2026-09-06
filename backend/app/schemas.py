from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AssessmentInput(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    sleep_duration: float = Field(ge=0, le=24)
    work_hours: float = Field(ge=0, le=24)
    mood_level: int = Field(ge=1, le=10)
    screen_time: float = Field(ge=0, le=24)
    physical_activity: float = Field(ge=0, le=1440)
    heart_rate: int = Field(ge=35, le=220)
    blood_oxygen: float = Field(ge=70, le=100)


class AssessmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    stress_score: int
    stress_level: str
    summary: str
    factors: list[str]
    recommendations: list[str]
    created_at: datetime
    sleep_duration: float
    work_hours: float
    mood_level: int
    screen_time: float
    physical_activity: float
    heart_rate: int
    blood_oxygen: float


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    created_at: datetime


class DashboardResponse(BaseModel):
    user: UserResponse
    latest: AssessmentResponse | None
    history: list[AssessmentResponse]
