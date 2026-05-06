import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.prompt import Prompt
from app.models.prompt_version import PromptVersion
from app.schemas.prompt import (
    BulkImportRequest,
    BulkImportResponse,
    PromptCreate,
    PromptListResponse,
    PromptResponse,
    PromptUpdate,
    PromptVersionResponse,
)
from app.utils.quality_scorer import score_prompt
from app.utils.variable_parser import extract_variables


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_prompt_or_404(db: AsyncSession, prompt_id: UUID, user_id: UUID) -> Prompt:
    result = await db.execute(
        select(Prompt).where(
            Prompt.id == prompt_id,
            Prompt.user_id == user_id,
            Prompt.is_deleted.is_(False),
        )
    )
    prompt = result.scalar_one_or_none()
    if not prompt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prompt not found")
    return prompt


async def _next_version_number(db: AsyncSession, prompt_id: UUID) -> int:
    result = await db.execute(
        select(func.coalesce(func.max(PromptVersion.version_number), 0)).where(
            PromptVersion.prompt_id == prompt_id
        )
    )
    return (result.scalar() or 0) + 1


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------


async def create_prompt(db: AsyncSession, user_id: UUID, data: PromptCreate) -> PromptResponse:
    # Auto-score quality
    score_result = score_prompt(data.body)
    quality_score = score_result["total"]

    # Extract variable names if not provided
    variables = data.variables
    if not variables:
        var_names = extract_variables(data.body)
        variables = {v: "" for v in var_names}

    prompt = Prompt(
        user_id=user_id,
        title=data.title,
        body=data.body,
        category=data.category,
        tags=data.tags,
        is_favorite=data.is_favorite,
        variables=variables,
        quality_score=quality_score,
    )
    db.add(prompt)
    await db.flush()
    return PromptResponse.model_validate(prompt)


async def get_prompts(
    db: AsyncSession,
    user_id: UUID,
    page: int = 1,
    per_page: int = 20,
    category: str | None = None,
    tags: list[str] | None = None,
    is_favorite: bool | None = None,
) -> PromptListResponse:
    per_page = min(per_page, 100)
    query = select(Prompt).where(
        Prompt.user_id == user_id,
        Prompt.is_deleted.is_(False),
    )

    if category:
        query = query.where(Prompt.category == category)
    if is_favorite is not None:
        query = query.where(Prompt.is_favorite.is_(is_favorite))
    if tags:
        # Match prompts that contain ALL requested tags
        for tag in tags:
            query = query.where(Prompt.tags.contains([tag]))

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total: int = total_result.scalar() or 0

    query = query.order_by(Prompt.updated_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    prompts = result.scalars().all()

    return PromptListResponse(
        items=[PromptResponse.model_validate(p) for p in prompts],
        total=total,
        page=page,
        per_page=per_page,
    )


async def get_prompt_by_id(
    db: AsyncSession,
    prompt_id: UUID,
    user_id: UUID,
    record_use: bool = False,
) -> PromptResponse:
    prompt = await _get_prompt_or_404(db, prompt_id, user_id)

    if record_use:
        await db.execute(
            update(Prompt)
            .where(Prompt.id == prompt_id)
            .values(use_count=Prompt.use_count + 1)
        )
        await db.flush()
        # Refresh in-memory object
        await db.refresh(prompt)

    return PromptResponse.model_validate(prompt)


async def update_prompt(
    db: AsyncSession,
    prompt_id: UUID,
    user_id: UUID,
    data: PromptUpdate,
) -> PromptResponse:
    prompt = await _get_prompt_or_404(db, prompt_id, user_id)

    # Save current version before updating body
    if data.body is not None and data.body != prompt.body:
        version_number = await _next_version_number(db, prompt_id)
        version = PromptVersion(
            prompt_id=prompt.id,
            body=prompt.body,
            version_number=version_number,
        )
        db.add(version)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(prompt, field, value)

    # Recompute quality score when body changes
    if data.body is not None:
        score_result = score_prompt(prompt.body)
        prompt.quality_score = score_result["total"]

    prompt.updated_at = datetime.now(timezone.utc)
    db.add(prompt)
    await db.flush()
    await db.refresh(prompt)
    return PromptResponse.model_validate(prompt)


async def delete_prompt(db: AsyncSession, prompt_id: UUID, user_id: UUID) -> None:
    prompt = await _get_prompt_or_404(db, prompt_id, user_id)
    prompt.is_deleted = True
    prompt.updated_at = datetime.now(timezone.utc)
    db.add(prompt)
    await db.flush()


async def search_prompts(
    db: AsyncSession,
    user_id: UUID,
    q: str,
    page: int = 1,
    per_page: int = 20,
) -> PromptListResponse:
    per_page = min(per_page, 100)

    ts_query = func.plainto_tsquery("english", q)
    ts_vector = func.to_tsvector(
        "english",
        func.coalesce(Prompt.title, "") + " " + func.coalesce(Prompt.body, ""),
    )

    query = (
        select(Prompt)
        .where(
            Prompt.user_id == user_id,
            Prompt.is_deleted.is_(False),
            ts_vector.op("@@")(ts_query),
        )
        .order_by(func.ts_rank(ts_vector, ts_query).desc())
    )

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total: int = total_result.scalar() or 0

    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    prompts = result.scalars().all()

    return PromptListResponse(
        items=[PromptResponse.model_validate(p) for p in prompts],
        total=total,
        page=page,
        per_page=per_page,
    )


async def duplicate_prompt(
    db: AsyncSession,
    prompt_id: UUID,
    user_id: UUID,
) -> PromptResponse:
    prompt = await _get_prompt_or_404(db, prompt_id, user_id)

    new_prompt = Prompt(
        user_id=user_id,
        title=f"{prompt.title} (copy)",
        body=prompt.body,
        category=prompt.category,
        tags=list(prompt.tags or []),
        is_favorite=False,
        variables=dict(prompt.variables or {}),
        quality_score=prompt.quality_score,
    )
    db.add(new_prompt)
    await db.flush()
    return PromptResponse.model_validate(new_prompt)


async def get_versions(
    db: AsyncSession,
    prompt_id: UUID,
    user_id: UUID,
) -> list[PromptVersionResponse]:
    # Verify ownership
    await _get_prompt_or_404(db, prompt_id, user_id)

    result = await db.execute(
        select(PromptVersion)
        .where(PromptVersion.prompt_id == prompt_id)
        .order_by(PromptVersion.version_number.desc())
    )
    versions = result.scalars().all()
    return [PromptVersionResponse.model_validate(v) for v in versions]


async def bulk_import(
    db: AsyncSession,
    user_id: UUID,
    data: BulkImportRequest,
) -> BulkImportResponse:
    created = 0
    failed = 0
    errors: list[str] = []

    for idx, item in enumerate(data.prompts):
        try:
            await create_prompt(db, user_id, item)
            created += 1
        except Exception as exc:
            failed += 1
            errors.append(f"Item {idx}: {str(exc)}")

    await db.flush()
    return BulkImportResponse(created=created, failed=failed, errors=errors)


async def export_prompts(
    db: AsyncSession,
    user_id: UUID,
) -> list[dict[str, Any]]:
    result = await db.execute(
        select(Prompt).where(
            Prompt.user_id == user_id,
            Prompt.is_deleted.is_(False),
        )
    )
    prompts = result.scalars().all()
    return [
        {
            "title": p.title,
            "body": p.body,
            "category": p.category,
            "tags": p.tags,
            "is_favorite": p.is_favorite,
            "variables": p.variables,
            "quality_score": p.quality_score,
            "use_count": p.use_count,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in prompts
    ]
