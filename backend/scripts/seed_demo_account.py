import asyncio
import json
import uuid
from pathlib import Path
from datetime import datetime, timezone
import shutil

from backend.app.core.config import settings
from backend.app.core.security import get_password_hash
from backend.app.models.base import AsyncSessionLocal, init_db
from backend.app.models.user import User
from backend.app.models.workspace import Workspace, WorkspaceMember
from backend.app.models.dataset import Dataset, DatasetTable, DatasetColumn
from backend.app.models.query import SavedQuery, QueryHistory
from backend.app.services.duckdb_manager import DuckDBManager
from backend.app.services.csv_sniffer import CSVSniffer
from backend.app.core.config import settings, BASE_DIR
from sqlalchemy import select

SAMPLE_DATA_DIR = BASE_DIR / "sample_data"


async def seed():
    await init_db()
    async with AsyncSessionLocal() as db:
        # Check if analyst_pro exists
        q = select(User).where(User.username == "analyst_pro")
        res = await db.execute(q)
        user = res.scalar_one_or_none()

        if not user:
            user_id = str(uuid.uuid4())
            user = User(
                id=user_id,
                email="analyst@example.com",
                username="analyst_pro",
                full_name="Ahmad Fadillah (Senior Analyst)",
                hashed_password=get_password_hash("Password123!"),
                is_active=True,
                is_demo=True,
            )
            db.add(user)
            await db.commit()
            print("Created user: analyst_pro (analyst@example.com / Password123!)")
        else:
            user.hashed_password = get_password_hash("Password123!")
            user.full_name = "Ahmad Fadillah (Senior Analyst)"
            user.is_demo = True
            await db.commit()
            print("Updated user password: analyst_pro (Password123!)")

        # Check workspace
        ws_query = (
            select(Workspace)
            .join(WorkspaceMember)
            .where(WorkspaceMember.user_id == user.id)
        )
        ws_res = await db.execute(ws_query)
        workspace = ws_res.scalar_one_or_none()

        if not workspace:
            ws_id = str(uuid.uuid4())
            workspace = Workspace(
                id=ws_id,
                name="Sales & Growth Analytics Lab",
                slug="sales-growth-analytics",
                owner_id=user.id,
                storage_path=str(settings.WORKSPACES_DIR / ws_id),
            )
            db.add(workspace)
            await db.flush()

            member = WorkspaceMember(
                id=str(uuid.uuid4()),
                workspace_id=ws_id,
                user_id=user.id,
                role="owner",
            )
            db.add(member)
            await db.commit()
            print(f"Created workspace: {workspace.name} ({workspace.id})")
        else:
            print(f"Using workspace: {workspace.name} ({workspace.id})")

        # Copy sample data to staging and register
        sample_files = ["customers.csv", "orders.csv"]
        for s_file in sample_files:
            src_path = SAMPLE_DATA_DIR / s_file
            if not src_path.exists():
                continue

            # Check if dataset already registered in metadata DB
            ds_check = await db.execute(
                select(Dataset).where(
                    Dataset.workspace_id == workspace.id,
                    Dataset.original_filename == s_file,
                )
            )
            if ds_check.scalar_one_or_none():
                print(f"Dataset already exists in metadata DB: {s_file}")
                continue

            # Neat structured folder: storage/accounts/<username>/workspaces/<workspace_slug>/datasets/
            dest_dir = settings.get_workspace_dataset_dir(user.username, workspace.slug)
            dest_path = dest_dir / s_file
            shutil.copyfile(src_path, dest_path)

            file_size = dest_path.stat().st_size
            delimiter, has_header, cols_info, sample_rows = CSVSniffer.inspect_file(
                dest_path
            )
            table_name = src_path.stem

            # Register in DuckDB
            row_count, col_count, duck_cols = DuckDBManager.register_csv_table(
                workspace_id=workspace.id,
                table_name=table_name,
                csv_path=str(dest_path),
                delimiter=delimiter,
                has_header=has_header,
            )

            # Insert metadata records
            dataset_id = str(uuid.uuid4())
            dataset = Dataset(
                id=dataset_id,
                workspace_id=workspace.id,
                name=table_name.capitalize(),
                original_filename=s_file,
                file_type="csv",
                file_size_bytes=file_size,
                storage_path=str(dest_path),
                processing_status="ready",
            )
            db.add(dataset)

            table_id = str(uuid.uuid4())
            table = DatasetTable(
                id=table_id,
                dataset_id=dataset_id,
                table_name=table_name,
                engine_identifier=table_name,
                row_count=row_count,
                column_count=col_count,
            )
            db.add(table)

            for idx, col in enumerate(duck_cols):
                samples = [
                    str(r[idx])
                    for r in sample_rows
                    if idx < len(r) and r[idx] is not None
                ][:3]
                col_rec = DatasetColumn(
                    id=str(uuid.uuid4()),
                    table_id=table_id,
                    column_name=col["name"],
                    data_type=col["type"],
                    ordinal_position=idx + 1,
                    is_nullable=True,
                    sample_values_json=json.dumps(samples),
                )
                db.add(col_rec)

            await db.commit()
            print(
                f"Registered table '{table_name}' with {row_count} rows in workspace."
            )

        # Seed 1 saved query if empty
        sq_check = await db.execute(
            select(SavedQuery).where(SavedQuery.workspace_id == workspace.id)
        )
        if not sq_check.scalars().first():
            sq = SavedQuery(
                id=str(uuid.uuid4()),
                workspace_id=workspace.id,
                user_id=user.id,
                title="Revenue by Category",
                description="Aggregates total order amounts grouped by product category",
                query_text="SELECT category, SUM(amount) AS total_revenue, COUNT(*) AS order_count FROM orders GROUP BY category ORDER BY total_revenue DESC;",
                tags_json=json.dumps(["sales", "aggregation", "revenue"]),
            )
            db.add(sq)
            await db.commit()
            print("Seeded saved query: Revenue by Category")

        print("=== Seed Completed Successfully ===")


if __name__ == "__main__":
    asyncio.run(seed())
