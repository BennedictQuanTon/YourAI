import time
from fastapi import Request, HTTPException, status
from app.core.config import settings

# Global in-memory storage for rate limits if Redis is not configured
_memory_buckets = {}

async def check_rate_limit(request: Request, key: str, max_tokens: int, refill_time_sec: float) -> bool:
    """
    Implements Token Bucket algorithm using Redis if available, 
    falling back to thread-safe in-memory cache in development.
    - Public login: 5 reqs/min -> max_tokens=5, refill_time=60s
    - AI Agent: 20 reqs/10 mins -> max_tokens=20, refill_time=600s
    - Bulk mail: 1 req/30 mins -> max_tokens=1, refill_time=1800s
    """
    # 1. Try with Redis if configured
    if settings.REDIS_URL:
        try:
            # We can lazily import redis to avoid crashes
            import redis
            # Parse settings or connect
            r = redis.from_url(settings.REDIS_URL)
            
            # Redis Token Bucket logic using script or transaction
            pipe = r.pipeline()
            now = time.time()
            bucket_key = f"rate:{key}"
            
            # Get current bucket state
            pipe.hget(bucket_key, "tokens")
            pipe.hget(bucket_key, "last_update")
            res = pipe.execute()
            
            tokens = float(res[0]) if res[0] is not None else float(max_tokens)
            last_update = float(res[1]) if res[1] is not None else now
            
            # Refill tokens
            elapsed = now - last_update
            refill_rate = max_tokens / refill_time_sec
            tokens = min(float(max_tokens), tokens + elapsed * refill_rate)
            
            if tokens >= 1.0:
                tokens -= 1.0
                # Update bucket state
                pipe.hset(bucket_key, "tokens", tokens)
                pipe.hset(bucket_key, "last_update", now)
                pipe.execute()
                return True
            else:
                return False
        except Exception as e:
            print(f"[RATE LIMIT REDIS ERROR] Falling back to memory: {e}")
            
    # 2. In-memory fallback
    now = time.time()
    bucket = _memory_buckets.get(key)
    if not bucket:
        bucket = {"tokens": float(max_tokens), "last_update": now}
        _memory_buckets[key] = bucket
        
    # Refill
    elapsed = now - bucket["last_update"]
    refill_rate = max_tokens / refill_time_sec
    tokens = min(float(max_tokens), bucket["tokens"] + elapsed * refill_rate)
    
    if tokens >= 1.0:
        bucket["tokens"] = tokens - 1.0
        bucket["last_update"] = now
        return True
    else:
        return False

async def rate_limiter(request: Request, limit_type: str, identifier: str):
    """
    FastAPI Helper to check rate limits. Throws HTTP 429 if limit exceeded.
    """
    key = f"{limit_type}:{identifier}"
    
    # Configure buckets
    if limit_type == "public":
        max_tokens = 5
        refill_time = 60.0
    elif limit_type == "ai":
        max_tokens = 20
        refill_time = 600.0
    elif limit_type == "bulk":
        max_tokens = 1
        refill_time = 1800.0
    else:
        max_tokens = 60
        refill_time = 60.0
        
    allowed = await check_rate_limit(request, key, max_tokens, refill_time)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please wait before retrying.",
        )
