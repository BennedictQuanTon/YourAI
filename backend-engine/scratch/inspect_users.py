import asyncio
import os
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.future import select
from app.db.session import SessionLocal
from app.db.models import User, UserSetting

async def main():
    async with SessionLocal() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        print(f"Total users in DB: {len(users)}")
        for u in users:
            print(f"- ID: {u.id} | Email: {u.email} | Name: {u.full_name}")
            # Get settings
            sett_res = await db.execute(select(UserSetting).filter(UserSetting.user_id == u.id))
            sett = sett_res.scalars().first()
            if sett:
                print(f"  Settings - Scale: {sett.gpa_scale} | Color: {sett.primary_color_hex}")
            else:
                print("  Settings - None")

if __name__ == "__main__":
    asyncio.run(main())
