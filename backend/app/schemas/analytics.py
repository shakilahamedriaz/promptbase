from uuid import UUID

from pydantic import BaseModel


class AnalyticsSummary(BaseModel):
    total_prompts: int
    total_uses: int
    favorite_count: int
    ai_refinements_count: int


class TopPrompt(BaseModel):
    id: UUID
    title: str
    use_count: int

    model_config = {"from_attributes": True}


class PlatformBreakdown(BaseModel):
    platform: str
    count: int
