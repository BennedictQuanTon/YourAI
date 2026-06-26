import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    APP_ENV: str = Field(default="development")
    PROJECT_NAME: str = Field(default="YourAI")
    SECRET_KEY: str = Field(default="a_very_secure_random_64_character_string_for_testing_purposes_only_1234567")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    FRONTEND_URL: str = Field(default="http://localhost:5173")
    
    TZ: str = "Asia/Ho_Chi_Minh"
    
    # Database & Cache
    DATABASE_URL: str = Field(default="sqlite+aiosqlite:///./yourai.db") # Fallback to sqlite for ease of local testing
    REDIS_URL: Optional[str] = Field(default=None) # Fallback to memory if not set
    
    # Supabase Auth
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    
    # Gemini AI
    GEMINI_API_KEY: Optional[str] = None
    
    # Cloudinary
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None
    
    # Email Resend SMTP
    EMAIL_HOST: str = "smtp.resend.com"
    EMAIL_PORT: int = 587
    EMAIL_HOST_USER: str = "resend"
    EMAIL_HOST_PASSWORD: Optional[str] = None
    EMAIL_FROM: str = "onboarding@resend.dev"
    
    # Web Push Notifications
    VAPID_PUBLIC_KEY: Optional[str] = None
    VAPID_PRIVATE_KEY: Optional[str] = None
    VAPID_CLAIM_EMAIL: str = "mailto:admin@yourai.com"
    
    # Sentry / Telemetry
    SENTRY_DSN: Optional[str] = None
    GRAFANA_LOKI_URL: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
