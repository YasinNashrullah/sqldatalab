import re
import sqlparse
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from backend.app.core.errors import AppException, SQLSyntaxError
from backend.app.models.base import get_db
from backend.app.models.user import User
from backend.app.models.query import QueryHistory
from backend.app.schemas.sql import (
    SQLExecuteRequest,
    SQLFormatRequest,
    SQLExplainRequest,
)
from backend.app.schemas.base import success_envelope
from backend.app.services.duckdb_manager import DuckDBManager
from backend.app.api.deps import get_current_user, verify_workspace_access


def _sanitize_error_message(error_msg: str) -> str:
    """Sanitize error messages to prevent information disclosure"""
    if not error_msg:
        return "Query execution failed"

    sanitized = re.sub(r'File ".*?"', 'File "[REDACTED]"', error_msg)
    sanitized = re.sub(r"line \d+", "line [REDACTED]", sanitized)
    sanitized = re.sub(r"/[\w/\-\.]+/", "[PATH]/", sanitized)
    sanitized = re.sub(r"[A-Z]:\\[\w\\\-\.]+", "[PATH]", sanitized)

    lines = sanitized.split("\n")
    if len(lines) > 3:
        sanitized = "\n".join(lines[:3]) + "\n[Additional details omitted for security]"

    return sanitized[:500]


COMMON_SQL_FUNCTIONS = [
    "COUNT",
    "SUM",
    "AVG",
    "MIN",
    "MAX",
    "COALESCE",
    "ROUND",
    "CAST",
    "CONCAT",
    "STRFTIME",
    "DATE_TRUNC",
    "ROW_NUMBER",
    "RANK",
    "DENSE_RANK",
    "LAG",
    "LEAD",
    "NTILE",
    "NULLIF",
    "SUBSTRING",
    "LOWER",
    "UPPER",
    "TRIM",
    "ABS",
    "CEIL",
    "FLOOR",
    "FIRST_VALUE",
    "LAST_VALUE",
    "EXTRACT",
    "POSITION",
]
FN_UPPERCASE_PATTERN = re.compile(
    rf"\b({'|'.join(COMMON_SQL_FUNCTIONS)})\s*\(", re.IGNORECASE
)

router = APIRouter(prefix="/sql", tags=["SQL Execution"])


@router.post("/execute")
async def execute_sql(
    payload: SQLExecuteRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_sql")
    await verify_workspace_access(workspace_id=payload.workspace_id, user=user, db=db)

    # Execute query in DuckDB
    status_str = "SUCCESS"
    err_msg = None
    exec_result = None

    try:
        exec_result = DuckDBManager.execute_query(
            workspace_id=payload.workspace_id,
            query=payload.query,
            limit=payload.limit,
        )
    except Exception as e:
        status_str = "ERROR"
        err_msg = _sanitize_error_message(str(e))
        # Record failed queries into history for learning
        history_record = QueryHistory(
            workspace_id=payload.workspace_id,
            user_id=user.id,
            query_text=payload.query,
            duration_ms=getattr(e, "details", {}).get("execution_time_ms", 0.0),
            status="ERROR",
            row_count=0,
            error_message=err_msg,
        )
        db.add(history_record)
        await db.commit()
        raise e

    # Record successful query into query_history
    history_record = QueryHistory(
        workspace_id=payload.workspace_id,
        user_id=user.id,
        query_text=payload.query,
        duration_ms=exec_result["execution_time_ms"],
        status="SUCCESS",
        row_count=exec_result["row_count"],
        error_message=None,
    )
    db.add(history_record)

    # Auto-Retention: keep maximum 100 queries per workspace to prevent history bloating
    try:
        count_res = await db.execute(
            select(func.count(QueryHistory.id)).where(
                QueryHistory.workspace_id == payload.workspace_id
            )
        )
        hist_count = count_res.scalar() or 0
        if hist_count >= 100:
            excess = hist_count - 99
            oldest_ids_res = await db.execute(
                select(QueryHistory.id)
                .where(QueryHistory.workspace_id == payload.workspace_id)
                .order_by(QueryHistory.executed_at.asc())
                .limit(excess)
            )
            oldest_ids = [r[0] for r in oldest_ids_res.all()]
            if oldest_ids:
                await db.execute(
                    delete(QueryHistory).where(QueryHistory.id.in_(oldest_ids))
                )
    except Exception:
        pass

    await db.commit()
    return success_envelope(exec_result, req_id)


@router.post("/explain")
async def explain_sql(
    payload: SQLExplainRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_explain")
    await verify_workspace_access(workspace_id=payload.workspace_id, user=user, db=db)

    plan_result = DuckDBManager.explain_query(
        workspace_id=payload.workspace_id,
        query=payload.query,
    )
    return success_envelope(plan_result, req_id)


@router.get("/table-stats")
async def get_table_stats(
    workspace_id: str,
    table_name: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_table_stats")
    await verify_workspace_access(workspace_id=workspace_id, user=user, db=db)

    stats = DuckDBManager.get_table_stats(workspace_id, table_name)
    return success_envelope(stats, req_id)


@router.post("/format")
async def format_sql(
    payload: SQLFormatRequest,
    request: Request,
    user: User = Depends(get_current_user),
):
    req_id = getattr(request.state, "request_id", "req_fmt")
    raw_query = payload.query.strip()
    if not raw_query:
        return success_envelope({"formatted_query": ""}, req_id)

    indent = max(2, min(payload.indent_width, 8))
    kw_case = "upper" if payload.keyword_case == "upper" else None

    formatted = sqlparse.format(
        raw_query,
        reindent=True,
        keyword_case=kw_case,
        identifier_case=None,
        indent_width=indent,
        strip_comments=False,
    )

    # Uppercase common built-in analytical and aggregate functions
    if kw_case == "upper":
        formatted = FN_UPPERCASE_PATTERN.sub(
            lambda m: f"{m.group(1).upper()}(", formatted
        )

    return success_envelope({"formatted_query": formatted.strip()}, req_id)


@router.get("/schema-graph")
async def get_schema_graph(
    workspace_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_schema_graph")
    await verify_workspace_access(workspace_id=workspace_id, user=user, db=db)

    graph = DuckDBManager.get_schema_graph(workspace_id)
    return success_envelope(graph, req_id)


@router.get("/data-quality-profile")
async def get_data_quality_profile(
    workspace_id: str,
    table_name: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_quality_profile")
    await verify_workspace_access(workspace_id=workspace_id, user=user, db=db)

    profile = DuckDBManager.get_data_quality_profile(workspace_id, table_name)
    return success_envelope(profile, req_id)
