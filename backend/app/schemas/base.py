from datetime import datetime, timezone
from typing import Generic, TypeVar, Any
from pydantic import BaseModel, Field

T = TypeVar("T")


class MetaInfo(BaseModel):
    request_id: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ErrorDetail(BaseModel):
    code: str
    message: str
    request_id: str
    details: dict[str, Any] = Field(default_factory=dict)


class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T | None = None
    meta: MetaInfo | None = None
    error: ErrorDetail | None = None


def success_envelope(data: Any, request_id: str = "req_default") -> dict[str, Any]:
    return {
        "success": True,
        "data": data,
        "meta": {
            "request_id": request_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    }
