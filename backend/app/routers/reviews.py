from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.database import get_db
from app.models import Prompt, PromptReview, ReviewHelpful, User
from app.middleware.auth_middleware import get_optional_user_id, get_current_user_id

router = APIRouter(tags=["reviews"])


# ─── Schemas ─────────────────────────────────────────────────────────────────

class ReviewCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=10)
    rating: int = Field(..., ge=1, le=5)


class ReviewResponse(BaseModel):
    id: UUID
    prompt_id: UUID
    user_id: UUID
    title: str
    content: str
    rating: int
    author_name: str
    created_at: datetime
    helpful_count: int
    unhelpful_count: int
    user_voted_helpful: Optional[bool]

    class Config:
        from_attributes = True


class ReviewListResponse(BaseModel):
    items: list[ReviewResponse]
    total: int
    page: int
    per_page: int


class HelpfulVoteResponse(BaseModel):
    helpful_count: int
    unhelpful_count: int


# ─── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/marketplace/prompts/{prompt_id}/reviews", response_model=ReviewListResponse)
async def get_reviews(
    prompt_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user_id: Optional[UUID] = Depends(get_optional_user_id),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    sort: str = Query("helpful", regex="^(helpful|recent)$"),
):
    """Get reviews for a prompt."""

    # Verify prompt exists
    prompt_result = await db.execute(
        select(Prompt).where(
            and_(Prompt.id == prompt_id, Prompt.is_public.is_(True), Prompt.is_deleted.is_(False))
        )
    )
    if not prompt_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Prompt not found")

    per_page = min(per_page, 50)
    offset = (page - 1) * per_page

    # Count total reviews
    count_result = await db.execute(
        select(func.count(PromptReview.id)).where(PromptReview.prompt_id == prompt_id)
    )
    total = count_result.scalar() or 0

    # Fetch reviews with aggregates
    stmt = select(
        PromptReview,
        User.display_name.label("author_name"),
        func.count(ReviewHelpful.id).filter(ReviewHelpful.is_helpful.is_(True)).label("helpful_count"),
        func.count(ReviewHelpful.id).filter(ReviewHelpful.is_helpful.is_(False)).label("unhelpful_count"),
    ).join(
        User, User.id == PromptReview.user_id
    ).outerjoin(
        ReviewHelpful, ReviewHelpful.review_id == PromptReview.id
    ).where(
        PromptReview.prompt_id == prompt_id
    ).group_by(PromptReview.id, User.id)

    if sort == "helpful":
        stmt = stmt.order_by(func.count(ReviewHelpful.id).filter(ReviewHelpful.is_helpful.is_(True)).desc())
    else:
        stmt = stmt.order_by(PromptReview.created_at.desc())

    stmt = stmt.offset(offset).limit(per_page)

    result = await db.execute(stmt)
    rows = result.all()

    items = []
    for row in rows:
        # Check if current user voted
        user_vote = None
        if current_user_id:
            vote_result = await db.execute(
                select(ReviewHelpful).where(
                    and_(
                        ReviewHelpful.review_id == row.PromptReview.id,
                        ReviewHelpful.user_id == current_user_id,
                    )
                )
            )
            vote = vote_result.scalar_one_or_none()
            if vote:
                user_vote = vote.is_helpful

        items.append(
            ReviewResponse(
                id=row.PromptReview.id,
                prompt_id=row.PromptReview.prompt_id,
                user_id=row.PromptReview.user_id,
                title=row.PromptReview.title,
                content=row.PromptReview.content,
                rating=row.PromptReview.rating,
                author_name=row.author_name,
                created_at=row.PromptReview.created_at,
                helpful_count=row.helpful_count or 0,
                unhelpful_count=row.unhelpful_count or 0,
                user_voted_helpful=user_vote,
            )
        )

    return ReviewListResponse(items=items, total=total, page=page, per_page=per_page)


