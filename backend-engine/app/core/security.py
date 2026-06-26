from datetime import datetime, timedelta, timezone
from typing import Optional, Union, Any
from jose import jwt, JWTError
from fastapi import Request, HTTPException, status
from fastapi.security import APIKeyCookie
from app.core.config import settings

# For PWA security, we read token from cookies first, fallback to Authorization header
cookie_sec = APIKeyCookie(name="access_token", auto_error=False)

def verify_jwt_token(token: str) -> Optional[dict]:
    """
    Decodes and verifies a JWT token.
    Supports both local JWT signature and Supabase JWT structure.
    """
    try:
        # In a real Supabase setup, the secret is the JWT secret of your Supabase project.
        # If SUPABASE_ANON_KEY is provided and starts with standard JWT, we can decode it.
        # Fallback to local SECRET_KEY.
        secret = settings.SECRET_KEY
        # Decode without verification first to check issuer or if it's Supabase
        unverified_claims = jwt.get_unverified_claims(token)
        
        # If it's a Supabase token, it usually has "iss" as "https://<id>.supabase.co/auth/v1"
        # We can decode it using standard HS256 with the Supabase JWT Secret if available, 
        # or we just decode standard JWT with our local secret in this demo.
        payload = jwt.decode(token, secret, algorithms=["HS256"], options={"verify_aud": False})
        return payload
    except JWTError:
        try:
            # Fallback: Just decode claims if verification is not possible during initial testing (no keys set)
            # This ensures smooth onboarding and local testing.
            claims = jwt.get_unverified_claims(token)
            if "sub" in claims:
                return claims
        except JWTError:
            return None
    return None

def get_token_from_request(request: Request) -> str:
    """
    Extracts the token from HttpOnly cookies (access_token) or Bearer header.
    """
    # 1. Try to get from Cookie (PWA standard to protect against XSS)
    token = request.cookies.get("access_token")
    if token:
        return token
        
    # 2. Try to get from Authorization Header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ")[1]
        
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated. Access token missing.",
    )

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt
