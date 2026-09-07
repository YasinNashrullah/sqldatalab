from pydantic import BaseModel, Field


class TableColumnContext(BaseModel):
    name: str
    type: str


class TableContext(BaseModel):
    table_name: str
    columns: list[TableColumnContext]


class SchemaContext(BaseModel):
    tables: list[TableContext] = []


class ExplainQueryRequest(BaseModel):
    query: str = Field(min_length=1)
    schema_context: SchemaContext | None = None


class ExplainErrorRequest(BaseModel):
    query: str = Field(min_length=1)
    error_message: str = Field(min_length=1)
    schema_context: SchemaContext | None = None


class GenerateSQLRequest(BaseModel):
    prompt: str = Field(min_length=1)
    schema_context: SchemaContext


class AIResponse(BaseModel):
    success: bool = True
    explanation: str
    sql_suggestion: str | None = None
    is_mock: bool = False
