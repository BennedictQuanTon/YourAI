import asyncio
import sqlite3
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:benQuan0912@db.zjtaaucqzisanzmytnqn.supabase.co:5432/postgres"
SQLITE_DB = "yourai.db"

def migrate_sqlite():
    print("[SQLITE] Starting migration for gpa_scale in user_settings...")
    conn = sqlite3.connect(SQLITE_DB)
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE user_settings ADD COLUMN gpa_scale VARCHAR(10) DEFAULT 'VN';")
        print("[SQLITE] Added column gpa_scale successfully.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
            print("[SQLITE] Column gpa_scale already exists.")
        else:
            print(f"[SQLITE] Error adding column gpa_scale: {e}")
            
    conn.commit()
    conn.close()
    print("[SQLITE] Migration finished!")

async def migrate_postgres():
    print("[POSTGRES] Starting migration for gpa_scale in user_settings...")
    engine = create_async_engine(DATABASE_URL)
    
    queries = [
        "ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS gpa_scale VARCHAR(10) DEFAULT 'VN';"
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
