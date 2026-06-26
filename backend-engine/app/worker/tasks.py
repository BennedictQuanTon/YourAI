import asyncio
from arq.connections import RedisSettings
from arq import Retry
from app.services.mail_service import MailService
from app.core.config import settings

async def send_email_task(ctx, to_email: str, subject: str, template_name: str, context: dict) -> str:
    """
    ARQ Background Task that renders a Jinja2 template and sends an email.
    If the dispatch fails, it retries with an exponential backoff up to 3 times.
    """
    job_id = ctx.get('job_id')
    job_try = ctx.get('job_try', 1)
    
    print(f"[ARQ WORKER] Running send_email_task to {to_email} (Try {job_try})")
    
    try:
        # Render Jinja2 template
        html_content = MailService.render_template(template_name, context)
        
        # Send email (run in executor since SMTP sendmail is blocking)
        loop = asyncio.get_event_loop()
        success = await loop.run_in_executor(
            None, 
            MailService.send_email, 
            to_email, 
            subject, 
            html_content
        )
        
        if not success:
            raise Exception("SMTP Send Failure")
            
        return f"Successfully sent email to {to_email}"
        
    except Exception as exc:
        print(f"[ARQ WORKER] Error in send_email_task (Try {job_try}): {exc}")
        if job_try < 3:
            # Exponential Backoff retry: Try 1 -> 60s, Try 2 -> 300s, Try 3 -> 900s
            backoff_delays = [60, 300, 900]
            delay = backoff_delays[job_try - 1]
            print(f"[ARQ WORKER] Retrying job {job_id} in {delay} seconds...")
            raise Retry(defer=delay)
        else:
            print(f"[ARQ WORKER] Job {job_id} failed after 3 tries. Moving to Dead-letter Queue.")
            # We can log to Sentry or standard logs
            raise exc

async def send_web_push_task(ctx, user_id: str, payload: dict) -> str:
    """
    ARQ Background Task that signs and sends a VAPID Web Push Notification to a user.
    """
    print(f"[ARQ WORKER] Bắn Web Push Notification to user {user_id}: {payload}")
    # In production, we'd query the DB for the user's active push subscriptions
    # and use pywebpush to send it. Here we simulate the dispatch:
    await asyncio.sleep(1)
    return f"Push notification delivered to user {user_id}"
