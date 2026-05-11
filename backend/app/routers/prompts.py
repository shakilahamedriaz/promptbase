import csv
import io
import json
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import get_current_user_id
from app.schemas.prompt import (
    BulkImportRequest,
    BulkImportResponse,
    PromptCreate,
    PromptListResponse,
    PromptResponse,
    PromptUpdate,
    PromptVersionResponse,
)
from app.services import prompt_service

router = APIRouter(prefix="/prompts", tags=["prompts"])


@router.post("", response_model=PromptResponse, status_code=status.HTTP_201_CREATED)
async def create_prompt(
    data: PromptCreate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await prompt_service.create_prompt(db, user_id, data)


@router.get("", response_model=PromptListResponse)
async def list_prompts(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    category: str | None = Query(default=None),
    tags: list[str] | None = Query(default=None),
    is_favorite: bool | None = Query(default=None),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await prompt_service.get_prompts(
        db,
        user_id,
        page=page,
        per_page=per_page,
        category=category,
        tags=tags,
        is_favorite=is_favorite,
    )


@router.get("/search", response_model=PromptListResponse)
async def search_prompts(
    q: str = Query(min_length=1),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await prompt_service.search_prompts(db, user_id, q, page=page, per_page=per_page)


@router.get("/export")
async def export_prompts(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    data = await prompt_service.export_prompts(db, user_id)
    return JSONResponse(content=data)


@router.post("/import", response_model=BulkImportResponse, status_code=status.HTTP_201_CREATED)
async def import_prompts_file(
    file: UploadFile = File(...),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Accept a JSON or CSV file upload and bulk-import prompts."""
    content = await file.read()
    prompts_data: list[dict] = []

    filename = (file.filename or "").lower()
    try:
        if filename.endswith(".csv"):
            reader = csv.DictReader(io.StringIO(content.decode("utf-8")))
            for row in reader:
                if row.get("title") and row.get("body"):
                    tags_raw = row.get("tags", "")
                    tags = [t.strip() for t in tags_raw.split(",") if t.strip()] if tags_raw else []
                    prompts_data.append({
                        "title": row["title"],
                        "body": row["body"],
                        "category": row.get("category", "general"),
                        "tags": tags,
                    })
        else:
            parsed = json.loads(content.decode("utf-8"))
            prompts_data = parsed if isinstance(parsed, list) else parsed.get("prompts", [])
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid file: {exc}")

    data = BulkImportRequest(prompts=prompts_data)
    return await prompt_service.bulk_import(db, user_id, data)


@router.post("/bulk-import", response_model=BulkImportResponse, status_code=status.HTTP_201_CREATED)
async def bulk_import(
    data: BulkImportRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await prompt_service.bulk_import(db, user_id, data)


@router.get("/{prompt_id}", response_model=PromptResponse)
async def get_prompt(
    prompt_id: UUID,
    record_use: bool = Query(default=False),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await prompt_service.get_prompt_by_id(db, prompt_id, user_id, record_use=record_use)


@router.patch("/{prompt_id}", response_model=PromptResponse)
async def update_prompt(
    prompt_id: UUID,
    data: PromptUpdate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await prompt_service.update_prompt(db, prompt_id, user_id, data)


@router.delete("/{prompt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_prompt(
    prompt_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await prompt_service.delete_prompt(db, prompt_id, user_id)


@router.post("/{prompt_id}/duplicate", response_model=PromptResponse, status_code=status.HTTP_201_CREATED)
async def duplicate_prompt(
    prompt_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await prompt_service.duplicate_prompt(db, prompt_id, user_id)


@router.get("/{prompt_id}/versions", response_model=list[PromptVersionResponse])
async def get_versions(
    prompt_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await prompt_service.get_versions(db, prompt_id, user_id)
