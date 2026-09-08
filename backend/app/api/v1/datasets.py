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
    table_name: str | None = None,
    request: Request = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_preview") if request else "req_preview"
    
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
        fallback_res = await db.execute(select(DatasetTable).where(DatasetTable.dataset_id == dataset.id))
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
        await db.execute(delete(DatasetColumn).where(DatasetColumn.table_id.in_(table_ids)))
        await db.execute(delete(DatasetTable).where(DatasetTable.id.in_(table_ids)))
    await db.execute(delete(Dataset).where(Dataset.id == dataset.id))
    await db.commit()

    return success_envelope({"message": "Dataset and tables deleted successfully."}, req_id)


# ==============================================================================
# 🌟 DYNAMIC HIERARCHICAL DATASET TEMPLATES SYSTEM (Folder-Based, 1-5 CSVs)
# ==============================================================================

_TEMPLATE_CACHE: list[dict] = []
_LAST_SCAN_TIME: float = 0
_CACHE_TTL_SECONDS = 5.0  # Fast refresh so newly added folders appear immediately


def scan_dataset_templates(force_reload: bool = False) -> list[dict]:
    """
    Dynamically scans sample_data/dataset/ directory recursively.
    Any directory directly containing .csv files is treated as a dataset package.
    Supports 1 to 5 CSV files per dataset folder.
    """
    global _TEMPLATE_CACHE, _LAST_SCAN_TIME
    now = time.time()
    if not force_reload and _TEMPLATE_CACHE and (now - _LAST_SCAN_TIME < _CACHE_TTL_SECONDS):
        return _TEMPLATE_CACHE

    root_dir = settings.BASE_DIR / "sample_data" / "dataset"
    if not root_dir.exists():
        _TEMPLATE_CACHE = []
        _LAST_SCAN_TIME = now
        return []

    discovered = []

    for root, dirs, files in os.walk(root_dir):
        csv_files = [f for f in files if f.lower().endswith(".csv")]
        if not csv_files:
            continue

        dir_path = Path(root)
        try:
            rel_path = dir_path.relative_to(root_dir).as_posix()
        except ValueError:
            continue

        parts = rel_path.split("/")
        if len(parts) >= 2:
            category = parts[0]
            subfolder = "/".join(parts[1:])
            title = f"{category} - {subfolder.replace('_', ' ').replace('-', ' ').title()}"
        else:
            category = "General"
            subfolder = parts[0]
            title = parts[0].replace("_", " ").replace("-", " ").title()

        # URL-safe unique ID
        tpl_id = re.sub(r"[^a-zA-Z0-9_]", "_", rel_path.lower().replace("/", "__").replace("-", "_")).strip("_")

        tables_info = []
        total_rows = 0

        for cf in sorted(csv_files):
            fpath = dir_path / cf
            tbl_name = re.sub(r"[^a-zA-Z0-9_]", "_", fpath.stem.lower()).strip("_")
            if not tbl_name:
                tbl_name = f"tbl_{len(tables_info) + 1}"

            cols = []
            row_count = 0
            try:
                with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                    first_line = f.readline()
                    if first_line:
                        cols = [c.strip().strip('"').strip("'") for c in first_line.split(",") if c.strip()]
                    for _ in f:
                        row_count += 1
            except Exception:
                pass

            total_rows += row_count
            tables_info.append({
                "table_name": tbl_name,
                "filename": cf,
                "row_count": row_count,
                "column_count": len(cols),
                "columns": cols,
                "file_size_bytes": fpath.stat().st_size if fpath.exists() else 0,
            })

        table_names = [t["table_name"] for t in tables_info]
        if "orders" in table_names and "customers" in table_names and "products" in table_names:
            suggested_query = "SELECT o.order_id, c.customer_name, p.product_name, o.quantity, o.total_amount, o.order_status FROM orders o JOIN customers c ON o.customer_id = c.customer_id JOIN products p ON o.product_id = p.product_id LIMIT 10;"
        elif "orders" in table_names and "customers" in table_names:
            suggested_query = "SELECT o.order_id, c.customer_name, o.total_amount, o.order_status FROM orders o JOIN customers c ON o.customer_id = c.customer_id LIMIT 10;"
        elif "transactions" in table_names and "accounts" in table_names and "merchants" in table_names:
            suggested_query = "SELECT t.transaction_id, a.customer_name, m.merchant_name, t.amount_idr, t.status FROM transactions t JOIN accounts a ON t.account_id = a.account_id JOIN merchants m ON t.merchant_id = m.merchant_id LIMIT 10;"
        elif "transactions" in table_names and "accounts" in table_names:
            suggested_query = "SELECT t.transaction_id, a.customer_name, a.account_type, t.amount_idr, t.status FROM transactions t JOIN accounts a ON t.account_id = a.account_id LIMIT 10;"
        elif "admissions" in table_names and "patients" in table_names and "doctors" in table_names:
            suggested_query = "SELECT a.admission_id, p.full_name AS patient_name, d.doctor_name, a.diagnosis, a.total_cost_idr FROM admissions a JOIN patients p ON a.patient_id = p.patient_id JOIN doctors d ON a.doctor_id = d.doctor_id LIMIT 10;"
        elif "admissions" in table_names and "patients" in table_names:
            suggested_query = "SELECT a.admission_id, p.full_name, a.diagnosis, a.total_cost_idr FROM admissions a JOIN patients p ON a.patient_id = p.patient_id LIMIT 10;"
        elif "employees" in table_names and "departments" in table_names and "salaries" in table_names:
            suggested_query = "SELECT e.full_name, d.department_name, e.job_title, s.net_salary_idr, e.performance_score FROM employees e JOIN departments d ON e.department_id = d.department_id JOIN salaries s ON e.employee_id = s.employee_id LIMIT 10;"
        elif "employees" in table_names and "departments" in table_names:
            suggested_query = "SELECT e.full_name, e.job_title, d.department_name, e.performance_score FROM employees e JOIN departments d ON e.department_id = d.department_id LIMIT 10;"
        elif "shipments" in table_names and "carriers" in table_names and "warehouses" in table_names:
            suggested_query = "SELECT s.tracking_no, c.carrier_name, w.hub_name AS origin_hub, s.weight_kg, s.shipping_cost_idr, s.delivery_status FROM shipments s JOIN carriers c ON s.carrier_id = c.carrier_id JOIN warehouses w ON s.origin_hub_id = w.hub_id LIMIT 10;"
        elif "shipments" in table_names and "carriers" in table_names:
            suggested_query = "SELECT s.tracking_no, c.carrier_name, s.weight_kg, s.shipping_cost_idr, s.delivery_status FROM shipments s JOIN carriers c ON s.carrier_id = c.carrier_id LIMIT 10;"
        elif "enrollments" in table_names and "students" in table_names and "courses" in table_names:
            suggested_query = "SELECT s.student_name, c.course_name, e.academic_term, e.final_grade, e.attendance_pct FROM enrollments e JOIN students s ON e.student_id = s.student_id JOIN courses c ON e.course_id = c.course_id LIMIT 10;"
        elif "enrollments" in table_names and "students" in table_names:
            suggested_query = "SELECT s.student_name, e.academic_term, e.final_grade, e.attendance_pct FROM enrollments e JOIN students s ON e.student_id = s.student_id LIMIT 10;"
        elif "inventory" in table_names and "products" in table_names and "suppliers" in table_names:
            suggested_query = "SELECT p.product_name, s.supplier_name, i.current_stock, i.reorder_point, i.stock_status FROM inventory i JOIN products p ON i.sku = p.sku JOIN suppliers s ON i.supplier_id = s.supplier_id LIMIT 10;"
        elif "inventory" in table_names and "products" in table_names:
            suggested_query = "SELECT p.product_name, p.category, i.current_stock, i.reorder_point, i.stock_status FROM inventory i JOIN products p ON i.sku = p.sku LIMIT 10;"
        elif "bookings" in table_names and "guests" in table_names and "rooms" in table_names:
            suggested_query = "SELECT b.booking_id, g.full_name AS guest_name, r.room_number, r.room_type, b.checkin_date, b.total_price_idr FROM bookings b JOIN guests g ON b.guest_id = g.guest_id JOIN rooms r ON b.room_id = r.room_id LIMIT 10;"
        elif "bookings" in table_names and "guests" in table_names:
            suggested_query = "SELECT b.booking_id, g.full_name, b.checkin_date, b.nights_stayed, b.total_price_idr FROM bookings b JOIN guests g ON b.guest_id = g.guest_id LIMIT 10;"
        elif "subscriptions" in table_names and "plans" in table_names and "invoices" in table_names:
            suggested_query = "SELECT s.company_name, p.plan_name, inv.amount_usd, inv.payment_status FROM subscriptions s JOIN plans p ON s.plan_id = p.plan_id JOIN invoices inv ON s.subscription_id = inv.subscription_id LIMIT 10;"
        elif "subscriptions" in table_names and "plans" in table_names:
            suggested_query = "SELECT s.company_name, p.plan_name, s.seats_purchased, s.status FROM subscriptions s JOIN plans p ON s.plan_id = p.plan_id LIMIT 10;"
        elif "churn_records" in table_names and "customers" in table_names:
            suggested_query = "SELECT c.customer_name, c.city, r.contract_type, r.monthly_charges_idr, r.has_churned FROM churn_records r JOIN customers c ON r.customer_id = c.customer_id LIMIT 10;"
        elif len(tables_info) >= 2:
            # Dynamic FK relation detection for ANY custom folder
            found_join = None
            for t_src in tables_info:
                src_tbl = t_src["table_name"]
                for t_tgt in tables_info:
                    if t_tgt["table_name"] == src_tbl:
                        continue
                    tgt_tbl = t_tgt["table_name"]
                    tgt_cols_map = {c.lower(): c for c in t_tgt["columns"]}
                    for sc in t_src["columns"]:
                        sc_l = sc.lower()
                        if sc_l in tgt_cols_map and (sc_l.endswith("_id") or sc_l in ("id", "sku", "code", "key", "no")):
                            tc = tgt_cols_map[sc_l]
                            found_join = f'SELECT a.*, b.* FROM "{src_tbl}" a JOIN "{tgt_tbl}" b ON a."{sc}" = b."{tc}" LIMIT 10;'
                            break
                    if found_join:
                        break
                if found_join:
                    break
            suggested_query = found_join or f'SELECT * FROM "{tables_info[0]["table_name"]}" LIMIT 10;'
        elif tables_info:
            suggested_query = f'SELECT * FROM "{tables_info[0]["table_name"]}" LIMIT 10;'
        else:
            suggested_query = "SELECT 1;"

        table_list_str = ", ".join(t["table_name"] for t in tables_info)
        description = f"Paket dataset {category} ({title}) yang memuat {len(tables_info)} tabel relasional ({table_list_str}) dengan total {total_rows} baris data."

        discovered.append({
            "id": tpl_id,
            "name": title,
            "category": category,
            "folder_path": rel_path,
            "dir_path": str(dir_path),
            "description": description,
            "total_tables": len(tables_info),
            "total_rows": total_rows,
            "tables": tables_info,
            "sample_query": suggested_query,
        })

    discovered.sort(key=lambda x: (x["category"].lower(), x["name"].lower()))
    _TEMPLATE_CACHE = discovered
    _LAST_SCAN_TIME = now
    return discovered


