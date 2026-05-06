from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import get_current_user_id
from app.models.user import User
from sqlalchemy import select

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/plan")
async def get_plan(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Return the current user's subscription plan."""
    result = await db.execute(select(User.plan).where(User.id == user_id))
    plan = result.scalar_one_or_none() or "free"
    return {"plan": plan, "user_id": str(user_id)}


@router.post("/upgrade")
async def upgrade_plan(
    user_id: UUID = Depends(get_current_user_id),
):
    """Placeholder for subscription upgrade — Stripe integration coming soon."""
    return {"message": "Subscription coming soon"}
