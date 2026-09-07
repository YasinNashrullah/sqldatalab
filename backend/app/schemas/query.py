from datetime import datetime
from pydantic import BaseModel, Field


class QueryHistoryResponse(BaseModel):
    id: str
    workspace_id: str
    user_id: str
    query_text: str
    duration_ms: float
    status: str
    row_count: int
    error_message: str | None = None
    executed_at: datetime

    model_config = {"from_attributes": True}


class SavedQueryCreate(BaseModel):
    workspace_id: str
    title: str = Field(min_length=1, max_length=150)
    description: str | None = None
    query_text: str = Field(min_length=1)
    tags: list[str] = Field(default_factory=list)


class SavedQueryUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = None
    query_text: str | None = Field(default=None, min_length=1)
    tags: list[str] | None = None


class SavedQueryResponse(BaseModel):
    id: str
    workspace_id: str
    user_id: str
    title: str
    description: str | None = None
    query_text: str
    tags: list[str] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
