from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.db.models import User, UserSetting
from app.core.security import get_token_from_request, verify_jwt_token

async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    FastAPI Dependency to authenticate and fetch the current active user.
    Extracts Supabase/Local JWT from HttpOnly cookie or Bearer Authorization header,
    verifies it, and resolves it into a User record in PostgreSQL.
    """
    try:
        token = get_token_from_request(request)
    except HTTPException as e:
        # For development/testing ease, if we are in development mode and no token is present,
        # we can return a default/mock developer account to avoid blocking the client.
        # This is extremely useful for UI/UX visual validation.
        # CRITICAL SECURITY RULE: POST/PUT/DELETE/PATCH mutating operations must NEVER silently fall back
        # to the dev account if a real user's session token is missing. This prevents data misattribution.
        from app.core.config import settings
        if settings.APP_ENV == "development":
            if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
                raise e
            # Find or create local developer account
            result = await db.execute(
                select(User)
                .filter(User.email == "developer@yourai.com")
                .options(selectinload(User.settings))
            )
            dev_user = result.scalars().first()
            if not dev_user:
                dev_user = User(
                    id="dev-user-uuid-12345678", 
                    email="developer@yourai.com", 
                    full_name="Long Quan Ton (Dev)"
                )
                db.add(dev_user)
                await db.flush()
                # Create settings
                settings_record = UserSetting(
                    user_id=dev_user.id, 
                    primary_color_hex="#D4AF37", 
                    border_radius_pt=12,
                    app_border_style="solid"
                )
                db.add(settings_record)
                await db.commit()
                # Reload dev user to populate settings relation
                result = await db.execute(
                    select(User)
                    .filter(User.id == dev_user.id)
                    .options(selectinload(User.settings))
                )
                dev_user = result.scalars().first()
            return dev_user
        raise e

    payload = verify_jwt_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    # Supabase payload subject maps to 'sub'
    user_id = payload.get("sub")
    email = payload.get("email")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid JWT claims.",
        )

    # Query user in local PostgreSQL
    result = await db.execute(
        select(User)
        .filter(User.id == user_id)
        .options(selectinload(User.settings))
    )
    user = result.scalars().first()

    if not user:
        # Sync Supabase user into local DB dynamically on first access
        user = User(id=user_id, email=email or f"user_{user_id[:8]}@yourai.com", full_name=payload.get("user_metadata", {}).get("full_name") or "User")
        db.add(user)
        # Add default settings
        settings_record = UserSetting(
            user_id=user_id, 
            primary_color_hex="#D4AF37", 
            border_radius_pt=12,
            app_border_style="solid"
        )
        db.add(settings_record)
        await db.commit()
        await db.refresh(user)

    return user
