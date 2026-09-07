from datetime import datetime
from typing import Any
from pydantic import BaseModel


class ColumnSchema(BaseModel):
    id: str
    column_name: str
    data_type: str
    ordinal_position: int
    is_nullable: bool
    sample_values: list[Any] = []

    model_config = {"from_attributes": True}


class TableSchema(BaseModel):
    id: str
    table_name: str
    engine_identifier: str
    row_count: int
    column_count: int
    columns: list[ColumnSchema] = []

    model_config = {"from_attributes": True}


class DatasetResponse(BaseModel):
    id: str
    workspace_id: str
    name: str
    original_filename: str
    file_type: str
    file_size_bytes: int
    processing_status: str
    error_message: str | None = None
    created_at: datetime
    tables: list[TableSchema] = []

    model_config = {"from_attributes": True}


class ColumnTypeUpdate(BaseModel):
    column_name: str
    new_data_type: str


class SchemaUpdateRequest(BaseModel):
    column_updates: list[ColumnTypeUpdate]
