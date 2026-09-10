import asyncio
from sqlalchemy import text
from backend.app.models.base import AsyncSessionLocal, init_db


async def migrate():
    print("=== Running Migration: Add is_demo to users table ===")

    await init_db()

    async with AsyncSessionLocal() as db:
        try:
            await db.execute(
                text(
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE"
                )
            )

            result = await db.execute(
                text("UPDATE users SET is_demo = TRUE WHERE username = 'analyst_pro'")
            )

            await db.commit()

            print(f"✓ Added is_demo column to users table")
            print(f"✓ Updated {result.rowcount} demo account(s)")

            verify = await db.execute(
                text("SELECT username, email, is_demo FROM users")
            )
            rows = verify.fetchall()

            print("\nCurrent users:")
            for row in rows:
                demo_label = " [DEMO]" if row[2] else ""
                print(f"  - {row[0]} ({row[1]}){demo_label}")

            print("\n=== Migration Completed Successfully ===")

        except Exception as e:
            print(f"✗ Migration failed: {e}")
            await db.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(migrate())
