import asyncio
from typing import Any
from arq import create_pool
from app.core.config import settings
from app.worker.main import redis_settings
from app.worker.tasks import send_email_task, send_web_push_task

async def enqueue_background_job(function_name: str, *args: Any, **kwargs: Any):
    """
    Triggers a background job.
    Uses Upstash Redis ARQ queue if available, otherwise executes
    the task asynchronously in the current running loop to ensure
    perfect local operation without external infrastructure dependencies.
    """
    if settings.REDIS_URL and settings.APP_ENV != "development":
        try:
            pool = await create_pool(redis_settings)
            # Enqueue task in Upstash Redis
            job = await pool.enqueue_job(function_name, *args, **kwargs)
            print(f"[TRIGGER] Job '{function_name}' enqueued successfully on Redis. Job ID: {job.job_id}")
            return job.job_id
        except Exception as e:
            print(f"[TRIGGER REDIS ERROR] Failed to enqueue to Redis. Falling back to local execution: {e}")
            
    # Local Async Fallback (Simulating Background Worker in the active loop)
    loop = asyncio.get_running_loop()
    ctx = {'job_id': 'local-mock-id', 'job_try': 1}
    
    if function_name == "send_email_task":
        # Run async fallback
        # args: (to_email, subject, template_name, context)
        loop.create_task(send_email_task(ctx, *args))
        print(f"[TRIGGER FALLBACK] send_email_task executed locally in background thread.")
    elif function_name == "send_web_push_task":
        # args: (user_id, payload)
        loop.create_task(send_web_push_task(ctx, *args))
        print(f"[TRIGGER FALLBACK] send_web_push_task executed locally in background thread.")
        
    return "local-mock-id"
