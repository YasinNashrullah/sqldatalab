import os
import re
import json
import uuid
import shutil
import io
import zipfile
import time
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, Form, Request, status
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from backend.app.core.config import settings
from backend.app.core.errors import (
    FileTooLargeError,
    FileUnsupportedTypeError,
    NotFoundError,
    AppException,
)
from backend.app.models.base import get_db
from backend.app.models.user import User
from backend.app.models.workspace import Workspace, WorkspaceMember
from backend.app.models.dataset import Dataset, DatasetTable, DatasetColumn
from backend.app.schemas.base import success_envelope
from backend.app.services.csv_sniffer import CSVSniffer
from backend.app.services.duckdb_manager import DuckDBManager
from backend.app.services.template_loader import TemplateLoader
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

    content_length = request.headers.get("content-length")
    if content_length:
        try:
            total_size = int(content_length)
            if total_size > settings.MAX_UPLOAD_SIZE_BYTES * len(files):
                raise FileTooLargeError(
                    f"Total upload size exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_BYTES * len(files)} bytes"
                )
        except (ValueError, FileTooLargeError) as e:
            if isinstance(e, FileTooLargeError):
                raise e

    for file in files:
        original_name = file.filename or "unknown.csv"
        ext = Path(original_name).suffix.lower()

        if ext not in ALLOWED_EXTENSIONS:
            errors.append(
                {
                    "filename": original_name,
                    "error": f"Ekstensi '{ext}' tidak didukung. Hanya file CSV, TSV, dan TXT yang didukung.",
                }
            )
            continue

        base_name = Path(original_name).stem
        sanitized_table = re.sub(r"[^a-zA-Z0-9_]", "_", base_name).strip("_").lower()
        if not sanitized_table:
            sanitized_table = f"tbl_{uuid.uuid4().hex[:8]}"

        dest_filename = f"{sanitized_table}{ext}"
        dest_path = workspace_dataset_dir / dest_filename

        try:
            resolved_path = dest_path.resolve()
            resolved_base = workspace_dataset_dir.resolve()
            if not str(resolved_path).startswith(str(resolved_base)):
                raise ValueError("Path traversal attempt detected")
        except (ValueError, OSError):
            errors.append(
                {
                    "filename": original_name,
                    "error": "Invalid file path or path traversal attempt detected",
                }
            )
            continue

        counter = 1
        while dest_path.exists():
            dest_path = workspace_dataset_dir / f"{sanitized_table}_{counter}{ext}"
            try:
                resolved_path = dest_path.resolve()
                if not str(resolved_path).startswith(str(resolved_base)):
                    raise ValueError("Path traversal attempt detected")
            except (ValueError, OSError):
                errors.append(
                    {
                        "filename": original_name,
                        "error": "Invalid file path detected",
                    }
                )
                break
            counter += 1

        # Stream save directly to structured destination
        total_size = 0
        try:
            with open(dest_path, "wb") as f_out:
                while chunk := await file.read(1024 * 1024):  # 1MB chunks
                    total_size += len(chunk)
                    if total_size > settings.MAX_UPLOAD_SIZE_BYTES:
                        raise FileTooLargeError(
                            f"Ukuran file '{original_name}' melebihi batas maksimal 50MB."
                        )
                    f_out.write(chunk)
        except FileTooLargeError as e:
            if dest_path.exists():
                dest_path.unlink()
            errors.append(
                {
                    "filename": original_name,
                    "error": str(e),
                }
            )
            continue
        except Exception as e:
            if dest_path.exists():
                dest_path.unlink()
            errors.append(
                {
                    "filename": original_name,
                    "error": f"Gagal menyimpan file: {str(e)}",
                }
            )
            continue

        # Inspect and sniff schema
        try:
            delimiter, has_header, columns_info, sample_rows = CSVSniffer.inspect_file(
                dest_path
            )

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

            uploaded_results.append(
                {
                    "dataset_id": dataset_id,
                    "table_name": sanitized_table,
                    "original_filename": original_name,
                    "row_count": row_count,
                    "column_count": col_count,
                    "columns": duck_cols,
                    "sample_rows": sample_rows,
                }
            )

        except Exception as e:
            if dest_path.exists():
                dest_path.unlink()
            errors.append(
                {
                    "filename": original_name,
                    "error": f"Failed to parse and register table: {str(e)}",
                }
            )

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

    query = (
        select(Dataset)
        .where(Dataset.workspace_id == workspace_id)
        .order_by(Dataset.created_at.desc())
    )
    res = await db.execute(query)
    datasets = res.scalars().all()

    # Re-register any tables that were lost when the server restarted.
    # DuckDB connections are in-memory between restarts, so CSV tables must be
    # re-registered from the stored file paths on first access.
    restore_candidates = []
    for ds in datasets:
        if not ds.storage_path:
            continue
        tbl_q = select(DatasetTable).where(DatasetTable.dataset_id == ds.id)
        tbl_r = await db.execute(tbl_q)
        for t in tbl_r.scalars().all():
            restore_candidates.append(
                {
                    "table_name": t.table_name,
                    "storage_path": ds.storage_path,
                    "delimiter": ",",
                }
            )
    if restore_candidates:
        try:
            DuckDBManager.restore_workspace_tables(workspace_id, restore_candidates)
        except Exception:
            pass

    items = []
    for ds in datasets:
        tbl_query = select(DatasetTable).where(DatasetTable.dataset_id == ds.id)
        tbl_res = await db.execute(tbl_query)
        tables = tbl_res.scalars().all()

        tbl_list = []
        for t in tables:
            col_query = (
                select(DatasetColumn)
                .where(DatasetColumn.table_id == t.id)
                .order_by(DatasetColumn.ordinal_position)
            )
            col_res = await db.execute(col_query)
            columns = col_res.scalars().all()

            tbl_list.append(
                {
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
                            "sample_values": json.loads(c.sample_values_json)
                            if c.sample_values_json
                            else [],
                        }
                        for c in columns
                    ],
                }
            )

        items.append(
            {
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
            }
        )

    return success_envelope({"datasets": items}, req_id)


