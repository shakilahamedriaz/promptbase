from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import get_current_user_id
from app.middleware.rate_limiter import ai_rate_limit
from app.schemas.ai import (
    FeedbackRequest,
    RefineRequest,
    RefineResponse,
    RefinementHistoryItem,
    ScoreRequest,
    ScoreResponse,
    SuggestTagsRequest,
    SuggestTagsResponse,
)
from app.services import ai_service

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post(
    "/refine",
    response_model=RefineResponse,
    dependencies=[Depends(ai_rate_limit)],
)
async def refine_prompt(
    request: RefineRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Refine a prompt using AI with provider fallback chain."""
    response = await ai_service.refine_prompt(request)
    # Persist refinement record
    await ai_service.save_refinement(db, request, response)
    return response


@router.post(
    "/score",
    response_model=ScoreResponse,
    dependencies=[Depends(ai_rate_limit)],
)
async def score_prompt(
    request: ScoreRequest,
    user_id: UUID = Depends(get_current_user_id),
):
    """Score a prompt's quality (0-100) with a detailed breakdown."""
    return await ai_service.score_prompt_service(request.body)


@router.post(
    "/suggest-tags",
    response_model=SuggestTagsResponse,
    dependencies=[Depends(ai_rate_limit)],
)
async def suggest_tags(
    request: SuggestTagsRequest,
    user_id: UUID = Depends(get_current_user_id),
):
    """Suggest relevant tags for a given prompt body."""
    return await ai_service.suggest_tags(request.body)


@router.get("/refinements/{prompt_id}", response_model=list[RefinementHistoryItem])
async def get_refinement_history(
    prompt_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all AI refinements for a specific prompt."""
    return await ai_service.get_refinement_history(db, prompt_id)


@router.post("/feedback", status_code=status.HTTP_204_NO_CONTENT)
async def submit_feedback(
    feedback: FeedbackRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Submit thumbs up (1) or thumbs down (-1) feedback on a refinement."""
    await ai_service.apply_feedback(db, feedback)
