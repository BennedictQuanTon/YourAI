from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta, timezone
import bcrypt
import re
import random
from app.db.session import get_db
from app.db.models import User, UserSetting
from app.schemas.schemas import UserLoginRequest, UserRegisterRequest, Token, UserResponse, UserProfileUpdate
from app.core.security import create_access_token
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def validate_password_complexity(password: str) -> bool:
    """
    Validates that a password has:
    - At least 8 characters
    - At least 1 number
    - At least 1 special character
    """
    if len(password) < 8:
        return False
    if not re.search(r"[0-9]", password):
        return False
    if not re.search(r"[^a-zA-Z0-9]", password):
        return False
    return True

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(payload: UserRegisterRequest, db: AsyncSession = Depends(get_db)):
    payload.email = payload.email.strip().lower()
    # Validate password complexity
    if not validate_password_complexity(payload.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu phải có ít nhất 8 ký tự, bao gồm ít nhất 1 chữ số và 1 ký tự đặc biệt."
        )
        
    # Check if user already exists
    result = await db.execute(select(User).filter(User.email == payload.email))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
        
    user = User(
        email=payload.email,
        full_name=payload.full_name or payload.email.split("@")[0].capitalize(),
        hashed_password=hash_password(payload.password)
    )
    db.add(user)
    await db.flush()
    
    # Store dynamic password mock or standard settings
    settings_record = UserSetting(
        user_id=user.id,
        primary_color_hex="#D4AF37",
        border_radius_pt=12,
        app_border_style="solid"
    )
    db.add(settings_record)
    await db.commit()
    # Re-fetch with selectinload to ensure settings are eagerly loaded in the async session
    result = await db.execute(
        select(User)
        .filter(User.id == user.id)
        .options(selectinload(User.settings))
    )
    user = result.scalars().first()
    return user

@router.post("/login", response_model=Token)
async def login_user(payload: UserLoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    """
    Standard Auth endpoint. Logs in user, creates JWT token,
    and sets HttpOnly, Secure, SameSite=Strict cookie for PWA security.
    """
    payload.email = payload.email.strip().lower()
    result = await db.execute(select(User).filter(User.email == payload.email))
    user = result.scalars().first()
    
    # Smart Auto-registration / Claims for testing/development
    if not user:
        if not validate_password_complexity(payload.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mật khẩu phải có ít nhất 8 ký tự, bao gồm ít nhất 1 chữ số và 1 ký tự đặc biệt."
            )
        # Auto-register developer
        user = User(
            email=payload.email,
            full_name=payload.email.split("@")[0].capitalize(),
            hashed_password=hash_password(payload.password)
        )
        db.add(user)
        await db.flush()
        settings_record = UserSetting(
            user_id=user.id,
            primary_color_hex="#D4AF37",
            border_radius_pt=12,
            app_border_style="solid"
        )
        db.add(settings_record)
        await db.commit()
        # Re-fetch with selectinload to ensure settings are eagerly loaded in the async session
        result = await db.execute(
            select(User)
            .filter(User.id == user.id)
            .options(selectinload(User.settings))
        )
        user = result.scalars().first()
    else:
        # Existing user - verify password with Smart Lazy Upgrades
        is_valid = False
        
        if not user.hashed_password:
            # Legacy account without password - claim and set password on first login
            if validate_password_complexity(payload.password):
                user.hashed_password = hash_password(payload.password)
                await db.commit()
                is_valid = True
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Tài khoản cũ cần thiết lập mật khẩu bảo mật mới. Mật khẩu phải có ít nhất 8 ký tự, 1 chữ số và 1 ký tự đặc biệt."
                )
        else:
            # Try standard bcrypt verification
            try:
                if verify_password(payload.password, user.hashed_password):
                    is_valid = True
            except Exception:
                # Bcrypt verification failed (might be legacy plain text format)
                pass
            
            # Smart plain text check to auto-migrate legacy plain text passwords in DB
            if not is_valid and payload.password == user.hashed_password:
                user.hashed_password = hash_password(payload.password)
                await db.commit()
                is_valid = True
                
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Sai tài khoản hoặc mật khẩu."
            )

    # Issue JWT Token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id, "email": user.email}, 
        expires_delta=access_token_expires
    )
    
    # Set secure HttpOnly cookie for PWA security (prevents XSS)
    is_secure = False if settings.APP_ENV == "development" else True
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax" if settings.APP_ENV == "development" else "strict",
        secure=is_secure
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

