import time
from typing import Callable

from fastapi import Depends, HTTPException, Request, status

from app.redis_client import get_redis


async def rate_limit(
    key: str,
    limit: int,
    window_seconds: int,
    redis,
) -> None:
    """
    Sliding window rate limiter using Redis sorted sets.

    :param key:            Redis key for this limiter bucket.
    :param limit:          Maximum number of requests allowed in the window.
    :param window_seconds: Duration of the sliding window in seconds.
    :param redis:          Async Redis client instance.
    :raises HTTPException: 429 Too Many Requests when the limit is exceeded.
    """
    now = time.time()
    window_start = now - window_seconds

    pipe = redis.pipeline()
    # Remove timestamps older than the window
    pipe.zremrangebyscore(key, "-inf", window_start)
    # Add current timestamp (use nanoseconds as score+member for uniqueness)
    pipe.zadd(key, {str(now): now})
    # Count requests in current window
    pipe.zcard(key)
    # Set expiry so keys are cleaned up automatically
    pipe.expire(key, window_seconds + 1)
    results = await pipe.execute()

    current_count: int = results[2]
    if current_count > limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Maximum {limit} requests per {window_seconds}s.",
            headers={"Retry-After": str(window_seconds)},
        )


def make_rate_limit_dependency(limit: int, window_seconds: int) -> Callable:
    """
    Factory that returns a FastAPI dependency enforcing a rate limit per
    authenticated user (falling back to IP address for unauthenticated routes).
    """

    async def dependency(
        request: Request,
        redis=Depends(get_redis),
    ) -> None:
        # Prefer authenticated user id, fall back to client IP
        user_id = getattr(request.state, "user_id", None)
        if user_id:
            bucket = f"rl:{limit}:{window_seconds}:user:{user_id}"
        else:
            client_ip = request.client.host if request.client else "unknown"
            bucket = f"rl:{limit}:{window_seconds}:ip:{client_ip}"

        await rate_limit(bucket, limit, window_seconds, redis)

    return dependency


# Pre-built dependencies
api_rate_limit = make_rate_limit_dependency(limit=100, window_seconds=60)
ai_rate_limit = make_rate_limit_dependency(limit=20, window_seconds=60)