@router.post("/marketplace/prompts/{prompt_id}/reviews", response_model=ReviewResponse, status_code=201)
async def create_review(
    prompt_id: UUID,
    req: ReviewCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
):
    """Create a review for a prompt."""

    # Verify prompt exists and is public
    prompt_result = await db.execute(
        select(Prompt).where(
            and_(Prompt.id == prompt_id, Prompt.is_public.is_(True), Prompt.is_deleted.is_(False))
        )
    )
    if not prompt_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Prompt not found")

    # Check if user already reviewed
    existing = await db.execute(
        select(PromptReview).where(
            and_(
                PromptReview.prompt_id == prompt_id,
                PromptReview.user_id == current_user_id,
            )
        )
    )

    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You have already reviewed this prompt")

    # Get user name
    user_result = await db.execute(select(User).where(User.id == current_user_id))
    user = user_result.scalar_one()

    # Create review
    review = PromptReview(
        prompt_id=prompt_id,
        user_id=current_user_id,
        title=req.title,
        content=req.content,
        rating=req.rating,
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)

    return ReviewResponse(
        id=review.id,
        prompt_id=review.prompt_id,
        user_id=review.user_id,
        title=review.title,
        content=review.content,
        rating=review.rating,
        author_name=user.display_name,
        created_at=review.created_at,
        helpful_count=0,
        unhelpful_count=0,
        user_voted_helpful=None,
    )


@router.post("/reviews/{review_id}/helpful", response_model=HelpfulVoteResponse)
async def vote_helpful(
    review_id: UUID,
    is_helpful: bool = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
):
    """Vote on whether a review is helpful."""

    # Verify review exists
    review_result = await db.execute(select(PromptReview).where(PromptReview.id == review_id))
    if not review_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Review not found")

    # Check for existing vote
    existing = await db.execute(
        select(ReviewHelpful).where(
            and_(
                ReviewHelpful.review_id == review_id,
                ReviewHelpful.user_id == current_user_id,
            )
        )
    )
    vote = existing.scalar_one_or_none()

    if vote:
        vote.is_helpful = is_helpful
    else:
        vote = ReviewHelpful(review_id=review_id, user_id=current_user_id, is_helpful=is_helpful)
        db.add(vote)

    await db.commit()

    # Get updated counts
    helpful_result = await db.execute(
        select(func.count(ReviewHelpful.id)).where(
            and_(ReviewHelpful.review_id == review_id, ReviewHelpful.is_helpful.is_(True))
        )
    )
    helpful_count = helpful_result.scalar() or 0

    unhelpful_result = await db.execute(
        select(func.count(ReviewHelpful.id)).where(
            and_(ReviewHelpful.review_id == review_id, ReviewHelpful.is_helpful.is_(False))
        )
    )
    unhelpful_count = unhelpful_result.scalar() or 0

    return HelpfulVoteResponse(helpful_count=helpful_count, unhelpful_count=unhelpful_count)


# ─── Variants/Fork Tracking ──────────────────────────────────────────────────

class VariantResponse(BaseModel):
    id: UUID
    title: str
    author_name: str
    created_at: datetime
    fork_count: int
    use_count: int

    class Config:
        from_attributes = True


class VariantsListResponse(BaseModel):
    original_id: Optional[UUID]
    is_original: bool
    forks: list[VariantResponse]


@router.get("/marketplace/prompts/{prompt_id}/variants", response_model=VariantsListResponse)
async def get_variants(
    prompt_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get all variants (forks) of a prompt."""

    # Get the prompt
    prompt_result = await db.execute(select(Prompt).where(Prompt.id == prompt_id))
    prompt = prompt_result.scalar_one_or_none()

    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")

    # Get original prompt ID
    original_id = prompt.fork_of_id
    is_original = original_id is None

    # Get all forks of this prompt
    stmt = select(
        Prompt,
        User.display_name.label("author_name"),
    ).join(
        User, User.id == Prompt.user_id
    ).where(
        and_(
            Prompt.fork_of_id == prompt_id,
            Prompt.is_deleted.is_(False),
        )
    ).order_by(Prompt.created_at.desc())

    result = await db.execute(stmt)
    rows = result.all()

    forks = [
        VariantResponse(
            id=row.Prompt.id,
            title=row.Prompt.title,
            author_name=row.author_name,
            created_at=row.Prompt.created_at,
            fork_count=0,  # TODO: count forks of forks if needed
            use_count=row.Prompt.use_count,
        )
        for row in rows
    ]

    return VariantsListResponse(original_id=original_id, is_original=is_original, forks=forks)
