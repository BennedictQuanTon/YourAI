import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Connection string using asyncpg driver for PostgreSQL
DATABASE_URL = "postgresql+asyncpg://postgres:benQuan0912@db.zjtaaucqzisanzmytnqn.supabase.co:5432/postgres"

async def run_migration():
    engine = create_async_engine(DATABASE_URL)
    
    queries = [
        # Alter projects table
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';",
        
        # Alter project_members table
        "ALTER TABLE project_members ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) NULL;",
        
        # Alter tasks table
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(255) NULL;",
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_link VARCHAR(255) NULL;",
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_date TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();",
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_email VARCHAR(255) NULL;"
    ]
    
    async with engine.begin() as conn:
        for q in queries:
            print(f"Running: {q}")
            try:
                await conn.execute(text(q))
                print("Success")
            except Exception as e:
                print(f"Error executing: {e}")
                
    await engine.dispose()
    print("Migration finished!")

if __name__ == "__main__":
    asyncio.run(run_migration())
