from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import get_current_user_id
from app.schemas.history import (
    ClearHistoryRequest,
    HistoryCreate,
    HistoryListResponse,
    HistoryResponse,
)
from app.services import history_service

router = APIRouter(prefix="/history", tags=["history"])


@router.get("", response_model=HistoryListResponse)
async def get_history(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    platform: str | None = Query(default=None),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve paginated usage history for the current user."""
    return await history_service.get_history(
        db,
        user_id,
        page=page,
        per_page=per_page,
        platform=platform,
    )


@router.post("", response_model=HistoryResponse, status_code=status.HTTP_201_CREATED)
async def log_history(
    data: HistoryCreate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Log a prompt usage event."""
    return await history_service.log_usage(db, user_id, data)


@router.delete("", status_code=status.HTTP_200_OK)
async def clear_history(
    body: ClearHistoryRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete history records.
    Pass `all: true` to clear everything, or `ids: [...]` for selective deletion.
    """
    deleted = await history_service.clear_history(
        db,
        user_id,
        ids=body.ids,
        all_records=body.all,
    )
    return {"deleted": deleted}
