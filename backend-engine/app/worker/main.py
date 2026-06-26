import os
from arq.connections import RedisSettings
from app.core.config import settings
from app.worker.tasks import send_email_task, send_web_push_task

# Parse Redis settings from Upstash REDIS_URL
redis_settings = None
if settings.REDIS_URL:
    try:
        # Standard format rediss://:password@host:port
        # Extract components for arq RedisSettings
        url = settings.REDIS_URL
        if url.startswith("rediss://") or url.startswith("redis://"):
            # Strip protocol
            clean_url = url.split("://")[1]
            # Split auth and host
            if "@" in clean_url:
                auth, host_port = clean_url.split("@")
                password = auth.split(":")[-1] if ":" in auth else auth
            else:
                password = None
                host_port = clean_url
                
            host, port = host_port.split(":")
            if "?" in port:
                port = port.split("?")[0]
            # arq RedisSettings takes host, port, password, ssl
            redis_settings = RedisSettings(
                host=host,
                port=int(port),
                password=password,
                ssl=url.startswith("rediss://")
            )
    except Exception as e:
        print(f"[ARQ CONFIG ERROR] Failed to parse Upstash REDIS_URL: {e}")

if not redis_settings:
    # Local fallback redis
    redis_settings = RedisSettings(host="127.0.0.1", port=6379)

class WorkerSettings:
    functions = [send_email_task, send_web_push_task]
    redis_settings = redis_settings
    
    # Custom startup/shutdown handlers
    async def on_startup(ctx):
        print("[ARQ WORKER] Engine initialized. Listening to job queues...")

    async def on_shutdown(ctx):
        print("[ARQ WORKER] Shutting down. Finalizing jobs...")
