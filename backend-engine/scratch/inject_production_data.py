import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select
import sys
from datetime import datetime
sys.path.append('backend-engine')
from app.db.models import User, UserSetting, Task, Project, ProjectMember, Base
from app.api.v1.auth import hash_password

async def main():
    # Use the correct path of the database in backend-engine/yourai.db
    sqlite_url = "sqlite+aiosqlite:///./backend-engine/yourai.db"
    engine = create_async_engine(sqlite_url)
    
    print("[BOOTSTRAP] Initializing database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    
    print("[BOOTSTRAP] Injecting production users, settings, projects, members, and tasks...")
    
    users_data = [
        {
            "id": "8db4f9ce-7224-44dc-b254-c84d38c5c3a1",
            "email": "tonlongquanvn@gmail.com",
            "full_name": "Long Quan Ton",
            "bio": "AI Engineer và là nhà Phát triển",
            "avatar": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
        },
        {
            "id": "c3e38d8d-c8d7-4aaf-9c01-9b3d873e8ac7",
            "email": "bennedictquantonvn@gmail.com",
            "full_name": "bennedictquanton",
            "bio": None,
            "avatar": None
        },
        {
            "id": "5da29e32-8c55-4cec-8306-6791cd629b8c",
            "email": "alice@yourai.com",
            "full_name": "Alice Wonderland (High Class Student)",
            "bio": None,
            "avatar": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        },
        {
            "id": "3a8cfcd8-f6ec-4f76-8428-95d4a45e65d3",
            "email": "bob@yourai.com",
            "full_name": "Bob Builder",
            "bio": None,
            "avatar": None
        },
        {
            "id": "04ed5891-a7f4-496c-a7a9-8369d6ebb7a2",
            "email": "khoa_remember@hcmut.edu.vn",
            "full_name": "Khoa Remember",
            "bio": None,
            "avatar": None
        },
        {
            "id": "dev-user-uuid-12345678",
            "email": "developer@yourai.com",
            "full_name": "Long Quan Ton (Dev)",
            "bio": None,
            "avatar": None
        }
    ]
    
    async with SessionLocal() as db:
        # 1. Inject Users & UserSettings
        for u in users_data:
            result = await db.execute(select(User).filter(User.id == u["id"]))
            user = result.scalars().first()
            if not user:
                # Clean up existing record by email if needed
                email_result = await db.execute(select(User).filter(User.email == u["email"]))
                existing_email_user = email_result.scalars().first()
                if existing_email_user:
                    # Clean up related records
                    await db.execute(select(UserSetting).filter(UserSetting.user_id == existing_email_user.id))
                    await db.delete(existing_email_user)
                    await db.flush()
                
                user = User(
                    id=u["id"],
                    email=u["email"],
                    full_name=u["full_name"],
                    bio=u["bio"],
                    avatar=u["avatar"],
                    hashed_password=hash_password("DefaultSecuredPwd123!")
                )
                db.add(user)
                await db.flush()
                print(f"Created user: {u['email']} (ID: {u['id']})")
            else:
                user.email = u["email"]
                user.full_name = u["full_name"]
                user.bio = u["bio"]
                user.avatar = u["avatar"]
                print(f"Updated user: {u['email']} (ID: {u['id']})")
                
            # Ensure UserSetting exists
            settings_result = await db.execute(select(UserSetting).filter(UserSetting.user_id == u["id"]))
            settings_record = settings_result.scalars().first()
            if not settings_record:
                settings_record = UserSetting(
                    user_id=u["id"],
                    primary_color_hex="#D4AF37",
                    border_radius_pt=12,
                    app_border_style="solid"
                )
                db.add(settings_record)
        
        await db.commit()
        
        # 2. Inject Projects
        projects_data = [
            {
                "id": "3ab6e0b3-5519-4449-87ca-a4308e0343e",
                "manager_id": "8db4f9ce-7224-44dc-b254-c84d38c5c3a1", # tonlongquanvn@gmail.com
                "title": "Bach Khoa Innovation 2026",
                "status": "active",
                "timeline_start": datetime(2026, 3, 10),
                "timeline_end": datetime(2026, 9, 10)
            },
            {
                "id": "6d15cf7b-3dca-4706-ac37-36c9ab0e1df",
                "manager_id": "5da29e32-8c55-4cec-8306-6791cd629b8c", # alice@yourai.com
                "title": "Dự án BKAi Admissions Assistant V3",
                "status": "active",
                "timeline_start": datetime(2026, 5, 24),
                "timeline_end": datetime(2026, 6, 30, 23, 59, 59)
            },
            {
                "id": "8c913680-5395-4cd6-951c-3812a4891ab3",
                "manager_id": "8db4f9ce-7224-44dc-b254-c84d38c5c3a1", # tonlongquanvn@gmail.com
                "title": "YourAI",
                "status": "active",
                "timeline_start": datetime(2026, 5, 20),
                "timeline_end": datetime(2026, 6, 20)
            },
            {
                "id": "b6b239ad-c181-45b7-bc11-c38967cd2a6a",
                "manager_id": "5da29e32-8c55-4cec-8306-6791cd629b8c", # alice@yourai.com
                "title": "Dự án BKAi Admissions Assistant V3",
                "status": "active",
                "timeline_start": datetime(2026, 5, 24),
                "timeline_end": datetime(2026, 6, 30, 23, 59, 59)
            },
            {
                "id": "d75dbfb9-09eb-4147-96f6-556007615cc",
                "manager_id": "8db4f9ce-7224-44dc-b254-c84d38c5c3a1", # tonlongquanvn@gmail.com
                "title": "BKAi",
                "status": "active",
                "timeline_start": datetime(2026, 3, 20),
                "timeline_end": datetime(2026, 5, 31)
            }
        ]
        
        for p in projects_data:
            result = await db.execute(select(Project).filter(Project.id == p["id"]))
            proj = result.scalars().first()
            if not proj:
                proj = Project(
                    id=p["id"],
                    manager_id=p["manager_id"],
                    user_id=p["manager_id"],
                    title=p["title"],
                    status=p["status"],
                    timeline_start=p["timeline_start"],
                    timeline_end=p["timeline_end"]
                )
                db.add(proj)
                print(f"Created project: {p['title']} (ID: {p['id']})")
            else:
                proj.manager_id = p["manager_id"]
                proj.user_id = p["manager_id"]
                proj.title = p["title"]
                proj.status = p["status"]
                proj.timeline_start = p["timeline_start"]
                proj.timeline_end = p["timeline_end"]
                print(f"Updated project: {p['title']} (ID: {p['id']})")
        
        await db.commit()
        
        # 3. Inject Project Members
        members_data = [
            {
                "id": "m1",
                "project_id": "6d15cf7b-3dca-4706-ac37-36c9ab0e1df",
                "email": "alice@yourai.com",
                "full_name": "Alice Wonderland",
                "status": "active",
                "role": "Manager"
            },
            {
                "id": "m2",
                "project_id": "3ab6e0b3-5519-4449-87ca-a4308e0343e",
                "email": "tonlongquanvn@gmail.com",
                "full_name": "Long Quan Ton",
                "status": "active",
                "role": "Manager"
            },
            {
                "id": "m3",
                "project_id": "6d15cf7b-3dca-4706-ac37-36c9ab0e1df",
                "email": "bob@yourai.com",
                "full_name": "Bob Builder",
                "status": "pending",
                "role": "Member"
            },
            {
                "id": "m4",
                "project_id": "b6b239ad-c181-45b7-bc11-c38967cd2a6a",
                "email": "bob@yourai.com",
                "full_name": "Bob Builder",
                "status": "pending",
                "role": "Member"
            },
            {
                "id": "m5",
                "project_id": "d75dbfb9-09eb-4147-96f6-556007615cc",
                "email": "tonlongquanvn@gmail.com",
                "full_name": "Long Quan Ton",
                "status": "active",
                "role": "Manager"
            },
            {
                "id": "m6",
                "project_id": "8c913680-5395-4cd6-951c-3812a4891ab3",
                "email": "tonlongquanvn@gmail.com",
                "full_name": "Long Quan Ton",
                "status": "active",
                "role": "Manager"
            },
            {
                "id": "m7",
                "project_id": "b6b239ad-c181-45b7-bc11-c38967cd2a6a",
                "email": "alice@yourai.com",
                "full_name": "Alice Wonderland",
                "status": "active",
                "role": "Manager"
            }
        ]
        
        for m in members_data:
            result = await db.execute(select(ProjectMember).filter(ProjectMember.id == m["id"]))
            memb = result.scalars().first()
            if not memb:
                memb = ProjectMember(
                    id=m["id"],
                    project_id=m["project_id"],
                    email=m["email"],
                    full_name=m["full_name"],
                    status=m["status"],
                    role=m["role"]
                )
                db.add(memb)
                print(f"Created member: {m['email']} in project {m['project_id']}")
            else:
                memb.project_id = m["project_id"]
                memb.email = m["email"]
                memb.full_name = m["full_name"]
                memb.status = m["status"]
                memb.role = m["role"]
                print(f"Updated member: {m['email']} in project {m['project_id']}")
                
        await db.commit()
        
        # 4. Inject Tasks
        tasks_data = [
            {
                "id": "t1-bki-meeting",
                "user_id": "8db4f9ce-7224-44dc-b254-c84d38c5c3a1", # tonlongquanvn@gmail.com
                "title": "Họp BKI",
                "status": "todo",
                "type": "chore",
                "project_id": "3ab6e0b3-5519-4449-87ca-a4308e0343e"
            },
            {
                "id": "t2-bki-discussion",
                "user_id": "5da29e32-8c55-4cec-8306-6791cd629b8c", # alice@yourai.com
                "title": "Họp BKI Thảo luận Chiến dịch Tuyển sinh",
                "status": "todo",
                "type": "chore",
                "project_id": "6d15cf7b-3dca-4706-ac37-36c9ab0e1df"
            },
            {
                "id": "t3-assignment-uts",
                "user_id": "5da29e32-8c55-4cec-8306-6791cd629b8c", # alice@yourai.com
                "title": "Nộp Assignment 2 UTS Systems Architecture",
                "status": "todo",
                "type": "project",
                "project_id": "6d15cf7b-3dca-4706-ac37-36c9ab0e1df"
            },
            {
                "id": "t4-bob-wc",
                "user_id": "3a8cfcd8-f6ec-4f76-8428-95d4a45e65d3", # bob@yourai.com
                "title": "Bob sửa nhà vệ sinh tầng 2",
                "status": "todo",
                "type": "chore",
                "project_id": None
            }
        ]
        
        for t in tasks_data:
            result = await db.execute(select(Task).filter(Task.id == t["id"]))
            task = result.scalars().first()
            if not task:
                task = Task(
                    id=t["id"],
                    user_id=t["user_id"],
                    project_id=t["project_id"],
                    title=t["title"],
                    status=t["status"],
                    type=t["type"],
                    energy_cost=5
                )
                db.add(task)
                print(f"Created task: {t['title']}")
            else:
                task.user_id = t["user_id"]
                task.project_id = t["project_id"]
                task.title = t["title"]
                task.status = t["status"]
                print(f"Updated task: {t['title']}")
                
        await db.commit()
        print("[BOOTSTRAP] Injection completed successfully!")

if __name__ == "__main__":
    asyncio.run(main())