class UseTemplateRequest(BaseModel):
    template_id: str
    workspace_name: str | None = None


@router.get("/templates")
async def list_dataset_templates(request: Request):
    """Returns the dynamically scanned catalog of dataset templates with multi-table support."""
    req_id = getattr(request.state, "request_id", "req_tpl_list")
    templates = scan_dataset_templates()
    return success_envelope({"templates": templates, "total": len(templates)}, req_id)


@router.get("/templates/{template_id}/download")
async def download_template_dataset(template_id: str, file: str | None = None):
    """
    Downloads the dataset template.
    - If 'file' parameter is given: downloads that specific CSV file.
    - If multiple CSVs in folder: creates and streams a .zip archive containing all CSVs.
    - If exactly 1 CSV in folder: downloads the CSV directly.
    """
    templates = scan_dataset_templates()
    template = next((t for t in templates if t["id"] == template_id), None)
    if not template:
        raise NotFoundError(f"Template dataset '{template_id}' tidak ditemukan.")

    folder = Path(template["dir_path"])
    if not folder.exists():
        raise NotFoundError("Folder dataset template tidak ditemukan di server.")

    csv_files = sorted(list(folder.glob("*.csv")))
    if not csv_files:
        raise NotFoundError("Tidak ada file CSV di dalam folder dataset ini.")

    # 1. If specific file requested
    if file:
        target = folder / file
        if not target.exists() or target.suffix.lower() != ".csv":
            raise NotFoundError(f"File '{file}' tidak ditemukan dalam dataset ini.")
        return FileResponse(
            path=str(target),
            filename=target.name,
            media_type="text/csv",
        )

    # 2. If only 1 CSV file in dataset
    if len(csv_files) == 1:
        return FileResponse(
            path=str(csv_files[0]),
            filename=csv_files[0].name,
            media_type="text/csv",
        )

    # 3. Multiple CSV files -> zip them together
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for cf in csv_files:
            zip_file.write(cf, arcname=cf.name)

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
    Creates a new workspace automatically and imports ALL CSV files in the selected
    dataset template folder into DuckDB as separate tables.
    Enforces the maximum 3 workspaces per user limit.
    """
    req_id = getattr(request.state, "request_id", "req_tpl_use")

    # Enforce workspace quota
    count_res = await db.execute(select(func.count(Workspace.id)).where(Workspace.owner_id == user.id))
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
        raise NotFoundError(f"Template dataset '{payload.template_id}' tidak ditemukan.")

    folder = Path(template["dir_path"])
    if not folder.exists():
        raise NotFoundError("Folder dataset template tidak ditemukan di server.")

    csv_files = sorted(list(folder.glob("*.csv")))
    if not csv_files:
        raise NotFoundError("Tidak ada file CSV di dalam folder dataset ini.")

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
        description=f"Workspace analitik dibuat otomatis dari template {template['name']} ({len(csv_files)} tabel).",
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

    # 3. Create ONE parent Dataset record representing the dataset folder
    dataset_id = str(uuid.uuid4())
    total_size = sum((cf.stat().st_size if cf.exists() else 0) for cf in csv_files)
    dataset = Dataset(
        id=dataset_id,
        workspace_id=ws_id,
        name=template["name"],
        original_filename=template.get("folder_path", template["name"]),
        file_type="csv",
        file_size_bytes=total_size,
        storage_path=str(target_dir),
        processing_status="ready",
    )
    db.add(dataset)

    imported_tables = []
    total_imported_rows = 0

    # 4. Loop through EACH CSV file in the dataset folder (1-5 files)
    for cf in csv_files:
        target_path = target_dir / cf.name
        shutil.copy2(cf, target_path)

        # Inspect schema using CSVSniffer
        try:
            delimiter, has_header, columns_info, sample_rows = CSVSniffer.inspect_file(target_path)
        except Exception:
            delimiter = ","
            has_header = True
            columns_info = []
            sample_rows = []

        table_name = re.sub(r"[^a-zA-Z0-9_]", "_", cf.stem.lower()).strip("_")
        if not table_name:
            table_name = f"table_{uuid.uuid4().hex[:6]}"

        # Register table in DuckDB
        row_count, col_count, duck_cols = DuckDBManager.register_csv_table(
            workspace_id=ws_id,
            table_name=table_name,
            csv_path=str(target_path),
            delimiter=delimiter,
            has_header=has_header,
        )
        total_imported_rows += row_count

        # Associate DatasetTable with the parent dataset
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
            col_id = str(uuid.uuid4())
            col_record = DatasetColumn(
                id=col_id,
                table_id=table_id,
                column_name=col["name"],
                data_type=col["type"],
                ordinal_position=idx + 1,
            )
            db.add(col_record)

        imported_tables.append({
            "table_name": table_name,
            "filename": cf.name,
            "row_count": row_count,
            "column_count": col_count,
        })

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
            "table_name": imported_tables[0]["table_name"] if imported_tables else "data",
            "row_count": total_imported_rows,
            "column_count": len(imported_tables),
            "sample_query": template["sample_query"],
            "suggested_query": template["sample_query"],
            "message": f"Workspace '{ws_name}' berhasil dibuat dengan {len(imported_tables)} tabel ({', '.join(t['table_name'] for t in imported_tables)})!",
        },
        req_id,
    )