@router.get("/{dataset_id}/preview")
async def get_dataset_preview(
    dataset_id: str,
    table_name: str | None = None,
    request: Request = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_id = (
        getattr(request.state, "request_id", "req_preview")
        if request
        else "req_preview"
    )

    # Fetch dataset
    query = select(Dataset).where(Dataset.id == dataset_id)
    res = await db.execute(query)
    dataset = res.scalar_one_or_none()
    if not dataset:
        raise NotFoundError("Dataset not found.")

    await verify_workspace_access(workspace_id=dataset.workspace_id, user=user, db=db)

    # Get target table for this dataset (specific table if table_name provided, else first table)
    tbl_query = select(DatasetTable).where(DatasetTable.dataset_id == dataset.id)
    if table_name:
        tbl_query = tbl_query.where(DatasetTable.table_name == table_name)
    tbl_res = await db.execute(tbl_query)
    table = tbl_res.scalars().first()
    if not table:
        # Fallback to any first table if table_name was slightly mismatched
        fallback_res = await db.execute(
            select(DatasetTable).where(DatasetTable.dataset_id == dataset.id)
        )
        table = fallback_res.scalars().first()
        if not table:
            raise NotFoundError("No registered table found for this dataset.")

    preview_res = DuckDBManager.get_table_preview(
        workspace_id=dataset.workspace_id,
        table_name=table.table_name,
        limit=50,
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

    tbl_query = select(DatasetTable).where(DatasetTable.dataset_id == dataset.id)
    tbl_res = await db.execute(tbl_query)
    tables = tbl_res.scalars().all()

    try:
        con = DuckDBManager.get_connection(dataset.workspace_id)
        for t in tables:
            try:
                con.execute(f'DROP TABLE IF EXISTS "{t.table_name}" CASCADE;')
            except Exception:
                pass
    except Exception:
        pass

    # Remove underlying file or directory from filesystem
    if dataset.storage_path and Path(dataset.storage_path).exists():
        try:
            sp = Path(dataset.storage_path)
            if sp.is_dir():
                shutil.rmtree(sp, ignore_errors=True)
            else:
                sp.unlink(missing_ok=True)
        except Exception:
            pass

    # Bulk delete dataset metadata records
    table_ids = [t.id for t in tables]
    if table_ids:
        await db.execute(
            delete(DatasetColumn).where(DatasetColumn.table_id.in_(table_ids))
        )
        await db.execute(delete(DatasetTable).where(DatasetTable.id.in_(table_ids)))
    await db.execute(delete(Dataset).where(Dataset.id == dataset.id))
    await db.commit()

    return success_envelope(
        {"message": "Dataset and tables deleted successfully."}, req_id
    )


# Dynamic Hierarchical Dataset Templates System (Folder-Based, 1-5 CSVs)

_TEMPLATE_CACHE: list[dict] = []
_LAST_SCAN_TIME: float = 0
_CACHE_TTL_SECONDS = 5.0  # Fast refresh so newly added folders appear immediately


def scan_dataset_templates(force_reload: bool = False) -> list[dict]:
    """
    Dynamically scans sample_data/dataset/ directory recursively.
    Any directory containing manifest.json is treated as a dataset template.
    Supports new structure: manifest.json + schema.sql + README.md
    """
    global _TEMPLATE_CACHE, _LAST_SCAN_TIME
    now = time.time()
    if (
        not force_reload
        and _TEMPLATE_CACHE
        and (now - _LAST_SCAN_TIME < _CACHE_TTL_SECONDS)
    ):
        return _TEMPLATE_CACHE

    root_dir = settings.BASE_DIR / "sample_data" / "dataset"
    if not root_dir.exists():
        _TEMPLATE_CACHE = []
        _LAST_SCAN_TIME = now
        return []

    discovered = []

    for root, dirs, files in os.walk(root_dir):
        if "manifest.json" not in files:
            continue

        dir_path = Path(root)

        manifest = TemplateLoader.load_manifest(dir_path)
        if not manifest:
            continue

        tables_info, sql_content = TemplateLoader.parse_schema_sql(dir_path)
        if not tables_info:
            continue

        try:
            rel_path = dir_path.relative_to(root_dir).as_posix()
        except ValueError:
            continue

        parts = rel_path.split("/")
        category = manifest.get("category", parts[0] if parts else "General")

        title = manifest.get(
            "title", parts[-1].replace("_", " ").replace("-", " ").title()
        )

        tpl_id = re.sub(
            r"[^a-zA-Z0-9_]", "_", rel_path.lower().replace("/", "__").replace("-", "_")
        ).strip("_")

        total_rows = sum(t.get("row_count", 0) for t in tables_info)

        sample_query = TemplateLoader.generate_sample_query(tables_info, manifest)

        readme_content = TemplateLoader.load_readme(dir_path)
        description = manifest.get(
            "description",
            f"Paket dataset {category} ({title}) dengan {len(tables_info)} tabel relasional.",
        )

        for table in tables_info:
            table["filename"] = f"{table['table_name']}.sql"
            table["file_size_bytes"] = len(sql_content)
            table["columns"] = [col["name"] for col in table.get("columns", [])]

        discovered.append(
            {
                "id": tpl_id,
                "name": title,
                "category": category,
                "folder_path": rel_path,
                "dir_path": str(dir_path),
                "description": description,
                "total_tables": len(tables_info),
                "total_rows": total_rows,
                "tables": tables_info,
                "sample_query": sample_query,
                "has_readme": bool(readme_content),
                "manifest": manifest,
            }
        )

    discovered.sort(key=lambda x: (x["category"].lower(), x["name"].lower()))
    _TEMPLATE_CACHE = discovered
    _LAST_SCAN_TIME = now
    return discovered


class UseTemplateRequest(BaseModel):
    template_id: str
    workspace_name: str | None = None


@router.get("/templates")
async def list_dataset_templates(
    request: Request,
    user: User = Depends(get_current_user),
):
    """Returns the dynamically scanned catalog of dataset templates with multi-table support."""
    req_id = getattr(request.state, "request_id", "req_tpl_list")
    templates = scan_dataset_templates()
    return success_envelope({"templates": templates, "total": len(templates)}, req_id)


@router.get("/templates/{template_id}/download")
async def download_template_dataset(
    template_id: str,
    file: str | None = None,
    user: User = Depends(get_current_user),
):
    """
    Downloads the dataset template.
    - If 'file' parameter is given: downloads that specific file (schema.sql, manifest.json, or README.md).
    - Otherwise: creates and streams a .zip archive containing all template files.
    """
    templates = scan_dataset_templates()
    template = next((t for t in templates if t["id"] == template_id), None)
    if not template:
        raise NotFoundError(f"Template dataset '{template_id}' tidak ditemukan.")

    folder = Path(template["dir_path"])
    if not folder.exists():
        raise NotFoundError("Folder dataset template tidak ditemukan di server.")

    schema_sql = folder / "schema.sql"
    manifest_json = folder / "manifest.json"
    readme_md = folder / "README.md"

    if not schema_sql.exists() or not manifest_json.exists():
        raise NotFoundError(
            "File template tidak lengkap (schema.sql atau manifest.json hilang)."
        )

    # 1. If specific file requested
    if file:
        target = folder / file
        try:
            target = target.resolve()
            folder_resolved = folder.resolve()
            if not target.is_relative_to(folder_resolved):
                raise NotFoundError(f"File '{file}' tidak ditemukan dalam dataset ini.")
        except (ValueError, OSError):
            raise NotFoundError(f"File '{file}' tidak ditemukan dalam dataset ini.")

        if not target.exists():
            raise NotFoundError(f"File '{file}' tidak ditemukan dalam dataset ini.")

        allowed_files = {"schema.sql", "manifest.json", "README.md"}
        if target.name not in allowed_files:
            raise NotFoundError(f"File '{file}' tidak tersedia untuk download.")

        media_type = (
            "application/sql"
            if target.suffix == ".sql"
            else "application/json"
            if target.suffix == ".json"
            else "text/markdown"
        )
        return FileResponse(
            path=str(target),
            filename=target.name,
            media_type=media_type,
        )

    # 2. No specific file -> zip all template files
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.write(schema_sql, arcname="schema.sql")
        zip_file.write(manifest_json, arcname="manifest.json")
        if readme_md.exists():
            zip_file.write(readme_md, arcname="README.md")

    zip_buffer.seek(0)
    zip_filename = f"{template['id']}_dataset.zip"

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{zip_filename}"'},
    )


@router.post("/templates/use", status_code=status.HTTP_201_CREATED)
async def use_dataset_template(
    payload: UseTemplateRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new workspace automatically and executes schema.sql from the selected
    dataset template to import tables into DuckDB.
    Enforces the maximum 3 workspaces per user limit.
    """
    req_id = getattr(request.state, "request_id", "req_tpl_use")

    # Enforce workspace quota
    count_res = await db.execute(
        select(func.count(Workspace.id)).where(Workspace.owner_id == user.id)
    )
    current_count = count_res.scalar() or 0
    if current_count >= 3:
        raise AppException(
            code="WORKSPACE_LIMIT_EXCEEDED",
            message="Maksimum 3 workspace per pengguna telah tercapai. Hapus salah satu workspace terlebih dahulu sebelum membuat workspace baru dari template.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    templates = scan_dataset_templates()
    template = next((t for t in templates if t["id"] == payload.template_id), None)
    if not template:
        raise NotFoundError(
            f"Template dataset '{payload.template_id}' tidak ditemukan."
        )

    folder = Path(template["dir_path"])
    if not folder.exists():
        raise NotFoundError("Folder dataset template tidak ditemukan di server.")

    schema_sql_path = folder / "schema.sql"
    if not schema_sql_path.exists():
        raise NotFoundError(
            "File schema.sql tidak ditemukan di dalam folder dataset ini."
        )

    tables_info, sql_content = TemplateLoader.parse_schema_sql(folder)
    if not tables_info:
        raise NotFoundError("Tidak ada tabel yang ditemukan dalam schema.sql.")

    # 1. Create workspace
    ws_id = str(uuid.uuid4())
    ws_name = payload.workspace_name or template["name"]
    clean_slug = re.sub(r"[^a-zA-Z0-9_]", "-", template["id"]).lower()[:30]
    slug = f"{clean_slug}-{ws_id[:6]}"
    duckdb_file = str((settings.WORKSPACES_DIR / ws_id / "analytics.duckdb").resolve())

    workspace = Workspace(
        id=ws_id,
        owner_id=user.id,
        name=ws_name,
        slug=slug,
        description=f"Workspace analitik dibuat otomatis dari template {template['name']} ({len(tables_info)} tabel).",
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
    await db.flush()

    # 2. Workspace dataset target folder
    target_dir = settings.get_workspace_dataset_dir(user.username, slug)

    # 3. Copy schema.sql to workspace storage
    target_schema = target_dir / "schema.sql"
    shutil.copy2(schema_sql_path, target_schema)

    # 4. Create ONE parent Dataset record representing the dataset folder
    dataset_id = str(uuid.uuid4())
    dataset = Dataset(
        id=dataset_id,
        workspace_id=ws_id,
        name=template["name"],
        original_filename=template.get("folder_path", template["name"]),
        file_type="sql",
        file_size_bytes=schema_sql_path.stat().st_size
        if schema_sql_path.exists()
        else 0,
        storage_path=str(target_dir),
        processing_status="ready",
    )
    db.add(dataset)

    imported_tables = []
    total_imported_rows = 0

    # Execute schema.sql statements into the new DuckDB workspace
    try:
        con = DuckDBManager.get_connection(ws_id)
        statements = [s.strip() for s in sql_content.split(";") if s.strip()]
        for stmt in statements:
            lines = [l for l in stmt.splitlines() if not l.strip().startswith("--")]
            cleaned = "\n".join(lines).strip()
            if not cleaned:
                continue
            try:
                con.execute(cleaned)
            except Exception as stmt_err:
                err_lower = str(stmt_err).lower()
                if any(
                    x in err_lower
                    for x in ("already exists", "duplicate", "constraint")
                ):
                    continue
                raise AppException(
                    code="SQL_EXECUTION_ERROR",
                    message=f"Gagal mengeksekusi statement SQL: {str(stmt_err)[:300]}",
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
    except AppException:
        raise
    except Exception as e:
        raise AppException(
            code="SQL_EXECUTION_ERROR",
            message=f"Gagal mengeksekusi schema.sql: {str(e)}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Load CSV data files dari folder data/ sesuai urutan tables di schema
    data_dir = folder / "data"
    if data_dir.exists():
        for tbl_info in tables_info:
            table_name = tbl_info["table_name"]
            csv_file = data_dir / f"{table_name}.csv"
            if not csv_file.exists():
                continue
            safe_csv_path = str(csv_file.resolve()).replace("\\", "/")
            try:
                con.execute(f"""
                    INSERT INTO "{table_name}"
                    SELECT * FROM read_csv('{safe_csv_path}',
                        auto_detect=true,
                        header=true,
                        ignore_errors=false
                    )
                """)
            except Exception as csv_err:
                error_msg = str(csv_err).lower()
                if "conversion error" in error_msg or "could not convert" in error_msg:
                    try:
                        con.execute(f"""
                            INSERT INTO "{table_name}"
                            SELECT * FROM read_csv('{safe_csv_path}',
                                all_varchar=1,
                                header=true
                            )
                        """)
                    except Exception:
                        raise AppException(
                            code="CSV_LOAD_ERROR",
                            message=f"Gagal memuat data '{csv_file.name}': Type mismatch antara schema dan CSV data.",
                            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        )
                else:
                    raise AppException(
                        code="CSV_LOAD_ERROR",
                        message=f"Gagal memuat data '{csv_file.name}': {str(csv_err)[:200]}",
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

    # Query actual row and column metadata from DuckDB for each imported table
    for tbl in tables_info:
        table_name = tbl["table_name"]
        duck_cols = []
        row_count = 0

        try:
            con = DuckDBManager.get_connection(ws_id)
            row_count = (
                con.execute(f'SELECT COUNT(*) FROM "{table_name}"').fetchone()[0] or 0
            )
            desc_rows = con.execute(f'DESCRIBE "{table_name}"').fetchall()
            duck_cols = [{"name": r[0], "type": r[1]} for r in desc_rows]
        except Exception:
            duck_cols = [
                {"name": c["name"], "type": c.get("type", "VARCHAR")}
                for c in tbl.get("columns", [])
            ]

        col_count = len(duck_cols)
        total_imported_rows += row_count

        table_id = str(uuid.uuid4())
        dataset_table = DatasetTable(
            id=table_id,
            dataset_id=dataset_id,
            table_name=table_name,
            engine_identifier=table_name,
            row_count=row_count,
            column_count=col_count,
        )
        db.add(dataset_table)

        for idx, col in enumerate(duck_cols):
            db.add(
                DatasetColumn(
                    id=str(uuid.uuid4()),
                    table_id=table_id,
                    column_name=col["name"],
                    data_type=col["type"],
                    ordinal_position=idx + 1,
                )
            )

        imported_tables.append(
            {
                "table_name": table_name,
                "filename": "schema.sql",
                "row_count": row_count,
                "column_count": col_count,
            }
        )

    await db.commit()
    await db.refresh(workspace)

    workspace_data = {
        "id": workspace.id,
        "owner_id": workspace.owner_id,
        "name": workspace.name,
        "slug": workspace.slug,
        "description": workspace.description,
        "created_at": workspace.created_at,
        "dataset_count": 1,
        "table_count": len(imported_tables),
    }

    return success_envelope(
        {
            "workspace": workspace_data,
            "workspace_id": workspace.id,
            "workspace_name": workspace.name,
            "tables": imported_tables,
            "table_name": imported_tables[0]["table_name"]
            if imported_tables
            else "data",
            "row_count": total_imported_rows,
            "column_count": len(imported_tables),
            "sample_query": template["sample_query"],
            "suggested_query": template["sample_query"],
            "message": f"Workspace '{ws_name}' berhasil dibuat dengan {len(imported_tables)} tabel ({', '.join(t['table_name'] for t in imported_tables)})!",
        },
        req_id,
    )
