import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine, Base
from app.api.v1 import auth, tasks, projects, gpa, agent

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="YourAI Enterprise Monorepo Lõi FastAPI + AI Agent",
    version="4.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Set up CORS middleware with production-grade security
origins = [
    settings.FRONTEND_URL,
    "http://localhost:5173", # standard Vite local dev port
    "http://127.0.0.1:5173",
    "http://localhost:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect Routers under API v1
app.include_router(auth.router, prefix="/api/v1")
app.include_router(tasks.router, prefix="/api/v1")
app.include_router(projects.router, prefix="/api/v1")
app.include_router(gpa.router, prefix="/api/v1")
app.include_router(agent.router, prefix="/api/v1")

@app.on_event("startup")
async def startup_event():
    print("[SYSTEM STARTUP] Initializing database tables...")
    from sqlalchemy import text
    try:
        # Asyncpg database initialization
        async with engine.begin() as conn:
            # Create all tables if they don't exist
            await conn.run_sync(Base.metadata.create_all)
            
            # Database migration upgrade for gpa_terms start_date and end_date
            try:
                await conn.execute(text("ALTER TABLE gpa_terms ADD COLUMN start_date VARCHAR(50)"))
            except Exception:
                pass
            try:
                await conn.execute(text("ALTER TABLE gpa_terms ADD COLUMN end_date VARCHAR(50)"))
            except Exception:
                pass
                
        print("[SYSTEM STARTUP] Database tables configured successfully on primary database!")
        
        # Trigger background data synchronization from PostgreSQL (Supabase) to local SQLite
        import asyncio
        from app.services.sync_service import sync_postgres_to_local_sqlite
        asyncio.create_task(sync_postgres_to_local_sqlite())
        
    except Exception as e:
        print(f"[DATABASE WARNING] Failed to connect to primary database: {e}")
        print("[DATABASE FALLBACK] Re-routing all connections to local SQLite: yourai.db")
        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
        import app.db.session
        
        sqlite_url = "sqlite+aiosqlite:///./yourai.db"
        fallback_engine = create_async_engine(sqlite_url)
        app.db.session.engine = fallback_engine
        app.db.session.SessionLocal = async_sessionmaker(
            bind=fallback_engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False
        )
        async with fallback_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            # Database migration upgrade for fallback SQLite
            try:
                await conn.execute(text("ALTER TABLE gpa_terms ADD COLUMN start_date VARCHAR(50)"))
            except Exception:
                pass
            try:
                await conn.execute(text("ALTER TABLE gpa_terms ADD COLUMN end_date VARCHAR(50)"))
            except Exception:
                pass
        print("[DATABASE FALLBACK] SQLite database initialized successfully!")
    print(f"[SYSTEM STARTUP] {settings.PROJECT_NAME} Engine running in environment: {settings.APP_ENV}")

@app.get("/")
def read_root():
    return {
        "status": "online", 
        "project": settings.PROJECT_NAME, 
        "version": "4.0.0 (Enterprise Edition)"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
