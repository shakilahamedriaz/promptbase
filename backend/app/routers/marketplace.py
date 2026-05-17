from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.database import get_db
from app.models import Prompt, User, PromptRating, PromptFavorite
from app.middleware.auth_middleware import get_optional_user_id, get_current_user_id

router = APIRouter(tags=["marketplace"])


# ─── Schemas ─────────────────────────────────────────────────────────────────

class MarketplacePromptResponse(BaseModel):
    id: UUID
    title: str
    body: str
    description: Optional[str]
    category: str
    tags: list[str]
    quality_score: Optional[int]
    is_public: bool
    fork_of_id: Optional[UUID]
    use_count: int
    fork_count: int
    avg_rating: float
    rating_count: int
    price_credits: Optional[int]
    author_name: str
    author_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class MarketplaceListResponse(BaseModel):
    items: list[MarketplacePromptResponse]
    total: int
    page: int
    per_page: int


class RatePromptRequest(BaseModel):
    score: int = Field(..., ge=1, le=5, description="Rating score 1-5")


class UserRatingResponse(BaseModel):
    score: Optional[int] = None


# ─── Helpers ────────────────────────────────────────────────────────────────

async def get_marketplace_prompts_query(
    db: AsyncSession,
    category: Optional[str] = None,
    tags: Optional[list[str]] = None,
    q: Optional[str] = None,
    sort: str = "newest",  # newest, popular, rating
    page: int = 1,
    per_page: int = 20,
):
    """Build and execute query for marketplace prompts with aggregates."""

    per_page = min(per_page, 50)  # Max 50 per page
    offset = (page - 1) * per_page

    # Base query with joins for user, ratings, and fork count
    stmt = select(
        Prompt,
        User.display_name.label("author_name"),
        func.coalesce(func.avg(PromptRating.score), 0).label("avg_rating"),
        func.count(PromptRating.id).label("rating_count"),
        func.count(
            select(Prompt.id)
            .where(Prompt.fork_of_id == Prompt.id)
            .correlate(Prompt)
            .scalar_subquery()
        ).label("fork_count"),
    ).join(
        User, User.id == Prompt.user_id
    ).outerjoin(
        PromptRating, PromptRating.prompt_id == Prompt.id
    ).where(
        and_(
            Prompt.is_public.is_(True),
            Prompt.is_deleted.is_(False),
        )
    )

    # Apply filters
    if category:
        stmt = stmt.where(Prompt.category == category)

    if tags:
        # At least one tag matches
        stmt = stmt.where(Prompt.tags.overlap(tags))

    if q:
        # Full-text search
        stmt = stmt.where(
            func.to_tsvector("english", Prompt.title + " " + Prompt.body).match(
                func.plainto_tsquery("english", q)
            )
        )

    # Group by for aggregates
    stmt = stmt.group_by(Prompt.id, User.id)

    # Sort
    if sort == "popular":
        stmt = stmt.order_by(func.count(PromptRating.id).desc())
    elif sort == "rating":
        stmt = stmt.order_by(func.coalesce(func.avg(PromptRating.score), 0).desc())
    else:  # newest
        stmt = stmt.order_by(Prompt.created_at.desc())

    # Pagination
    stmt = stmt.offset(offset).limit(per_page)

    result = await db.execute(stmt)
    return result


