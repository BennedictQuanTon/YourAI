import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from jinja2 import Environment, FileSystemLoader
from app.core.config import settings

# Setup Jinja2 Template Environment
TEMPLATE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 
    "templates"
)
os.makedirs(TEMPLATE_DIR, exist_ok=True)

class MailService:
    @staticmethod
    def _get_jinja_env():
        return Environment(loader=FileSystemLoader(TEMPLATE_DIR))

    @classmethod
    def render_template(cls, template_name: str, context: dict) -> str:
        """
        Renders Jinja2 HTML email template.
        """
        env = cls._get_jinja_env()
        try:
            template = env.get_template(template_name)
            return template.render(context)
        except Exception:
            # Fallback template if file doesn't exist yet
            if template_name == "custom_template.html":
                return f"""
                <html>
                <body style="font-family: 'Montserrat', sans-serif; background-color: #FAF9F6; padding: 20px; color: #111111;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #EAE6DF; border-radius: 12px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
                        <h2 style="font-family: 'Playfair Display', serif; color: #D4AF37; font-size: 24px; border-bottom: 1px solid #EAE6DF; padding-bottom: 15px; margin-bottom: 25px;">
                            YourAI Premium Executive Notification
                        </h2>
                        <div style="font-size: 16px; line-height: 1.6; color: #1A1A1A;">
                            {context.get('message_content', '')}
                        </div>
                        <p style="font-size: 14px; margin-top: 30px; border-top: 1px solid #EAE6DF; padding-top: 15px; color: #7A7A7A;">
                            Tin nhắn tự động được điều phối bởi hệ thống YourAI v4.0.
                        </p>
                    </div>
                </body>
                </html>
                """
            if template_name == "bulk_mail.html":
                return f"""
                <html>
                <body style="font-family: 'Montserrat', sans-serif; background-color: #FAF9F6; padding: 20px; color: #111111;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #EAE6DF; border-radius: 12px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
                        <h2 style="font-family: 'Playfair Display', serif; color: #D4AF37; font-size: 24px; border-bottom: 1px solid #EAE6DF; padding-bottom: 15px; margin-bottom: 25px;">
                            YourAI Enterprise Notification
                        </h2>
                        <p style="font-size: 16px; line-height: 1.6; color: #1A1A1A;">Kính gửi <strong>{context.get('member_name', 'Thành viên')}</strong>,</p>
                        <p style="font-size: 16px; line-height: 1.6; color: #1A1A1A;">{context.get('message_content', '')}</p>
                        <p style="font-size: 14px; margin-top: 30px; border-top: 1px solid #EAE6DF; padding-top: 15px; color: #7A7A7A;">
                            Tin nhắn tự động được điều phối bởi hệ thống YourAI v4.0.
                        </p>
                    </div>
                </body>
                </html>
                """
            raise

    @classmethod
    def send_email(cls, to_email: str, subject: str, html_content: str) -> bool:
        """
        Sends an email synchronously/blocking using SMTP to Resend.
        In production, this should be executed in the ARQ Background Worker to avoid blocking FastAPI.
        """
        if not settings.EMAIL_HOST_PASSWORD or settings.EMAIL_HOST_PASSWORD == "re_Your_Secure_Resend_API_Key_Here":
            # Mock mode or print in development to avoid crashing if no credentials provided
            print(f"[MOCK EMAIL] To: {to_email} | Subject: {subject}")
            return True

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = to_email

        part = MIMEText(html_content, "html", "utf-8")
        msg.attach(part)

        try:
            with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT) as server:
                server.starttls()
                server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
                server.sendmail(settings.EMAIL_FROM, to_email, msg.as_string())
            return True
        except Exception as e:
            print(f"[EMAIL ERROR] Failed to send email to {to_email}: {e}")
            raise e
