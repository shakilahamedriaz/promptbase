from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class HistoryCreate(BaseModel):
    prompt_id: UUID | None = None
    body_snapshot: str = Field(min_length=1)
    platform: str = Field(default="unknown", max_length=50)
    was_refined: bool = False


class HistoryResponse(BaseModel):
    id: UUID
    user_id: UUID
    prompt_id: UUID | None
    body_snapshot: str
    platform: str
    used_at: datetime
    was_refined: bool

    model_config = {"from_attributes": True}


class HistoryListResponse(BaseModel):
    items: list[HistoryResponse]
    total: int
    page: int
    per_page: int


class ClearHistoryRequest(BaseModel):
    ids: list[UUID] | None = None
    all: bool = False