from app.api.dependencies.dependencies import get_current_user

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/profile", response_model=UserResponse)
async def update_profile(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update profile details (full_name, bio, avatar) persistently in the database.
    """
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.bio is not None:
        current_user.bio = payload.bio
    if payload.avatar is not None:
        current_user.avatar = payload.avatar
    if payload.gpa_scale is not None:
        if not current_user.settings:
            current_user.settings = UserSetting(user_id=current_user.id)
        current_user.settings.gpa_scale = payload.gpa_scale
        
    await db.commit()
    # Re-fetch with selectinload to ensure settings are eagerly loaded in the async session
    result = await db.execute(
        select(User)
        .filter(User.id == current_user.id)
        .options(selectinload(User.settings))
    )
    current_user = result.scalars().first()
    return current_user

@router.post("/logout")
async def logout_user(response: Response):
    """
    Clear access token from HttpOnly cookies.
    """
    is_secure = False if settings.APP_ENV == "development" else True
    response.delete_cookie(
        key="access_token",
        httponly=True,
        samesite="lax" if settings.APP_ENV == "development" else "strict",
        secure=is_secure
    )
    return {"status": "success", "message": "Successfully logged out and cleared secure cookies."}

from app.schemas.schemas import ForgotPasswordRequest, ResetPasswordRequest, VerifyResetCodeRequest
from app.worker.trigger import enqueue_background_job

@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """
    Password reset initiation. Generates a 4-digit reset code and
    schedules a luxury notification email in the background queue.
    """
    payload.email = payload.email.strip().lower()
    result = await db.execute(select(User).filter(User.email == payload.email))
    user = result.scalars().first()
    
    # In development mode, auto-create the user if they don't exist in local SQLite to facilitate seamless testing
    if not user and settings.APP_ENV == "development":
        user = User(
            email=payload.email,
            full_name=payload.email.split("@")[0].capitalize(),
            hashed_password=hash_password("DefaultSecuredPwd123!")
        )
        db.add(user)
        await db.flush()
        
        # Also create default settings
        settings_record = UserSetting(
            user_id=user.id,
            primary_color_hex="#D4AF37",
            border_radius_pt=12,
            app_border_style="solid"
        )
        db.add(settings_record)
        await db.commit()
        
    if not user:
        return {"status": "success", "message": "Nếu email tồn tại trên hệ thống, mã khôi phục đã được gửi đi."}
        
    # Rate Limit Check: Max 1 password reset every 3 days (Bypassed in development mode for seamless testing)
    if user.last_password_reset_at and settings.APP_ENV != "development":
        time_since_reset = datetime.utcnow() - user.last_password_reset_at
        if time_since_reset < timedelta(days=3):
            # Calculate remaining time
            remaining = timedelta(days=3) - time_since_reset
            days_left = remaining.days
            hours_left = remaining.seconds // 3600
            minutes_left = (remaining.seconds % 3600) // 60
            
            time_str = ""
            if days_left > 0:
                time_str += f"{days_left} ngày "
            if hours_left > 0:
                time_str += f"{hours_left} giờ "
            time_str += f"{minutes_left} phút"
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ngài chỉ được đặt lại mật khẩu tối đa 1 lần mỗi 3 ngày. Vui lòng quay lại sau {time_str}."
            )
        
    reset_code = f"{random.randint(1000, 9999)}"
    user.reset_code = reset_code
    user.reset_code_expires_at = datetime.utcnow() + timedelta(minutes=5)
    await db.commit()
    
    await enqueue_background_job(
        "send_email_task",
        user.email,
        "Mã xác nhận khôi phục mật khẩu tài khoản YourAI",
        "bulk_mail.html",
        {
            "member_name": user.full_name or user.email.split("@")[0].capitalize(),
            "message_content": f"Chúng tôi đã tiếp nhận yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng nhập mã xác minh gồm 4 chữ số dưới đây để tiếp tục. Mã xác nhận của ngài là: {reset_code}",
            "action_url": f"{settings.FRONTEND_URL}/reset-password"
        }
    )
    
    return {
        "status": "success", 
        "message": "Mã khôi phục 4 chữ số đã được điều phối gửi tới email của ngài."
    }

@router.post("/verify-otp")
async def verify_otp(payload: VerifyResetCodeRequest, db: AsyncSession = Depends(get_db)):
    """
    Verify the 4-digit OTP code before proceeding to password reset.
    """
    payload.email = payload.email.strip().lower()
    result = await db.execute(select(User).filter(User.email == payload.email))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy email trên hệ thống."
        )
    if not user.reset_code or user.reset_code != payload.token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã xác nhận 4 chữ số không chính xác."
        )
        
    if not user.reset_code_expires_at or user.reset_code_expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã xác nhận đã hết hạn. Vui lòng yêu cầu mã mới."
        )
        
    return {"status": "success", "message": "Mã xác nhận chính xác! Ngài có thể đặt lại mật khẩu mới."}

@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """
    Confirm password reset with the 4-digit OTP reset code and validation.
    """
    payload.email = payload.email.strip().lower()
    result = await db.execute(select(User).filter(User.email == payload.email))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy email trên hệ thống."
        )
        
    if not user.reset_code or user.reset_code != payload.token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã xác nhận 4 chữ số không chính xác."
        )
        
    if not user.reset_code_expires_at or user.reset_code_expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã xác nhận đã hết hạn. Vui lòng yêu cầu mã mới."
        )
        
    # Validate complexity
    if not validate_password_complexity(payload.new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm ít nhất 1 chữ số và 1 ký tự đặc biệt."
        )
        
    # Commit password update and clear code
    user.hashed_password = hash_password(payload.new_password)
    user.reset_code = None
    user.reset_code_expires_at = None
    user.last_password_reset_at = datetime.utcnow()
    await db.commit()
    
    return {"status": "success", "message": "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới."}
