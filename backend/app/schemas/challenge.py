from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


class ChallengeResponse(BaseModel):
    id: str
    title: str
    slug: str
    difficulty: str  # Beginner, Intermediate, Advanced
    category: str
    description: str
    target_dataset_slug: str
    starter_sql: str
    hints: list[str] = []
    ordinal_rank: int
    is_completed: bool = False

    model_config = {"from_attributes": True}


class ChallengeValidateRequest(BaseModel):
    workspace_id: str
    submitted_sql: str = Field(min_length=1)


class ChallengeValidateResponse(BaseModel):
    is_passed: bool
    message: str
    execution_time_ms: float
    user_row_count: int
    expected_row_count: int
    user_columns: list[str] = []
    expected_columns: list[str] = []
    sample_user_rows: list[list[Any]] = []
    sample_expected_rows: list[list[Any]] = []
    diff_details: str | None = None
