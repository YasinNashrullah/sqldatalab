import json
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from backend.app.core.errors import NotFoundError
from backend.app.models.base import get_db
from backend.app.models.user import User
from backend.app.models.query import QueryHistory, SavedQuery
from backend.app.schemas.query import (
    SavedQueryCreate,
    SavedQueryUpdate,
    SavedQueryResponse,
    QueryHistoryResponse,
)
from backend.app.schemas.base import success_envelope
from backend.app.api.deps import get_current_user, verify_workspace_access

router = APIRouter(prefix="/queries", tags=["Queries & History"])


@router.get("/history")
async def get_query_history(
    workspace_id: str,
    request: Request,
    limit: int = 50,
    search: str | None = None,
    status_filter: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_hist")
    await verify_workspace_access(workspace_id=workspace_id, user=user, db=db)

    query = select(QueryHistory).where(
        QueryHistory.workspace_id == workspace_id,
        QueryHistory.user_id == user.id,
    )

    if status_filter and status_filter.upper() in ["SUCCESS", "ERROR"]:
        query = query.where(QueryHistory.status == status_filter.upper())

    if search:
        query = query.where(QueryHistory.query_text.ilike(f"%{search}%"))

    query = query.order_by(QueryHistory.executed_at.desc()).limit(limit)

    res = await db.execute(query)
    histories = res.scalars().all()

    items = [QueryHistoryResponse.model_validate(h).model_dump() for h in histories]
    return success_envelope({"history": items, "retention_max": 100}, req_id)


@router.delete("/history/cleanup")
async def cleanup_history(
    workspace_id: str,
    request: Request,
    clear_all: bool = False,
    days: int | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_clean_hist")
    await verify_workspace_access(workspace_id=workspace_id, user=user, db=db)

    del_stmt = delete(QueryHistory).where(
        QueryHistory.workspace_id == workspace_id,
        QueryHistory.user_id == user.id,
    )

    if not clear_all and days:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        del_stmt = del_stmt.where(QueryHistory.executed_at < cutoff)

    result = await db.execute(del_stmt)
    deleted_count = result.rowcount
    await db.commit()

    return success_envelope(
        {
            "message": f"{deleted_count} riwayat query berhasil dibersihkan.",
            "deleted_count": deleted_count,
        },
        req_id,
    )


@router.delete("/history/{id}")
async def delete_query_history(
    id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_del_hist")
    query = select(QueryHistory).where(
        QueryHistory.id == id, QueryHistory.user_id == user.id
    )
    res = await db.execute(query)
    record = res.scalar_one_or_none()

    if not record:
        raise NotFoundError("History record not found.")

    await db.delete(record)
    await db.commit()
    return success_envelope({"message": "History record deleted."}, req_id)


@router.get("/saved")
async def get_saved_queries(
    workspace_id: str,
    request: Request,
    search: str | None = None,
    tag: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_saved")
    await verify_workspace_access(workspace_id=workspace_id, user=user, db=db)

    query = (
        select(SavedQuery)
        .where(
            SavedQuery.workspace_id == workspace_id,
            SavedQuery.user_id == user.id,
        )
        .order_by(SavedQuery.updated_at.desc())
    )

    res = await db.execute(query)
    saved = res.scalars().all()

    items = []
    for s in saved:
        tags = []
        if s.tags_json:
            try:
                parsed = json.loads(s.tags_json)
                if isinstance(parsed, list):
                    tags = [
                        str(x).strip().lstrip("#") for x in parsed if str(x).strip()
                    ]
            except Exception:
                tags = []

        if tag:
            target_tag = tag.strip().lower().lstrip("#")
            if target_tag not in [t.lower() for t in tags]:
                continue
        if search:
            search_lower = search.lower()
            if (
                search_lower not in s.title.lower()
                and (not s.description or search_lower not in s.description.lower())
                and search_lower not in s.query_text.lower()
                and not any(search_lower in t.lower() for t in tags)
            ):
                continue

        items.append(
            {
                "id": s.id,
                "workspace_id": s.workspace_id,
                "user_id": s.user_id,
                "title": s.title,
                "description": s.description,
                "query_text": s.query_text,
                "tags": tags,
                "created_at": s.created_at,
                "updated_at": s.updated_at,
            }
        )

    return success_envelope({"saved_queries": items}, req_id)


@router.post("/saved", status_code=status.HTTP_201_CREATED)
async def create_saved_query(
    payload: SavedQueryCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_save_new")
    await verify_workspace_access(workspace_id=payload.workspace_id, user=user, db=db)

    # Collect tags from tags list, tags_json string, or category string
    raw_tags: list[str] = []
    if payload.tags:
        raw_tags.extend(payload.tags)
    if payload.tags_json and not raw_tags:
        try:
            parsed = json.loads(payload.tags_json)
            if isinstance(parsed, list):
                raw_tags.extend(str(x) for x in parsed)
        except Exception:
            pass
    if payload.category:
        raw_tags.append(payload.category)

    # Clean and deduplicate tags
    clean_tags = list(
        dict.fromkeys([t.strip().lstrip("#") for t in raw_tags if t and t.strip()])
    )

    sq_id = str(uuid.uuid4())
    saved = SavedQuery(
        id=sq_id,
        workspace_id=payload.workspace_id,
        user_id=user.id,
        title=payload.title,
        description=payload.description,
        query_text=payload.query_text,
        tags_json=json.dumps(clean_tags),
    )
    db.add(saved)
    await db.commit()
    await db.refresh(saved)

    data = {
        "id": saved.id,
        "workspace_id": saved.workspace_id,
        "user_id": saved.user_id,
        "title": saved.title,
        "description": saved.description,
        "query_text": saved.query_text,
        "tags": clean_tags,
        "created_at": saved.created_at,
        "updated_at": saved.updated_at,
    }
    return success_envelope(data, req_id)


@router.put("/saved/{id}")
async def update_saved_query(
    id: str,
    payload: SavedQueryUpdate,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_save_edit")
    query = select(SavedQuery).where(SavedQuery.id == id, SavedQuery.user_id == user.id)
    res = await db.execute(query)
    saved = res.scalar_one_or_none()

    if not saved:
        raise NotFoundError("Saved query not found.")

    if payload.title is not None:
        saved.title = payload.title
    if payload.description is not None:
        saved.description = payload.description
    if payload.query_text is not None:
        saved.query_text = payload.query_text

    new_tags: list[str] | None = None
    if payload.tags is not None:
        new_tags = [t.strip().lstrip("#") for t in payload.tags if t.strip()]
    elif payload.tags_json is not None:
        try:
            parsed = json.loads(payload.tags_json)
            if isinstance(parsed, list):
                new_tags = [
                    str(x).strip().lstrip("#") for x in parsed if str(x).strip()
                ]
        except Exception:
            pass
    if payload.category is not None:
        cat = payload.category.strip().lstrip("#")
        if cat:
            if new_tags is None:
                new_tags = []
            if cat not in new_tags:
                new_tags.append(cat)

    if new_tags is not None:
        saved.tags_json = json.dumps(list(dict.fromkeys(new_tags)))

    await db.commit()
    await db.refresh(saved)

    tags = json.loads(saved.tags_json) if saved.tags_json else []
    data = {
        "id": saved.id,
        "workspace_id": saved.workspace_id,
        "user_id": saved.user_id,
        "title": saved.title,
        "description": saved.description,
        "query_text": saved.query_text,
        "tags": tags,
        "created_at": saved.created_at,
        "updated_at": saved.updated_at,
    }
    return success_envelope(data, req_id)


@router.delete("/saved/{id}")
async def delete_saved_query(
    id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_save_del")
    query = select(SavedQuery).where(SavedQuery.id == id, SavedQuery.user_id == user.id)
    res = await db.execute(query)
    saved = res.scalar_one_or_none()

    if not saved:
        raise NotFoundError("Saved query not found.")

    await db.delete(saved)
    await db.commit()
    return success_envelope({"message": "Saved query deleted."}, req_id)
