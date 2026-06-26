import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from uuid import uuid4

db_url = "postgresql+asyncpg://postgres.zjtaaucqzisanzmytnqn:benQuan0912@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"
async def main():
    engine_options = {
        "connect_args": {
            "prepared_statement_cache_size": 0,
            "statement_cache_size": 0,
            "prepared_statement_name_func": lambda: f"__asyncpg_{uuid4().hex}__"
        }
    }
    engine = create_async_engine(db_url, **engine_options)
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT email, reset_code FROM users WHERE reset_code IN ('2570', '5769')"))
        rows = result.fetchall()
        for r in rows:
            print(r)
    await engine.dispose()

asyncio.run(main())
