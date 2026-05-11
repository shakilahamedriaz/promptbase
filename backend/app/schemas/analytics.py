from uuid import UUID

from pydantic import BaseModel


class AnalyticsSummary(BaseModel):
    total_prompts: int
    total_uses: int
    favorite_count: int
    total_refinements: int
    avg_quality_score: float
    prompts_this_week: int
    uses_this_week: int


class TopPrompt(BaseModel):
    id: UUID
    title: str
    use_count: int
    quality_score: int | None = None

    model_config = {"from_attributes": True}


class PlatformBreakdown(BaseModel):
    platform: str
    count: int
    percentage: float = 0.0


class ActiveHour(BaseModel):
    hour: int
    day: str
    count: int
