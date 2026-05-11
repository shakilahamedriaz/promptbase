from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import get_current_user_id
from app.models.history import PromptHistory
from app.models.prompt import Prompt
from app.models.refinement import AIRefinement
from app.schemas.analytics import ActiveHour, AnalyticsSummary, PlatformBreakdown, TopPrompt

router = APIRouter(prefix="/analytics", tags=["analytics"])

_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]


@router.get("/summary", response_model=AnalyticsSummary)
async def get_summary(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    total_prompts = (await db.execute(
        select(func.count(Prompt.id)).where(Prompt.user_id == user_id, Prompt.is_deleted.is_(False))
    )).scalar() or 0

    total_uses = (await db.execute(
        select(func.coalesce(func.sum(Prompt.use_count), 0)).where(
            Prompt.user_id == user_id, Prompt.is_deleted.is_(False)
        )
    )).scalar() or 0

    favorite_count = (await db.execute(
        select(func.count(Prompt.id)).where(
            Prompt.user_id == user_id, Prompt.is_deleted.is_(False), Prompt.is_favorite.is_(True)
        )
    )).scalar() or 0

    total_refinements = (await db.execute(
        select(func.count(AIRefinement.id))
        .join(Prompt, Prompt.id == AIRefinement.prompt_id)
        .where(Prompt.user_id == user_id)
    )).scalar() or 0

    avg_qs_row = (await db.execute(
        select(func.avg(Prompt.quality_score)).where(
            Prompt.user_id == user_id,
            Prompt.is_deleted.is_(False),
            Prompt.quality_score.isnot(None),
        )
    )).scalar()
    avg_quality_score = round(float(avg_qs_row), 1) if avg_qs_row else 0.0

    prompts_this_week = (await db.execute(
        select(func.count(Prompt.id)).where(
            Prompt.user_id == user_id,
            Prompt.is_deleted.is_(False),
            Prompt.created_at >= week_ago,
        )
    )).scalar() or 0

    uses_this_week = (await db.execute(
        select(func.coalesce(func.sum(Prompt.use_count), 0)).where(
            Prompt.user_id == user_id,
            Prompt.is_deleted.is_(False),
            Prompt.updated_at >= week_ago,
            Prompt.use_count > 0,
        )
    )).scalar() or 0

    return AnalyticsSummary(
        total_prompts=total_prompts,
        total_uses=total_uses,
        favorite_count=favorite_count,
        total_refinements=total_refinements,
        avg_quality_score=avg_quality_score,
        prompts_this_week=prompts_this_week,
        uses_this_week=uses_this_week,
    )


@router.get("/top-prompts", response_model=list[TopPrompt])
async def get_top_prompts(
    limit: int = 10,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Prompt)
        .where(Prompt.user_id == user_id, Prompt.is_deleted.is_(False))
        .order_by(Prompt.use_count.desc())
        .limit(min(limit, 50))
    )
    return [TopPrompt.model_validate(p) for p in result.scalars().all()]


@router.get("/platform-breakdown", response_model=list[PlatformBreakdown])
@router.get("/platforms", response_model=list[PlatformBreakdown])
async def get_platform_breakdown(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PromptHistory.platform, func.count(PromptHistory.id).label("count"))
        .where(PromptHistory.user_id == user_id)
        .group_by(PromptHistory.platform)
        .order_by(func.count(PromptHistory.id).desc())
    )
    rows = result.all()
    total = sum(r.count for r in rows) or 1
    return [
        PlatformBreakdown(platform=r.platform, count=r.count, percentage=round(r.count / total * 100, 1))
        for r in rows
    ]


@router.get("/active-hours", response_model=list[ActiveHour])
async def get_active_hours(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            extract("dow", PromptHistory.used_at).label("day_num"),
            extract("hour", PromptHistory.used_at).label("hour"),
            func.count(PromptHistory.id).label("count"),
        )
        .where(PromptHistory.user_id == user_id)
        .group_by("day_num", "hour")
        .order_by("day_num", "hour")
    )
    return [
        ActiveHour(day=_DAYS[int(row.day_num)], hour=int(row.hour), count=row.count)
        for row in result.all()
    ]
