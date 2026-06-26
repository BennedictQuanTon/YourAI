import asyncio
import os
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.services.mail_service import MailService

async def main():
    print(f"EMAIL_HOST: {settings.EMAIL_HOST}")
    print(f"EMAIL_PORT: {settings.EMAIL_PORT}")
    print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
    print(f"EMAIL_FROM: {settings.EMAIL_FROM}")
    
    target_email = "tonlongquanvn@gmail.com"
    subject = "YourAI SMTP Resend Test Email"
    html_content = "<h1>YourAI Connection Test</h1><p>If you see this, Resend SMTP is working perfectly!</p>"
    
    print("\n--- Trying to send with current settings ---")
    try:
        success = MailService.send_email(target_email, subject, html_content)
        print(f"Result: {success}")
    except Exception as e:
        print(f"Error occurred: {e}")

if __name__ == "__main__":
    asyncio.run(main())
