from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import delete, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.history import PromptHistory
from app.schemas.history import (
    HistoryCreate,
    HistoryListResponse,
    HistoryResponse,
)


async def log_usage(
    db: AsyncSession,
    user_id: UUID,
    data: HistoryCreate,
) -> HistoryResponse:
    record = PromptHistory(
        user_id=user_id,
        prompt_id=data.prompt_id,
        body_snapshot=data.body_snapshot,
        platform=data.platform,
        was_refined=data.was_refined,
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return HistoryResponse.model_validate(record)


async def get_history(
    db: AsyncSession,
    user_id: UUID,
    page: int = 1,
    per_page: int = 20,
    platform: str | None = None,
) -> HistoryListResponse:
    per_page = min(per_page, 100)
    query = select(PromptHistory).where(PromptHistory.user_id == user_id)

    if platform:
        query = query.where(PromptHistory.platform == platform)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total: int = total_result.scalar() or 0

    query = query.order_by(PromptHistory.used_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    records = result.scalars().all()

    return HistoryListResponse(
        items=[HistoryResponse.model_validate(r) for r in records],
        total=total,
        page=page,
        per_page=per_page,
    )


async def get_history_by_id(
    db: AsyncSession,
    history_id: UUID,
    user_id: UUID,
) -> HistoryResponse:
    result = await db.execute(
        select(PromptHistory).where(
            PromptHistory.id == history_id,
            PromptHistory.user_id == user_id,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="History record not found")
    return HistoryResponse.model_validate(record)


async def clear_history(
    db: AsyncSession,
    user_id: UUID,
    ids: list[UUID] | None = None,
    all_records: bool = False,
) -> int:
    """
    Delete history records.
    - If `all_records` is True, deletes all records for the user.
    - If `ids` is provided, deletes only those records belonging to the user.
    Returns the number of rows deleted.
    """
    if all_records:
        stmt = delete(PromptHistory).where(PromptHistory.user_id == user_id)
    elif ids:
        stmt = delete(PromptHistory).where(
            PromptHistory.user_id == user_id,
            PromptHistory.id.in_(ids),
        )
    else:
        return 0

    result = await db.execute(stmt)
    await db.flush()
    return result.rowcount
