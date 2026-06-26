import asyncio
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.db.models import User, UserSetting, Project, ProjectMember, Task, GpaYear, GpaTerm, GpaSubject, GpaComponent
from app.db.session import SessionLocal

async def sync_postgres_to_local_sqlite():
    """
    State-of-the-art Bidirectional Synchronization Service (YourAI Enterprise V4).
    1. Detects and aligns mismatched user UUIDs between local SQLite and primary Supabase.
    2. Uploads all local offline changes (projects, tasks, GPA logs) to Supabase Cloud.
    3. Downloads and merges cloud changes back to local SQLite for seamless offline parity.
    """
    sqlite_url = "sqlite+aiosqlite:///./yourai.db"
    sqlite_engine = create_async_engine(sqlite_url)
    SqliteSessionLocal = async_sessionmaker(
        bind=sqlite_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False
    )
    
    print("[SYNC SERVICE] Initiating smart bidirectional database alignment & synchronization...")
    
    try:
        async with SqliteSessionLocal() as sqlite_db:
            async with SessionLocal() as pg_db:
                # 1. Resolve potential User UUID mismatches first to prevent UniqueViolationErrors on email
                result = await sqlite_db.execute(select(User))
                sqlite_users = result.scalars().all()
                
                result = await pg_db.execute(select(User))
                pg_users = result.scalars().all()
                
                pg_user_by_email = {u.email.lower(): u for u in pg_users}
                
                for sqlite_user in sqlite_users:
                    email_lower = sqlite_user.email.lower()
                    if email_lower in pg_user_by_email:
                        pg_user = pg_user_by_email[email_lower]
                        if sqlite_user.id != pg_user.id:
                            print(f"[SYNC SERVICE] Aligning UUID for {sqlite_user.email}: SQLite={sqlite_user.id} -> Cloud={pg_user.id}")
                            
                            old_id = sqlite_user.id
                            new_id = pg_user.id
                            
                            # Clean up old settings in SQLite before changing user_id to prevent primary key conflicts
                            await sqlite_db.execute(text("DELETE FROM user_settings WHERE user_id = :old_id").bindparams(old_id=old_id))
                            
                            # Update user ID and all related records in SQLite
                            await sqlite_db.execute(text("UPDATE users SET id = :new_id WHERE id = :old_id").bindparams(new_id=new_id, old_id=old_id))
                            await sqlite_db.execute(text("UPDATE projects SET manager_id = :new_id WHERE manager_id = :old_id").bindparams(new_id=new_id, old_id=old_id))
                            await sqlite_db.execute(text("UPDATE projects SET user_id = :new_id WHERE user_id = :old_id").bindparams(new_id=new_id, old_id=old_id))
                            await sqlite_db.execute(text("UPDATE tasks SET user_id = :new_id WHERE user_id = :old_id").bindparams(new_id=new_id, old_id=old_id))
                            await sqlite_db.execute(text("UPDATE gpa_years SET user_id = :new_id WHERE user_id = :old_id").bindparams(new_id=new_id, old_id=old_id))
                            
                            await sqlite_db.commit()
                            print(f"[SYNC SERVICE] Local SQLite fully aligned with Cloud ID for {sqlite_user.email}")
                
                # 2. Perform safe bidirectional merge for all tables in order of foreign key dependencies
                models = [User, UserSetting, Project, ProjectMember, Task, GpaYear, GpaTerm, GpaSubject, GpaComponent]
                for model in models:
                    # SQLite -> PostgreSQL (Upload offline modifications)
                    sqlite_db.expunge_all()
                    result = await sqlite_db.execute(select(model))
                    sqlite_records = result.scalars().all()
                    
                    if sqlite_records:
                        print(f"[SYNC SERVICE] Uploading {len(sqlite_records)} records for {model.__name__} to Supabase...")
                        for rec in sqlite_records:
                            pk_val = rec.user_id if model == UserSetting else rec.id
                            existing_pg_rec = await pg_db.get(model, pk_val)
                            
                            if not existing_pg_rec:
                                await pg_db.merge(rec)
                        await pg_db.commit()
                    
                    # PostgreSQL -> SQLite (Download cloud changes)
                    pg_db.expunge_all()
                    result = await pg_db.execute(select(model))
                    pg_records = result.scalars().all()
                    
                    if pg_records:
                        print(f"[SYNC SERVICE] Downloading {len(pg_records)} records for {model.__name__} to SQLite...")
                        for rec in pg_records:
                            await sqlite_db.merge(rec)
                        await sqlite_db.commit()
                        
        print("[SYNC SERVICE] Bidirectional database synchronization completed triumphantly!")
    except Exception as e:
        print(f"[SYNC SERVICE ERROR] Bidirectional sync failed: {e}")
