from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.models import Prompt, PromptSale, CreatorPayout, PromptRating
from app.middleware.auth_middleware import get_current_user_id

router = APIRouter(tags=["earnings"])


# ─── Schemas ─────────────────────────────────────────────────────────────────

class EarningsSummary(BaseModel):
    total_revenue: int
    this_month: int
    this_week: int
    total_sales_count: int
    avg_price: float


class TopPrompt(BaseModel):
    id: UUID
    title: str
    sales: int
    revenue: int
    avg_rating: float


class TopPromptsResponse(BaseModel):
    items: list[TopPrompt]


class PayoutRecord(BaseModel):
    id: UUID
    total_amount: int
    status: str
    created_at: datetime
    payout_date: Optional[datetime]


class PayoutsListResponse(BaseModel):
    items: list[PayoutRecord]
    total: int


# ─── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/creator/earnings/summary", response_model=EarningsSummary)
async def get_earnings_summary(
    db: AsyncSession = Depends(get_db),
    creator_id: UUID = Depends(get_current_user_id),
):
    """Get creator's earnings summary."""

    # Total revenue
    total_result = await db.execute(
        select(func.coalesce(func.sum(PromptSale.price_credits), 0)).join(
            Prompt, Prompt.id == PromptSale.prompt_id
        ).where(Prompt.user_id == creator_id)
    )
    total_revenue = total_result.scalar() or 0

    # This month
    today = datetime.utcnow()
    month_start = today.replace(day=1)
    month_result = await db.execute(
        select(func.coalesce(func.sum(PromptSale.price_credits), 0)).join(
            Prompt, Prompt.id == PromptSale.prompt_id
        ).where(
            and_(Prompt.user_id == creator_id, PromptSale.created_at >= month_start)
        )
    )
    this_month = month_result.scalar() or 0

    # This week
    week_start = today - timedelta(days=today.weekday())
    week_result = await db.execute(
        select(func.coalesce(func.sum(PromptSale.price_credits), 0)).join(
            Prompt, Prompt.id == PromptSale.prompt_id
        ).where(
            and_(Prompt.user_id == creator_id, PromptSale.created_at >= week_start)
        )
    )
    this_week = week_result.scalar() or 0

    # Sales count
    count_result = await db.execute(
        select(func.count(PromptSale.id)).join(
            Prompt, Prompt.id == PromptSale.prompt_id
        ).where(Prompt.user_id == creator_id)
    )
    total_sales_count = count_result.scalar() or 0

    # Average price
    avg_price = float(total_revenue / total_sales_count) if total_sales_count > 0 else 0.0

    return EarningsSummary(
        total_revenue=total_revenue,
        this_month=this_month,
        this_week=this_week,
        total_sales_count=total_sales_count,
        avg_price=avg_price,
    )


@router.get("/creator/earnings/top-prompts", response_model=TopPromptsResponse)
async def get_top_prompts(
    db: AsyncSession = Depends(get_db),
    creator_id: UUID = Depends(get_current_user_id),
    limit: int = 10,
):
    """Get creator's top earning prompts."""

    stmt = select(
        Prompt,
        func.count(PromptSale.id).label("sales"),
        func.coalesce(func.sum(PromptSale.price_credits), 0).label("revenue"),
        func.coalesce(func.avg(PromptRating.score), 0.0).label("avg_rating"),
    ).outerjoin(
        PromptSale, PromptSale.prompt_id == Prompt.id
    ).outerjoin(
        PromptRating, PromptRating.prompt_id == Prompt.id
    ).where(
        and_(Prompt.user_id == creator_id, Prompt.is_deleted.is_(False))
    ).group_by(
        Prompt.id
    ).order_by(
        func.coalesce(func.sum(PromptSale.price_credits), 0).desc()
    ).limit(limit)

    result = await db.execute(stmt)
    rows = result.all()

    items = [
        TopPrompt(
            id=row.Prompt.id,
            title=row.Prompt.title,
            sales=row.sales or 0,
            revenue=int(row.revenue or 0),
            avg_rating=float(row.avg_rating or 0),
        )
        for row in rows
    ]

    return TopPromptsResponse(items=items)


@router.get("/creator/payouts", response_model=PayoutsListResponse)
async def get_payouts(
    db: AsyncSession = Depends(get_db),
    creator_id: UUID = Depends(get_current_user_id),
    limit: int = 20,
    offset: int = 0,
):
    """Get creator's payout history."""

    # Count total
    count_result = await db.execute(
        select(func.count(CreatorPayout.id)).where(CreatorPayout.creator_id == creator_id)
    )
    total = count_result.scalar() or 0

    # Get payouts
    stmt = select(CreatorPayout).where(
        CreatorPayout.creator_id == creator_id
    ).order_by(
        CreatorPayout.created_at.desc()
    ).offset(offset).limit(limit)

    result = await db.execute(stmt)
    payouts = result.scalars().all()

    items = [
        PayoutRecord(
            id=payout.id,
            total_amount=payout.total_amount,
            status=payout.status,
            created_at=payout.created_at,
            payout_date=payout.payout_date,
        )
        for payout in payouts
    ]

    return PayoutsListResponse(items=items, total=total)
