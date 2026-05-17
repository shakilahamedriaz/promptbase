from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.services.auth_service import decode_token

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user_id(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> UUID:
    """
    FastAPI dependency that extracts and validates the JWT from the
    Authorization: Bearer <token> header.  Injects `user_id` into
    request.state and returns the UUID.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_token(token, token_type="access")

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = UUID(payload["sub"])
    except (KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    request.state.user_id = user_id
    return user_id


async def get_optional_user_id(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> Optional[UUID]:
    """
    Optional authentication dependency. Returns user_id if a valid token is present,
    otherwise returns None. Does not raise on missing/invalid tokens.
    """
    if credentials is None:
        return None

    token = credentials.credentials
    payload = decode_token(token, token_type="access")

    if payload is None:
        return None

    try:
        user_id = UUID(payload["sub"])
        request.state.user_id = user_id
        return user_id
    except (KeyError, ValueError):
        return None
