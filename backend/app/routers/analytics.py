from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import get_current_user_id
from app.models.history import PromptHistory
from app.models.prompt import Prompt
from app.models.refinement import AIRefinement
from app.schemas.analytics import AnalyticsSummary, PlatformBreakdown, TopPrompt

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
async def get_summary(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Return aggregate statistics for the current user."""
    # Total active prompts
    total_prompts_result = await db.execute(
        select(func.count(Prompt.id)).where(
            Prompt.user_id == user_id,
            Prompt.is_deleted.is_(False),
        )
    )
    total_prompts: int = total_prompts_result.scalar() or 0

    # Total uses (sum of use_count)
    total_uses_result = await db.execute(
        select(func.coalesce(func.sum(Prompt.use_count), 0)).where(
            Prompt.user_id == user_id,
            Prompt.is_deleted.is_(False),
        )
    )
    total_uses: int = total_uses_result.scalar() or 0

    # Favourite count
    fav_result = await db.execute(
        select(func.count(Prompt.id)).where(
            Prompt.user_id == user_id,
            Prompt.is_deleted.is_(False),
            Prompt.is_favorite.is_(True),
        )
    )
    favorite_count: int = fav_result.scalar() or 0

    # AI refinements tied to user's prompts
    ref_result = await db.execute(
        select(func.count(AIRefinement.id))
        .join(Prompt, Prompt.id == AIRefinement.prompt_id)
        .where(Prompt.user_id == user_id)
    )
    ai_refinements_count: int = ref_result.scalar() or 0

    return AnalyticsSummary(
        total_prompts=total_prompts,
        total_uses=total_uses,
        favorite_count=favorite_count,
        ai_refinements_count=ai_refinements_count,
    )


@router.get("/top-prompts", response_model=list[TopPrompt])
async def get_top_prompts(
    limit: int = 10,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Return the most-used prompts for the current user."""
    result = await db.execute(
        select(Prompt)
        .where(
            Prompt.user_id == user_id,
            Prompt.is_deleted.is_(False),
        )
        .order_by(Prompt.use_count.desc())
        .limit(min(limit, 50))
    )
    prompts = result.scalars().all()
    return [TopPrompt.model_validate(p) for p in prompts]


@router.get("/platform-breakdown", response_model=list[PlatformBreakdown])
async def get_platform_breakdown(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Return usage counts grouped by platform."""
    result = await db.execute(
        select(PromptHistory.platform, func.count(PromptHistory.id).label("count"))
        .where(PromptHistory.user_id == user_id)
        .group_by(PromptHistory.platform)
        .order_by(func.count(PromptHistory.id).desc())
    )
    rows = result.all()
    return [PlatformBreakdown(platform=row.platform, count=row.count) for row in rows]
