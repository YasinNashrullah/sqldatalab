import asyncio
import os
import shutil
from pathlib import Path
from sqlalchemy import select
from backend.app.core.config import settings, BASE_DIR
from backend.app.core.security import sanitize_identifier
from backend.app.models.base import AsyncSessionLocal
from backend.app.models.dataset import Dataset
from backend.app.models.workspace import Workspace
from backend.app.models.user import User


async def migrate():
    print("=== STARTING CSV STORAGE RESTRUCTURING & MIGRATION ===")
    async with AsyncSessionLocal() as db:
        stmt = (
            select(Dataset, Workspace, User)
            .join(Workspace, Workspace.id == Dataset.workspace_id)
            .join(User, User.id == Workspace.owner_id)
        )
        res = await db.execute(stmt)
        records = res.all()
        print(f"Found {len(records)} dataset(s) to organize.")

        migrated_count = 0
        for ds, ws, u in records:
            old_path = Path(ds.storage_path) if ds.storage_path else None
            
            # Destination folder: storage/accounts/<username>/workspaces/<workspace_slug>/datasets
            ws_slug = ws.slug or ws.name or ws.id
            target_dir = settings.get_workspace_dataset_dir(u.username, ws_slug)

            # Determine clean filename
            clean_name = sanitize_identifier(ds.name or Path(ds.original_filename).stem, fallback_prefix="tbl")
            ext = Path(ds.original_filename).suffix.lower() or ".csv"
            new_file_path = target_dir / f"{clean_name}{ext}"

            # If moving from staging or existing file
            if old_path and old_path.exists():
                if old_path.resolve() != new_file_path.resolve():
                    shutil.copy2(str(old_path), str(new_file_path))
                    print(f"[OK] Migrated: {old_path.name} -> {new_file_path.relative_to(BASE_DIR)}")
                    # Remove old staging file if it was in staging
                    if settings.STAGING_DIR in old_path.parents or "staging" in str(old_path):
                        try:
                            old_path.unlink()
                        except Exception:
                            pass
            else:
                print(f"[WARN] Old path not found: {old_path}, checking sample_data...")
                sample_file = BASE_DIR / "sample_data" / ds.original_filename
                if sample_file.exists():
                    shutil.copy2(str(sample_file), str(new_file_path))
                    print(f"[OK] Restored from sample_data: {new_file_path.relative_to(BASE_DIR)}")

            # Update database record
            ds.storage_path = str(new_file_path)
            migrated_count += 1

        await db.commit()
        print(f"\nSuccessfully migrated {migrated_count} dataset path(s) in database.")

    # Clean up any leftover files in staging (except .gitkeep)
    for p in settings.STAGING_DIR.iterdir():
        if p.name != ".gitkeep" and p.is_file():
            try:
                p.unlink()
                print(f"[CLEANUP] Removed orphan staging file: {p.name}")
            except Exception:
                pass

    print("=== CSV STORAGE RESTRUCTURING COMPLETE ===")


if __name__ == "__main__":
    asyncio.run(migrate())
