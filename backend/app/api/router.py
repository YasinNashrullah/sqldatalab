from fastapi import APIRouter
from backend.app.api.v1.health import router as health_router
from backend.app.api.v1.auth import router as auth_router
from backend.app.api.v1.workspaces import router as workspaces_router
from backend.app.api.v1.datasets import router as datasets_router
from backend.app.api.v1.sql import router as sql_router
from backend.app.api.v1.queries import router as queries_router
from backend.app.api.v1.exports import router as exports_router
from backend.app.api.v1.challenges import router as challenges_router
from backend.app.api.v1.ai import router as ai_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(workspaces_router)
api_router.include_router(datasets_router)
api_router.include_router(sql_router)
api_router.include_router(queries_router)
api_router.include_router(exports_router)
api_router.include_router(challenges_router)
api_router.include_router(ai_router)
