from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.middleware.auth_middleware import get_current_user_id
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UpdateUserRequest,
    UserResponse,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Create a new user account and return tokens."""
    return await auth_service.register_user(db, data)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate with email + password and return tokens."""
    return await auth_service.login_user(db, data.email, data.password)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Exchange a valid refresh token for a new token pair."""
    return await auth_service.refresh_tokens(db, data.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(user_id: UUID = Depends(get_current_user_id)):
    """
    Stateless logout — client discards tokens.
    A production implementation would add the token to a Redis denylist.
    """
    return None


@router.get("/me", response_model=UserResponse)
async def get_me(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Return the currently authenticated user's profile."""
    return await auth_service.get_user_by_id(db, user_id)


@router.put("/me", response_model=UserResponse)
async def update_me(
    data: UpdateUserRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's profile and API keys."""
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if data.display_name is not None:
        user.display_name = data.display_name
    if data.avatar_url is not None:
        user.avatar_url = data.avatar_url
    if data.groq_api_key is not None:
        user.groq_api_key = data.groq_api_key
    if data.openrouter_api_key is not None:
        user.openrouter_api_key = data.openrouter_api_key

    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete the current user's account and all associated data."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    await db.delete(user)
    await db.flush()


@router.get("/google")
async def google_login():
    """Redirect the user to Google's OAuth2 authorization page."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured on this server.",
        )

    redirect_uri = settings.BACKEND_URL + "/v1/auth/google/callback"
    params = (
        f"client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope=openid%20email%20profile"
        f"&access_type=offline"
    )
    google_auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{params}"
    return RedirectResponse(url=google_auth_url)


@router.get("/google/callback", response_model=TokenResponse)
async def google_callback(code: str, db: AsyncSession = Depends(get_db)):
    """
    Handle the OAuth2 callback from Google.
    Exchange the authorization code for tokens, fetch the user's profile,
    and create or return the PromptVault user account.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured on this server.",
        )

    redirect_uri = settings.BACKEND_URL + "/v1/auth/google/callback"

    # Exchange authorization code for Google tokens
    async with httpx.AsyncClient(timeout=10.0) as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )

    if token_response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to exchange authorization code with Google.",
        )

    token_data = token_response.json()
    google_access_token = token_data.get("access_token")
    if not google_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No access token returned by Google.",
        )

    # Fetch user profile from Google
    async with httpx.AsyncClient(timeout=10.0) as client:
        userinfo_response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {google_access_token}"},
        )

    if userinfo_response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to retrieve user info from Google.",
        )

    userinfo = userinfo_response.json()
    google_email: str | None = userinfo.get("email")
    google_name: str = userinfo.get("name") or userinfo.get("email", "Google User")
    google_avatar: str | None = userinfo.get("picture")

    if not google_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google did not return an email address.",
        )

    # Find or create the user in our database
    result = await db.execute(select(User).where(User.email == google_email))
    user: User | None = result.scalar_one_or_none()

    if user is None:
        user = User(
            email=google_email,
            password_hash=None,
            display_name=google_name,
            avatar_url=google_avatar,
            auth_provider="google",
            plan="free",
            is_active=True,
        )
        db.add(user)
        await db.flush()

    # Issue our own JWT tokens
    access_token = auth_service.create_access_token(user.id)
    refresh_token = auth_service.create_refresh_token(user.id)

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)
