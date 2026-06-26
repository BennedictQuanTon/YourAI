import asyncio
import sqlite3
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:benQuan0912@db.zjtaaucqzisanzmytnqn.supabase.co:5432/postgres"
SQLITE_DB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "yourai.db")

def migrate_sqlite():
    print(f"[SQLITE] Starting migration for password & OTP in users... Path: {SQLITE_DB}")
    conn = sqlite3.connect(SQLITE_DB)
    cursor = conn.cursor()
    
    columns = [
        ("hashed_password", "VARCHAR(255) NULL"),
        ("reset_code", "VARCHAR(10) NULL"),
        ("reset_code_expires_at", "DATETIME NULL")
    ]
    
    for col_name, col_type in columns:
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type};")
            print(f"[SQLITE] Added column {col_name} successfully.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                print(f"[SQLITE] Column {col_name} already exists.")
            else:
                print(f"[SQLITE] Error adding column {col_name}: {e}")
                
    conn.commit()
    conn.close()
    print("[SQLITE] Migration finished!")

async def migrate_postgres():
    print("[POSTGRES] Starting migration for password & OTP in users...")
    engine = create_async_engine(DATABASE_URL)
    
    queries = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_password VARCHAR(255) NULL;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code VARCHAR(10) NULL;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code_expires_at TIMESTAMP NULL;"
    ]
    
    async with engine.begin() as conn:
        for q in queries:
            print(f"[POSTGRES] Running: {q}")
            try:
                await conn.execute(text(q))
                print("[POSTGRES] Success")
            except Exception as e:
                print(f"[POSTGRES] Error: {e}")
                
    await engine.dispose()
    print("[POSTGRES] Migration finished!")

def main():
    migrate_sqlite()
    try:
        asyncio.run(migrate_postgres())
    except Exception as e:
        print(f"[POSTGRES ERROR] Failed to migrate Postgres: {e}")

if __name__ == "__main__":
    main()
