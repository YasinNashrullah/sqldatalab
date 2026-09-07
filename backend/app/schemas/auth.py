from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=100)
    full_name: str | None = None


class UserLogin(BaseModel):
    username_or_email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    full_name: str | None = None
    is_active: bool
    is_superuser: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=100)
    email: EmailStr | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=100)


class UserStats(BaseModel):
    total_queries: int = 0
    successful_queries: int = 0
    failed_queries: int = 0
    success_rate_pct: float = 0.0
    avg_duration_ms: float = 0.0
    total_rows_processed: int = 0
    challenges_passed: int = 0
    total_challenges: int = 0
    total_xp: int = 0
    rank_title: str = "SQL Novice"
    workspaces_count: int = 1
    max_workspaces: int = 3
    datasets_count: int = 0
    tables_count: int = 0
