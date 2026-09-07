from typing import Any
from pydantic import BaseModel, Field


class SQLExecuteRequest(BaseModel):
    workspace_id: str
    query: str = Field(min_length=1)
    limit: int = Field(default=1000, ge=1, le=5000)


class SQLExplainRequest(BaseModel):
    workspace_id: str
    query: str = Field(min_length=1)


class ColumnInfo(BaseModel):
    name: str
    type: str


class SQLExecuteResponse(BaseModel):
    query_id: str
    status: str  # SUCCESS, ERROR, TIMEOUT
    execution_time_ms: float
    row_count: int
    total_rows_estimate: int
    columns: list[ColumnInfo] = []
    rows: list[list[Any]] = []
    error: str | None = None


class SQLFormatRequest(BaseModel):
    query: str
    indent_width: int = 2
    keyword_case: str = "upper"


class SQLFormatResponse(BaseModel):
    formatted_query: str
