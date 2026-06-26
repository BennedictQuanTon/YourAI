import sqlite3
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from uuid import uuid4

# 1. SQLite
conn = sqlite3.connect("yourai.db")
cursor = conn.cursor()
cursor.execute("SELECT email, reset_code, reset_code_expires_at FROM users WHERE email = 'bennedictquantonvn@gmail.com'")
sqlite_row = cursor.fetchone()
print("SQLITE USER OTP STATE:")
print(sqlite_row)
conn.close()

# 2. Supabase
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
        result = await conn.execute(text("SELECT email, reset_code, reset_code_expires_at FROM users WHERE email = 'bennedictquantonvn@gmail.com'"))
        row = result.fetchone()
        print("\nSUPABASE USER OTP STATE:")
        print(row)
    await engine.dispose()

asyncio.run(main())
