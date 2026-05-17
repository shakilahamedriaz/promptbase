from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class PromptCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1)
    description: str | None = None
    category: str = Field(default="general", max_length=50)
    tags: list[str] = Field(default_factory=list)
    is_favorite: bool = False
    variables: dict[str, Any] = Field(default_factory=dict)
    price_credits: int | None = None


class PromptUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    body: str | None = Field(default=None, min_length=1)
    description: str | None = None
    category: str | None = Field(default=None, max_length=50)
    tags: list[str] | None = None
    is_favorite: bool | None = None
    variables: dict[str, Any] | None = None
    price_credits: int | None = None


class PromptResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    body: str
    description: str | None
    category: str
    tags: list[str]
    is_favorite: bool
    use_count: int
    quality_score: int | None
    variables: dict[str, Any]
    is_deleted: bool
    is_public: bool
    fork_of_id: UUID | None
    price_credits: int | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PromptListResponse(BaseModel):
    items: list[PromptResponse]
    total: int
    page: int
    per_page: int


class PromptVersionResponse(BaseModel):
    id: UUID
    prompt_id: UUID
    body: str
    version_number: int
    created_at: datetime

    model_config = {"from_attributes": True}


class BulkImportRequest(BaseModel):
    prompts: list[PromptCreate]


class BulkImportResponse(BaseModel):
    created: int
    failed: int
    errors: list[str] = Field(default_factory=list)