# ─── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/marketplace/prompts", response_model=MarketplaceListResponse)
async def list_marketplace_prompts(
    db: AsyncSession = Depends(get_db),
    category: Optional[str] = Query(None),
    tags: Optional[list[str]] = Query(None),
    q: Optional[str] = Query(None, description="Full-text search query"),
    sort: str = Query("newest", regex="^(newest|popular|rating)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    current_user_id: Optional[UUID] = Depends(get_optional_user_id),
):
    """Browse public prompts in the marketplace."""

    # Count total
    total_stmt = select(func.count(Prompt.id)).where(
        and_(
            Prompt.is_public.is_(True),
            Prompt.is_deleted.is_(False),
        )
    )

    if category:
        total_stmt = total_stmt.where(Prompt.category == category)
    if tags:
        total_stmt = total_stmt.where(Prompt.tags.overlap(tags))
    if q:
        total_stmt = total_stmt.where(
            func.to_tsvector("english", Prompt.title + " " + Prompt.body).match(
                func.plainto_tsquery("english", q)
            )
        )

    total_result = await db.execute(total_stmt)
    total = total_result.scalar() or 0

    # Get prompts with aggregates
    per_page = min(per_page, 50)
    offset = (page - 1) * per_page

    stmt = select(
        Prompt,
        User.display_name.label("author_name"),
        func.coalesce(func.avg(PromptRating.score), 0.0).label("avg_rating"),
        func.count(PromptRating.id).label("rating_count"),
    ).join(
        User, User.id == Prompt.user_id
    ).outerjoin(
        PromptRating, PromptRating.prompt_id == Prompt.id
    ).where(
        and_(
            Prompt.is_public.is_(True),
            Prompt.is_deleted.is_(False),
        )
    )

    if category:
        stmt = stmt.where(Prompt.category == category)
    if tags:
        stmt = stmt.where(Prompt.tags.overlap(tags))
    if q:
        stmt = stmt.where(
            func.to_tsvector("english", Prompt.title + " " + Prompt.body).match(
                func.plainto_tsquery("english", q)
            )
        )

    stmt = stmt.group_by(Prompt.id, User.id)

    if sort == "popular":
        stmt = stmt.order_by(func.count(PromptRating.id).desc())
    elif sort == "rating":
        stmt = stmt.order_by(func.coalesce(func.avg(PromptRating.score), 0.0).desc())
    else:
        stmt = stmt.order_by(Prompt.created_at.desc())

    stmt = stmt.offset(offset).limit(per_page)

    result = await db.execute(stmt)
    rows = result.all()

    items = [
        MarketplacePromptResponse(
            id=row.Prompt.id,
            title=row.Prompt.title,
            body=row.Prompt.body,
            description=row.Prompt.description,
            category=row.Prompt.category,
            tags=list(row.Prompt.tags) if row.Prompt.tags else [],
            quality_score=row.Prompt.quality_score,
            is_public=row.Prompt.is_public,
            fork_of_id=row.Prompt.fork_of_id,
            use_count=row.Prompt.use_count,
            fork_count=0,  # TODO: count forks in query
            avg_rating=float(row.avg_rating),
            rating_count=row.rating_count,
            price_credits=row.Prompt.price_credits,
            author_name=row.author_name,
            author_id=row.Prompt.user_id,
            created_at=row.Prompt.created_at,
        )
        for row in rows
    ]

    return MarketplaceListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/marketplace/prompts/{prompt_id}", response_model=MarketplacePromptResponse)
async def get_marketplace_prompt(
    prompt_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user_id: Optional[UUID] = Depends(get_optional_user_id),
):
    """Get a single public prompt from the marketplace."""

    stmt = select(
        Prompt,
        User.display_name.label("author_name"),
        func.coalesce(func.avg(PromptRating.score), 0.0).label("avg_rating"),
        func.count(PromptRating.id).label("rating_count"),
    ).join(
        User, User.id == Prompt.user_id
    ).outerjoin(
        PromptRating, PromptRating.prompt_id == Prompt.id
    ).where(
        and_(
            Prompt.id == prompt_id,
            Prompt.is_public.is_(True),
            Prompt.is_deleted.is_(False),
        )
    ).group_by(Prompt.id, User.id)

    result = await db.execute(stmt)
    row = result.first()

    if not row:
        raise HTTPException(status_code=404, detail="Prompt not found")

    return MarketplacePromptResponse(
        id=row.Prompt.id,
        title=row.Prompt.title,
        body=row.Prompt.body,
        description=row.Prompt.description,
        category=row.Prompt.category,
        tags=list(row.Prompt.tags) if row.Prompt.tags else [],
        quality_score=row.Prompt.quality_score,
        is_public=row.Prompt.is_public,
        fork_of_id=row.Prompt.fork_of_id,
        use_count=row.Prompt.use_count,
        fork_count=0,  # TODO: count forks
        avg_rating=float(row.avg_rating),
        rating_count=row.rating_count,
        price_credits=row.Prompt.price_credits,
        author_name=row.author_name,
        author_id=row.Prompt.user_id,
        created_at=row.Prompt.created_at,
    )


@router.post("/marketplace/prompts/{prompt_id}/fork")
async def fork_prompt(
    prompt_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_optional_user_id),
):
    """Fork a public prompt to the current user's library."""

    if not current_user_id:
        raise HTTPException(status_code=401, detail="Authentication required to fork prompts")

    # Get source prompt
    stmt = select(Prompt).where(
        and_(
            Prompt.id == prompt_id,
            Prompt.is_public.is_(True),
            Prompt.is_deleted.is_(False),
        )
    )
    result = await db.execute(stmt)
    source_prompt = result.scalars().first()

    if not source_prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")

    # Create fork
    forked = Prompt(
        user_id=current_user_id,
        title=f"Forked: {source_prompt.title}",
        body=source_prompt.body,
        category=source_prompt.category,
        tags=source_prompt.tags.copy() if source_prompt.tags else [],
        quality_score=source_prompt.quality_score,
        variables=source_prompt.variables.copy() if source_prompt.variables else {},
        fork_of_id=source_prompt.id,
        is_public=False,  # Forked prompts default to private
    )

    db.add(forked)
    await db.commit()
    await db.refresh(forked)

    return {"id": forked.id, "title": forked.title, "message": "Prompt forked successfully"}


