from datetime import datetime
from pydantic import BaseModel, Field


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None


class WorkspaceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None


class WorkspaceResponse(BaseModel):
    id: str
    owner_id: str
    name: str
    slug: str
    description: str | None = None
    created_at: datetime
    table_count: int = 0
    dataset_count: int = 0

    model_config = {"from_attributes": True}
