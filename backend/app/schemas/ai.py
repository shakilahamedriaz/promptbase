from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class RefineRequest(BaseModel):
    prompt_id: UUID | None = None
    body: str = Field(min_length=1)
    style: Literal["professional", "creative", "technical", "concise"] = "professional"
    custom_instruction: str = ""


class RefineResponse(BaseModel):
    original_body: str
    refined_body: str
    explanation: str
    score_before: int
    score_after: int


class ScoreRequest(BaseModel):
    body: str = Field(min_length=1)


class ScoreResponse(BaseModel):
    score: int
    breakdown: dict[str, int]


class SuggestTagsRequest(BaseModel):
    body: str = Field(min_length=1)


class SuggestTagsResponse(BaseModel):
    tags: list[str]


class RefinementHistoryItem(BaseModel):
    id: UUID
    prompt_id: UUID | None
    original_body: str
    refined_body: str
    style: str
    explanation: str | None
    score_before: int | None
    score_after: int | None
    user_rating: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class FeedbackRequest(BaseModel):
    refinement_id: UUID
    rating: Literal[-1, 1]