@router.post("/marketplace/prompts/{prompt_id}/rate")
async def rate_prompt(
    prompt_id: UUID,
    req: RatePromptRequest,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_optional_user_id),
):
    """Rate a public prompt (1-5 stars)."""

    if not current_user_id:
        raise HTTPException(status_code=401, detail="Authentication required to rate prompts")

    # Verify prompt exists and is public
    stmt = select(Prompt).where(
        and_(
            Prompt.id == prompt_id,
            Prompt.is_public.is_(True),
            Prompt.is_deleted.is_(False),
        )
    )
    result = await db.execute(stmt)
    prompt = result.scalars().first()

    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")

    # Upsert rating
    existing = await db.execute(
        select(PromptRating).where(
            and_(
                PromptRating.prompt_id == prompt_id,
                PromptRating.user_id == current_user_id,
            )
        )
    )
    rating = existing.scalars().first()

    if rating:
        rating.score = req.score
    else:
        rating = PromptRating(
            prompt_id=prompt_id,
            user_id=current_user_id,
            score=req.score,
        )
        db.add(rating)

    await db.commit()
    await db.refresh(rating)

    return {"id": rating.id, "score": rating.score, "message": "Rating saved"}


@router.get("/marketplace/prompts/{prompt_id}/rating", response_model=UserRatingResponse)
async def get_my_rating(
    prompt_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user_id: Optional[UUID] = Depends(get_optional_user_id),
):
    """Get the current user's rating for a prompt."""

    if not current_user_id:
        return UserRatingResponse(score=None)

    stmt = select(PromptRating).where(
        and_(
            PromptRating.prompt_id == prompt_id,
            PromptRating.user_id == current_user_id,
        )
    )
    result = await db.execute(stmt)
    rating = result.scalars().first()

    return UserRatingResponse(score=rating.score if rating else None)


class FavoriteResponse(BaseModel):
    is_favorited: bool


@router.post("/marketplace/prompts/{prompt_id}/favorite", response_model=FavoriteResponse)
async def favorite_prompt(
    prompt_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
):
    """Favorite a public prompt."""

    stmt = select(Prompt).where(
        and_(
            Prompt.id == prompt_id,
            Prompt.is_public.is_(True),
            Prompt.is_deleted.is_(False),
        )
    )
    result = await db.execute(stmt)
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Prompt not found")

    # Check if already favorited
    existing = await db.execute(
        select(PromptFavorite).where(
            and_(
                PromptFavorite.user_id == current_user_id,
                PromptFavorite.prompt_id == prompt_id,
            )
        )
    )

    if existing.scalars().first():
        return FavoriteResponse(is_favorited=True)

    # Create favorite
    favorite = PromptFavorite(user_id=current_user_id, prompt_id=prompt_id)
    db.add(favorite)
    await db.commit()

    return FavoriteResponse(is_favorited=True)


@router.delete("/marketplace/prompts/{prompt_id}/favorite", response_model=FavoriteResponse)
async def unfavorite_prompt(
    prompt_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
):
    """Unfavorite a prompt."""

    stmt = select(PromptFavorite).where(
        and_(
            PromptFavorite.user_id == current_user_id,
            PromptFavorite.prompt_id == prompt_id,
        )
    )
    result = await db.execute(stmt)
    favorite = result.scalars().first()

    if favorite:
        await db.delete(favorite)
        await db.commit()

    return FavoriteResponse(is_favorited=False)


@router.get("/marketplace/prompts/{prompt_id}/is-favorited", response_model=FavoriteResponse)
async def check_favorited(
    prompt_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user_id: Optional[UUID] = Depends(get_optional_user_id),
):
    """Check if current user has favorited a prompt."""

    if not current_user_id:
        return FavoriteResponse(is_favorited=False)

    stmt = select(PromptFavorite).where(
        and_(
            PromptFavorite.user_id == current_user_id,
            PromptFavorite.prompt_id == prompt_id,
        )
    )
    result = await db.execute(stmt)
    is_favorited = result.scalars().first() is not None

    return FavoriteResponse(is_favorited=is_favorited)
