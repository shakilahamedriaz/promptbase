from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, engine
from app.redis_client import close_redis
from app.routers import auth, prompts, ai, history, analytics, billing

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create all DB tables (safe if they already exist)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown: close Redis connection pool
    await close_redis()


app = FastAPI(
    title="PromptVault Pro API",
    version="1.0.0",
    description="Backend API for PromptVault Pro — an AI prompt management platform.",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/v1")
app.include_router(prompts.router, prefix="/v1")
app.include_router(ai.router, prefix="/v1")
app.include_router(history.router, prefix="/v1")
app.include_router(analytics.router, prefix="/v1")
app.include_router(billing.router, prefix="/v1")


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "version": "1.0.0"}
