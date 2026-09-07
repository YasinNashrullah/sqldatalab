import os
import re
import json
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, Form, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from backend.app.core.config import settings
from backend.app.core.errors import (
    FileTooLargeError,
    FileUnsupportedTypeError,
    NotFoundError,
    AppException,
)
from backend.app.models.base import get_db
from backend.app.models.user import User
from backend.app.models.workspace import Workspace
from backend.app.models.dataset import Dataset, DatasetTable, DatasetColumn
from backend.app.schemas.base import success_envelope
from backend.app.services.csv_sniffer import CSVSniffer
from backend.app.services.duckdb_manager import DuckDBManager
from backend.app.api.deps import get_current_user, verify_workspace_access

router = APIRouter(prefix="/datasets", tags=["Datasets"])

ALLOWED_EXTENSIONS = {".csv", ".tsv", ".txt", ".sql"}


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_datasets(
    request: Request,
    workspace_id: str = Form(...),
    files: list[UploadFile] = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_upload")
    
    # Verify workspace access
    await verify_workspace_access(workspace_id=workspace_id, user=user, db=db)

    # Resolve workspace details for clean structured storage
    ws_res = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace_obj = ws_res.scalar_one_or_none()
    ws_slug = workspace_obj.slug if workspace_obj else workspace_id

    # Create neat, isolated target folder: storage/accounts/<username>/workspaces/<workspace_slug>/datasets
    workspace_dataset_dir = settings.get_workspace_dataset_dir(user.username, ws_slug)

    uploaded_results = []
    errors = []

    for file in files:
        original_name = file.filename or "unknown.csv"
        ext = Path(original_name).suffix.lower()

        if ext not in ALLOWED_EXTENSIONS:
            errors.append({
                "filename": original_name,
                "error": f"Ekstensi '{ext}' tidak didukung. Hanya file CSV, TSV, dan TXT yang didukung.",
            })
            continue

        base_name = Path(original_name).stem
        sanitized_table = re.sub(r"[^a-zA-Z0-9_]", "_", base_name).strip("_").lower()
        if not sanitized_table:
            sanitized_table = f"tbl_{uuid.uuid4().hex[:8]}"

        # Name the file neatly in the user's structured workspace datasets folder
        dest_filename = f"{sanitized_table}{ext}"
        dest_path = workspace_dataset_dir / dest_filename

        # If a file with the same name already exists in this workspace, version it cleanly
        counter = 1
        while dest_path.exists():
            dest_path = workspace_dataset_dir / f"{sanitized_table}_{counter}{ext}"
            counter += 1

        # Stream save directly to structured destination
        total_size = 0
        try:
            with open(dest_path, "wb") as f_out:
                while chunk := await file.read(1024 * 1024):  # 1MB chunks
                    total_size += len(chunk)
                    if total_size > settings.MAX_UPLOAD_SIZE_BYTES:
                        raise FileTooLargeError(f"Ukuran file '{original_name}' melebihi batas maksimal 50MB.")
                    f_out.write(chunk)
        except FileTooLargeError as e:
            if dest_path.exists():
                dest_path.unlink()
            errors.append({
                "filename": original_name,
                "error": str(e),
            })
            continue
        except Exception as e:
            if dest_path.exists():
                dest_path.unlink()
            errors.append({
                "filename": original_name,
                "error": f"Gagal menyimpan file: {str(e)}",
            })
            continue

        # Inspect and sniff schema
        try:
            delimiter, has_header, columns_info, sample_rows = CSVSniffer.inspect_file(dest_path)

            # Register table in DuckDB workspace catalog
            row_count, col_count, duck_cols = DuckDBManager.register_csv_table(
                workspace_id=workspace_id,
                table_name=sanitized_table,
                csv_path=str(dest_path),
                delimiter=delimiter,
                has_header=has_header,
            )

            # Persist dataset record in Application Metadata DB
            dataset_id = str(uuid.uuid4())
            dataset = Dataset(
                id=dataset_id,
                workspace_id=workspace_id,
                name=base_name,
                original_filename=original_name,
                file_type=ext.lstrip("."),
                file_size_bytes=total_size,
                storage_path=str(dest_path),
                processing_status="ready",
            )
            db.add(dataset)

            # Persist table record
            table_id = str(uuid.uuid4())
            table = DatasetTable(
                id=table_id,
                dataset_id=dataset_id,
                table_name=sanitized_table,
                engine_identifier=sanitized_table,
                row_count=row_count,
                column_count=col_count,
            )
            db.add(table)

            # Persist column records
            for idx, col in enumerate(duck_cols):
                samples = []
                for s_row in sample_rows:
                    if idx < len(s_row) and s_row[idx] is not None:
                        samples.append(str(s_row[idx]))
                
                col_record = DatasetColumn(
                    id=str(uuid.uuid4()),
                    table_id=table_id,
                    column_name=col["name"],
                    data_type=col["type"],
                    ordinal_position=idx + 1,
                    is_nullable=True,
                    sample_values_json=json.dumps(samples[:3]),
                )
                db.add(col_record)

            await db.commit()

            uploaded_results.append({
                "dataset_id": dataset_id,
                "table_name": sanitized_table,
                "original_filename": original_name,
                "row_count": row_count,
                "column_count": col_count,
                "columns": duck_cols,
                "sample_rows": sample_rows,
            })

        except Exception as e:
            if staging_path.exists():
                staging_path.unlink()
            errors.append({
                "filename": original_name,
                "error": f"Failed to parse and register table: {str(e)}",
            })

    data = {
        "uploaded": uploaded_results,
        "errors": errors,
        "total_processed": len(files),
        "total_successful": len(uploaded_results),
    }
    return success_envelope(data, req_id)


@router.get("")
async def list_datasets(
    workspace_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_datasets")
    await verify_workspace_access(workspace_id=workspace_id, user=user, db=db)

    # Fetch datasets with tables and columns
    query = select(Dataset).where(Dataset.workspace_id == workspace_id).order_by(Dataset.created_at.desc())
    res = await db.execute(query)
    datasets = res.scalars().all()

    items = []
    for ds in datasets:
        tbl_query = select(DatasetTable).where(DatasetTable.dataset_id == ds.id)
        tbl_res = await db.execute(tbl_query)
        tables = tbl_res.scalars().all()

        tbl_list = []
        for t in tables:
            col_query = select(DatasetColumn).where(DatasetColumn.table_id == t.id).order_by(DatasetColumn.ordinal_position)
            col_res = await db.execute(col_query)
            columns = col_res.scalars().all()

            tbl_list.append({
                "id": t.id,
                "table_name": t.table_name,
                "engine_identifier": t.engine_identifier,
                "row_count": t.row_count,
                "column_count": t.column_count,
                "columns": [
                    {
                        "id": c.id,
                        "column_name": c.column_name,
                        "data_type": c.data_type,
                        "ordinal_position": c.ordinal_position,
                        "is_nullable": c.is_nullable,
                        "sample_values": json.loads(c.sample_values_json) if c.sample_values_json else [],
                    }
                    for c in columns
                ],
            })

        items.append({
            "id": ds.id,
            "workspace_id": ds.workspace_id,
            "name": ds.name,
            "original_filename": ds.original_filename,
            "file_type": ds.file_type,
            "file_size_bytes": ds.file_size_bytes,
            "processing_status": ds.processing_status,
            "error_message": ds.error_message,
            "created_at": ds.created_at,
            "tables": tbl_list,
        })

    return success_envelope({"datasets": items}, req_id)


@router.get("/{dataset_id}/preview")
async def get_dataset_preview(
    dataset_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_preview")
    
    # Fetch dataset
    query = select(Dataset).where(Dataset.id == dataset_id)
    res = await db.execute(query)
    dataset = res.scalar_one_or_none()
    if not dataset:
        raise NotFoundError("Dataset not found.")

    await verify_workspace_access(workspace_id=dataset.workspace_id, user=user, db=db)

    # Get primary table for this dataset
    tbl_query = select(DatasetTable).where(DatasetTable.dataset_id == dataset.id)
    tbl_res = await db.execute(tbl_query)
    table = tbl_res.scalar_one_or_none()
    if not table:
        raise NotFoundError("No registered table found for this dataset.")

    preview_res = DuckDBManager.get_table_preview(
        workspace_id=dataset.workspace_id,
        table_name=table.table_name,
        limit=10,
    )
    return success_envelope(preview_res, req_id)


@router.delete("/{dataset_id}")
async def delete_dataset(
    dataset_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_del_ds")
    
    query = select(Dataset).where(Dataset.id == dataset_id)
    res = await db.execute(query)
    dataset = res.scalar_one_or_none()
    if not dataset:
        raise NotFoundError("Dataset not found.")

    await verify_workspace_access(workspace_id=dataset.workspace_id, user=user, db=db)

    # Drop tables from DuckDB catalog
    tbl_query = select(DatasetTable).where(DatasetTable.dataset_id == dataset.id)
    tbl_res = await db.execute(tbl_query)
    tables = tbl_res.scalars().all()

    try:
        con = DuckDBManager.get_connection(dataset.workspace_id)
        cursor = con.cursor()
        for t in tables:
            try:
                cursor.execute(f'DROP TABLE IF EXISTS "{t.table_name}" CASCADE;')
            except Exception:
                pass
        cursor.close()
    except Exception:
        pass

    # Remove underlying file from filesystem
    if dataset.storage_path and Path(dataset.storage_path).exists():
        try:
            Path(dataset.storage_path).unlink(missing_ok=True)
        except Exception:
            pass

    # Bulk delete dataset metadata records
    table_ids = [t.id for t in tables]
    if table_ids:
        await db.execute(delete(DatasetColumn).where(DatasetColumn.table_id.in_(table_ids)))
        await db.execute(delete(DatasetTable).where(DatasetTable.id.in_(table_ids)))
    await db.execute(delete(Dataset).where(Dataset.id == dataset.id))
    await db.commit()

    return success_envelope({"message": "Dataset and table deleted successfully."}, req_id)
