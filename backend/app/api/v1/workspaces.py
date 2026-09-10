import uuid
import shutil
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from backend.app.core.config import settings
from backend.app.core.errors import AppException, ForbiddenError
from backend.app.models.base import get_db
from backend.app.models.user import User
from backend.app.models.workspace import Workspace, WorkspaceMember
from backend.app.models.dataset import Dataset, DatasetTable, DatasetColumn
from backend.app.models.query import QueryHistory, SavedQuery
from backend.app.schemas.workspace import (
    WorkspaceCreate,
    WorkspaceUpdate,
    WorkspaceResponse,
)
from backend.app.schemas.base import success_envelope
from backend.app.api.deps import get_current_user, verify_workspace_access
from backend.app.services.duckdb_manager import DuckDBManager

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.get("")
async def list_workspaces(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_ws")

    # Query workspaces owned by user
    query = (
        select(Workspace)
        .where(Workspace.owner_id == user.id)
        .order_by(Workspace.created_at.asc())
    )
    res = await db.execute(query)
    workspaces = res.scalars().all()

    items = []
    for ws in workspaces:
        # Count datasets
        ds_count_res = await db.execute(
            select(func.count(Dataset.id)).where(Dataset.workspace_id == ws.id)
        )
        ds_count = ds_count_res.scalar() or 0

        # Count tables
        tbl_count_res = await db.execute(
            select(func.count(DatasetTable.id))
            .join(Dataset, Dataset.id == DatasetTable.dataset_id)
            .where(Dataset.workspace_id == ws.id)
        )
        tbl_count = tbl_count_res.scalar() or 0

        items.append(
            {
                "id": ws.id,
                "owner_id": ws.owner_id,
                "name": ws.name,
                "slug": ws.slug,
                "description": ws.description,
                "created_at": ws.created_at,
                "dataset_count": ds_count,
                "table_count": tbl_count,
            }
        )

    max_workspaces = 1 if user.is_demo else 3
    return success_envelope(
        {"workspaces": items, "max_workspaces": max_workspaces}, req_id
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_workspace(
    payload: WorkspaceCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_ws")

    max_workspaces = 1 if user.is_demo else 3
    count_res = await db.execute(
        select(func.count(Workspace.id)).where(Workspace.owner_id == user.id)
    )
    current_count = count_res.scalar() or 0
    if current_count >= max_workspaces:
        limit_msg = (
            "Maksimum 1 workspace untuk akun demo"
            if user.is_demo
            else "Maksimum 3 workspace per pengguna"
        )
        raise AppException(
            code="WORKSPACE_LIMIT_EXCEEDED",
            message=f"{limit_msg} telah tercapai. Hapus salah satu workspace terlebih dahulu.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    ws_id = str(uuid.uuid4())
    slug = payload.name.lower().replace(" ", "-")[:40]

    base_slug = slug
    counter = 2
    while True:
        existing = await db.execute(
            select(Workspace).where(
                Workspace.owner_id == user.id, Workspace.slug == slug
            )
        )
        if not existing.scalar_one_or_none():
            break
        slug = f"{base_slug[:37]}-{counter}"
        counter += 1

    duckdb_file = str((settings.WORKSPACES_DIR / ws_id / "analytics.duckdb").resolve())

    workspace = Workspace(
        id=ws_id,
        owner_id=user.id,
        name=payload.name,
        slug=slug,
        description=payload.description,
        duckdb_path=duckdb_file,
    )
    db.add(workspace)

    member = WorkspaceMember(
        id=str(uuid.uuid4()),
        workspace_id=ws_id,
        user_id=user.id,
        role="owner",
    )
    db.add(member)

    await db.commit()
    await db.refresh(workspace)

    data = {
        "id": workspace.id,
        "owner_id": workspace.owner_id,
        "name": workspace.name,
        "slug": workspace.slug,
        "description": workspace.description,
        "created_at": workspace.created_at,
        "dataset_count": 0,
        "table_count": 0,
    }
    return success_envelope({"workspace": data, **data}, req_id)


@router.get("/{workspace_id}")
async def get_workspace(
    workspace_id: str,
    request: Request,
    workspace: Workspace = Depends(verify_workspace_access),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_ws")

    ds_count_res = await db.execute(
        select(func.count(Dataset.id)).where(Dataset.workspace_id == workspace_id)
    )
    ds_count = ds_count_res.scalar() or 0

    tbl_count_res = await db.execute(
        select(func.count(DatasetTable.id))
        .join(Dataset, Dataset.id == DatasetTable.dataset_id)
        .where(Dataset.workspace_id == workspace_id)
    )
    tbl_count = tbl_count_res.scalar() or 0

    data = {
        "id": workspace.id,
        "owner_id": workspace.owner_id,
        "name": workspace.name,
        "slug": workspace.slug,
        "description": workspace.description,
        "created_at": workspace.created_at,
        "dataset_count": ds_count,
        "table_count": tbl_count,
    }
    return success_envelope(data, req_id)


@router.put("/{workspace_id}")
async def update_workspace(
    workspace_id: str,
    payload: WorkspaceUpdate,
    request: Request,
    workspace: Workspace = Depends(verify_workspace_access),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_ws")

    if payload.name is not None:
        workspace.name = payload.name
    if payload.description is not None:
        workspace.description = payload.description

    await db.commit()
    await db.refresh(workspace)

    return success_envelope(
        {
            "message": "Workspace updated successfully.",
            "workspace": {
                "id": workspace.id,
                "name": workspace.name,
                "description": workspace.description,
            },
        },
        req_id,
    )


@router.delete("/{workspace_id}")
async def delete_workspace(
    workspace_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    workspace: Workspace = Depends(verify_workspace_access),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_del_ws")

    # Only owner can delete workspace
    if workspace.owner_id != user.id:
        raise ForbiddenError("Hanya pemilik yang dapat menghapus workspace ini.")

    # User must have at least 1 workspace remaining
    count_res = await db.execute(
        select(func.count(Workspace.id)).where(Workspace.owner_id == user.id)
    )
    total_workspaces = count_res.scalar() or 0
    if total_workspaces <= 1:
        raise AppException(
            code="CANNOT_DELETE_ONLY_WORKSPACE",
            message="Tidak dapat menghapus satu-satunya workspace Anda. Minimal harus memiliki 1 workspace.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    # Close active DuckDB connection
    try:
        DuckDBManager.close_connection(workspace_id)
    except Exception:
        pass

    # Remove workspace directory from filesystem
    ws_dir = settings.WORKSPACES_DIR / workspace_id
    if ws_dir.exists():
        try:
            shutil.rmtree(str(ws_dir), ignore_errors=True)
        except Exception:
            pass

    from backend.app.core.security import sanitize_identifier

    clean_user = sanitize_identifier(user.username, fallback_prefix="user")
    clean_ws = sanitize_identifier(workspace.slug or workspace_id, fallback_prefix="ws")
    account_ws_dir = settings.ACCOUNTS_DIR / clean_user / "workspaces" / clean_ws
    if account_ws_dir.exists():
        try:
            shutil.rmtree(str(account_ws_dir), ignore_errors=True)
        except Exception:
            pass

    # Cascade delete metadata entities from database
    datasets_res = await db.execute(
        select(Dataset.id).where(Dataset.workspace_id == workspace_id)
    )
    ds_ids = [r[0] for r in datasets_res.all()]
    if ds_ids:
        tbl_res = await db.execute(
            select(DatasetTable.id).where(DatasetTable.dataset_id.in_(ds_ids))
        )
        tbl_ids = [r[0] for r in tbl_res.all()]
        if tbl_ids:
            await db.execute(
                delete(DatasetColumn).where(DatasetColumn.table_id.in_(tbl_ids))
            )
            await db.execute(delete(DatasetTable).where(DatasetTable.id.in_(tbl_ids)))
        await db.execute(delete(Dataset).where(Dataset.id.in_(ds_ids)))

    await db.execute(
        delete(QueryHistory).where(QueryHistory.workspace_id == workspace_id)
    )
    await db.execute(delete(SavedQuery).where(SavedQuery.workspace_id == workspace_id))
    await db.execute(
        delete(WorkspaceMember).where(WorkspaceMember.workspace_id == workspace_id)
    )
    await db.execute(delete(Workspace).where(Workspace.id == workspace_id))
    await db.commit()

    return success_envelope({"message": "Workspace berhasil dihapus."}, req_id)
