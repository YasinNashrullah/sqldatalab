from fastapi import APIRouter, Depends, Request
from backend.app.schemas.ai import ExplainQueryRequest, ExplainErrorRequest, GenerateSQLRequest
from backend.app.schemas.base import success_envelope
from backend.app.services.ai_service import AIService
from backend.app.models.user import User
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/ai", tags=["AI Assistant (Optional)"])


@router.post("/explain-query")
async def explain_query(
    payload: ExplainQueryRequest,
    request: Request,
    user: User = Depends(get_current_user),
):
    req_id = getattr(request.state, "request_id", "req_ai")
    res = await AIService.explain_query(payload.query, payload.schema_context)
    return success_envelope(res, req_id)


@router.post("/explain-error")
async def explain_error(
    payload: ExplainErrorRequest,
    request: Request,
    user: User = Depends(get_current_user),
):
    req_id = getattr(request.state, "request_id", "req_ai")
    res = await AIService.explain_error(payload.query, payload.error_message, payload.schema_context)
    return success_envelope(res, req_id)


@router.post("/generate-sql")
async def generate_sql(
    payload: GenerateSQLRequest,
    request: Request,
    user: User = Depends(get_current_user),
):
    req_id = getattr(request.state, "request_id", "req_ai")
    res = await AIService.generate_sql(payload.prompt, payload.schema_context)
    return success_envelope(res, req_id)
