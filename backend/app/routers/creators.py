from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.models import Prompt, User, PromptRating, UserFollow
from app.middleware.auth_middleware import get_optional_user_id, get_current_user_id

router = APIRouter(tags=["creators"])


# ─── Schemas ─────────────────────────────────────────────────────────────────

class CreatorProfileResponse(BaseModel):
    id: UUID
    display_name: str
    bio: Optional[str]
    avatar_url: Optional[str]
    created_at: datetime
    total_prompts: int
    avg_quality_score: float
    total_ratings: int
    follower_count: int
    is_following: bool

    class Config:
        from_attributes = True


class CreatorPromptResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    category: str
    tags: list[str]
    quality_score: Optional[int]
    use_count: int
    avg_rating: float
    rating_count: int
    price_credits: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class FollowResponse(BaseModel):
    is_following: bool


# ─── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/creators/{user_id}", response_model=CreatorProfileResponse)
async def get_creator_profile(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user_id: Optional[UUID] = Depends(get_optional_user_id),
):
    """Get creator profile with stats."""

    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Creator not found")

    # Count public prompts
    prompt_count_result = await db.execute(
        select(func.count(Prompt.id)).where(
            and_(Prompt.user_id == user_id, Prompt.is_public.is_(True), Prompt.is_deleted.is_(False))
        )
    )
    prompt_count = prompt_count_result.scalar() or 0

    # Average quality score
    avg_quality_result = await db.execute(
        select(func.avg(Prompt.quality_score)).where(
            and_(Prompt.user_id == user_id, Prompt.is_public.is_(True), Prompt.is_deleted.is_(False))
        )
    )
    avg_quality = float(avg_quality_result.scalar() or 0)

    # Total ratings on all prompts
    ratings_result = await db.execute(
        select(func.count(PromptRating.id)).join(
            Prompt, Prompt.id == PromptRating.prompt_id
        ).where(Prompt.user_id == user_id)
    )
    total_ratings = ratings_result.scalar() or 0

    # Follower count
    follower_result = await db.execute(
        select(func.count(UserFollow.id)).where(UserFollow.following_id == user_id)
    )
    follower_count = follower_result.scalar() or 0

    # Check if current user is following
    is_following = False
    if current_user_id:
        follow_result = await db.execute(
            select(UserFollow).where(
                and_(UserFollow.follower_id == current_user_id, UserFollow.following_id == user_id)
            )
        )
        is_following = follow_result.scalar_one_or_none() is not None

    return CreatorProfileResponse(
        id=user.id,
        display_name=user.display_name,
        bio=user.bio,
        avatar_url=user.avatar_url,
        created_at=user.created_at,
        total_prompts=prompt_count,
        avg_quality_score=avg_quality,
        total_ratings=total_ratings,
        follower_count=follower_count,
        is_following=is_following,
    )


@router.get("/creators/{user_id}/prompts", response_model=list[CreatorPromptResponse])
async def get_creator_prompts(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
):
    """Get creator's public prompts."""

    per_page = min(per_page, 50)
    offset = (page - 1) * per_page

    stmt = select(
        Prompt,
        func.coalesce(func.avg(PromptRating.score), 0.0).label("avg_rating"),
        func.count(PromptRating.id).label("rating_count"),
    ).outerjoin(
        PromptRating, PromptRating.prompt_id == Prompt.id
    ).where(
        and_(Prompt.user_id == user_id, Prompt.is_public.is_(True), Prompt.is_deleted.is_(False))
    ).group_by(
        Prompt.id
    ).order_by(
        Prompt.created_at.desc()
    ).offset(offset).limit(per_page)

    result = await db.execute(stmt)
    rows = result.all()

    return [
        CreatorPromptResponse(
            id=row.Prompt.id,
            title=row.Prompt.title,
            description=row.Prompt.description,
            category=row.Prompt.category,
            tags=list(row.Prompt.tags) if row.Prompt.tags else [],
            quality_score=row.Prompt.quality_score,
            use_count=row.Prompt.use_count,
            avg_rating=float(row.avg_rating),
            rating_count=row.rating_count,
            price_credits=row.Prompt.price_credits,
            created_at=row.Prompt.created_at,
        )
        for row in rows
    ]


@router.get("/users/{user_id}/is-following", response_model=FollowResponse)
async def check_following(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
):
    """Check if current user follows someone."""

    result = await db.execute(
        select(UserFollow).where(
            and_(UserFollow.follower_id == current_user_id, UserFollow.following_id == user_id)
        )
    )
    is_following = result.scalar_one_or_none() is not None

    return FollowResponse(is_following=is_following)


@router.post("/users/{user_id}/follow", response_model=FollowResponse)
async def follow_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
):
    """Follow a creator."""

    if user_id == current_user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    # Check if already following
    existing = await db.execute(
        select(UserFollow).where(
            and_(UserFollow.follower_id == current_user_id, UserFollow.following_id == user_id)
        )
    )

    if existing.scalar_one_or_none():
        return FollowResponse(is_following=True)

    # Create follow
    follow = UserFollow(follower_id=current_user_id, following_id=user_id)
    db.add(follow)
    await db.commit()

    return FollowResponse(is_following=True)


@router.post("/users/{user_id}/unfollow", response_model=FollowResponse)
async def unfollow_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
):
    """Unfollow a creator."""

    result = await db.execute(
        select(UserFollow).where(
            and_(UserFollow.follower_id == current_user_id, UserFollow.following_id == user_id)
        )
    )
    follow = result.scalar_one_or_none()

    if follow:
        await db.delete(follow)
        await db.commit()

    return FollowResponse(is_following=False)
