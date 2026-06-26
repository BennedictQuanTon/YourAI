import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:benQuan0912@db.zjtaaucqzisanzmytnqn.supabase.co:5432/postgres"

async def run_migration():
    engine = create_async_engine(DATABASE_URL)
    
    queries = [
        # Alter users table to add avatar and bio columns for persistent multi-user storage
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT NULL;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS bio VARCHAR(500) NULL;"
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
    print("Migration V2 finished!")

if __name__ == "__main__":
    asyncio.run(run_migration())
