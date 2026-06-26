import asyncio
import sqlite3
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:benQuan0912@db.zjtaaucqzisanzmytnqn.supabase.co:5432/postgres"
SQLITE_DB = "yourai.db"

def migrate_sqlite():
    print("[SQLITE] Starting migration...")
    conn = sqlite3.connect(SQLITE_DB)
    cursor = conn.cursor()
    
    # List of columns to add to tasks table in SQLite
    columns = [
        ("assigned_to", "VARCHAR(255) NULL"),
        ("project_link", "VARCHAR(255) NULL"),
        ("assigned_date", "DATETIME NULL"),
        ("reminder_email", "VARCHAR(255) NULL"),
        ("location", "VARCHAR(255) NULL"),
        ("is_online", "BOOLEAN DEFAULT 0 NULL"),
        ("additional_info", "TEXT NULL"),
        ("type", "VARCHAR(50) DEFAULT 'chore' NULL")
    ]
    
    for col_name, col_type in columns:
        try:
            cursor.execute(f"ALTER TABLE tasks ADD COLUMN {col_name} {col_type};")
            print(f"[SQLITE] Added column {col_name} successfully.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                print(f"[SQLITE] Column {col_name} already exists.")
            else:
                print(f"[SQLITE] Error adding column {col_name}: {e}")
                
    # Update existing tasks type to 'chore'
    try:
        cursor.execute("UPDATE tasks SET type = 'chore' WHERE type IS NULL;")
        print("[SQLITE] Updated existing tasks type to 'chore'.")
    except Exception as e:
        print(f"[SQLITE] Error updating task types: {e}")
        
    conn.commit()
    conn.close()
    print("[SQLITE] Migration finished!")

async def migrate_postgres():
    print("[POSTGRES] Starting migration...")
    engine = create_async_engine(DATABASE_URL)
    
    queries = [
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(255) NULL;",
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_link VARCHAR(255) NULL;",
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_date TIMESTAMP NULL;",
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_email VARCHAR(255) NULL;",
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS location VARCHAR(255) NULL;",
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE NULL;",
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS additional_info TEXT NULL;",
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'chore' NULL;",
        "UPDATE tasks SET type = 'chore' WHERE type IS NULL;"
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
