from fastapi import APIRouter, Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from backend.app.core.config import settings
from backend.app.models.base import get_db
from backend.app.schemas.base import success_envelope
import duckdb

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check(request: Request, db: AsyncSession = Depends(get_db)):
    req_id = getattr(request.state, "request_id", "req_health")
    
    # Check Metadata DB
    db_status = "HEALTHY"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"ERROR: {str(e)}"

    # Check DuckDB Engine
    duck_status = "HEALTHY"
    try:
        duck_con = duckdb.connect(":memory:")
        res = duck_con.execute("SELECT 42").fetchone()
        if not res or res[0] != 42:
            duck_status = "UNEXPECTED_RESULT"
    except Exception as e:
        duck_status = f"ERROR: {str(e)}"

    data = {
        "status": "HEALTHY" if db_status == "HEALTHY" and duck_status == "HEALTHY" else "DEGRADED",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "database": db_status,
        "duckdb_engine": duck_status,
    }
    return success_envelope(data, req_id)
