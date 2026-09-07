from backend.app.schemas.base import ApiResponse, MetaInfo, ErrorDetail, success_envelope
from backend.app.schemas.auth import UserRegister, UserLogin, UserResponse, TokenResponse
from backend.app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse
from backend.app.schemas.dataset import ColumnSchema, TableSchema, DatasetResponse, SchemaUpdateRequest
from backend.app.schemas.sql import SQLExecuteRequest, SQLExecuteResponse, SQLFormatRequest, SQLFormatResponse, ColumnInfo
from backend.app.schemas.query import QueryHistoryResponse, SavedQueryCreate, SavedQueryUpdate, SavedQueryResponse
from backend.app.schemas.challenge import ChallengeResponse, ChallengeValidateRequest, ChallengeValidateResponse
from backend.app.schemas.ai import ExplainQueryRequest, ExplainErrorRequest, GenerateSQLRequest, AIResponse

__all__ = [
    "ApiResponse",
    "MetaInfo",
    "ErrorDetail",
    "success_envelope",
    "UserRegister",
    "UserLogin",
    "UserResponse",
    "TokenResponse",
    "WorkspaceCreate",
    "WorkspaceUpdate",
    "WorkspaceResponse",
    "ColumnSchema",
    "TableSchema",
    "DatasetResponse",
    "SchemaUpdateRequest",
    "SQLExecuteRequest",
    "SQLExecuteResponse",
    "SQLFormatRequest",
    "SQLFormatResponse",
    "ColumnInfo",
    "QueryHistoryResponse",
    "SavedQueryCreate",
    "SavedQueryUpdate",
    "SavedQueryResponse",
    "ChallengeResponse",
    "ChallengeValidateRequest",
    "ChallengeValidateResponse",
    "ExplainQueryRequest",
    "ExplainErrorRequest",
    "GenerateSQLRequest",
    "AIResponse",
]
