import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:benQuan0912@db.zjtaaucqzisanzmytnqn.supabase.co:5432/postgres"

async def run_migration():
    engine = create_async_engine(DATABASE_URL)
    
    queries = [
        # Alter project_members table to add role column
        "ALTER TABLE project_members ADD COLUMN IF NOT EXISTS role VARCHAR(100) DEFAULT 'Member' NULL;"
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
    print("Migration V3 finished!")

if __name__ == "__main__":
    asyncio.run(run_migration())
