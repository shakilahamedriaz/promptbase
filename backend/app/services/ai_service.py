import re
from uuid import UUID

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.refinement import AIRefinement
from app.schemas.ai import (
    FeedbackRequest,
    RefineRequest,
    RefineResponse,
    RefinementHistoryItem,
    ScoreResponse,
    SuggestTagsResponse,
)
from app.utils.quality_scorer import score_prompt

settings = get_settings()

OPENROUTER_MODEL = "google/gemma-3-8b-it:free"
GROQ_MODEL = "gemma2-9b-it"

STYLE_INSTRUCTIONS = {
    "professional": "Rewrite the following prompt to be professional, clear, and formal. Use precise language.",
    "creative": "Rewrite the following prompt to be creative, engaging, and imaginative. Use vivid language.",
    "technical": "Rewrite the following prompt to be technically precise with clear specifications and constraints.",
    "concise": "Rewrite the following prompt to be as concise and to-the-point as possible. Remove all fluff.",
}


# ---------------------------------------------------------------------------
# Internal AI callers
# ---------------------------------------------------------------------------


async def _call_openrouter(system: str, user_msg: str) -> str | None:
    if not settings.OPENROUTER_API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "HTTP-Referer": settings.BACKEND_URL,
                    "X-Title": "PromptVault Pro",
                },
                json={
                    "model": OPENROUTER_MODEL,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user_msg},
                    ],
                    "max_tokens": 1024,
                },
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
    except Exception:
        return None


async def _call_groq(system: str, user_msg: str) -> str | None:
    if not settings.GROQ_API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                json={
                    "model": GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user_msg},
                    ],
                    "max_tokens": 1024,
                },
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
    except Exception:
        return None


def _rule_based_refine(body: str, style: str) -> tuple[str, str]:
    """
    Minimal rule-based fallback when no AI provider is available.
    Returns (refined_body, explanation).
    """
    refined = body.strip()

    if style == "concise":
        # Remove common filler phrases
        fillers = [
            r"\bplease\b",
            r"\bkindly\b",
            r"\bjust\b",
            r"\bbasically\b",
            r"\bactually\b",
        ]
        for filler in fillers:
            refined = re.sub(filler, "", refined, flags=re.IGNORECASE)
        refined = re.sub(r" {2,}", " ", refined).strip()
        explanation = "Removed filler words to make the prompt more concise."

    elif style == "professional":
        # Ensure sentence starts with capital
        if refined and refined[0].islower():
            refined = refined[0].upper() + refined[1:]
        # Ensure ends with period
        if refined and refined[-1] not in ".!?":
            refined += "."
        explanation = "Formatted prompt with proper capitalisation and punctuation."

    elif style == "technical":
        # Prepend a technical framing
        if not refined.lower().startswith("given") and not refined.lower().startswith("you are"):
            refined = "You are an expert assistant. " + refined
        explanation = "Added expert framing for technical context."

    else:  # creative
        if not refined.endswith("!"):
            refined = refined.rstrip(".") + "!"
        explanation = "Added enthusiasm marker for creative style."

    return refined, explanation


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------


async def refine_prompt(request: RefineRequest) -> RefineResponse:
    style_instruction = STYLE_INSTRUCTIONS.get(request.style, STYLE_INSTRUCTIONS["professional"])
    if request.custom_instruction:
        style_instruction += f" Additional instruction: {request.custom_instruction}"

    system_prompt = (
        f"{style_instruction}\n\n"
        "Return ONLY a JSON object with two keys:\n"
        '  "refined": the improved prompt text\n'
        '  "explanation": a one-sentence explanation of the changes made\n'
        "Do not include any other text."
    )
    user_message = f"Original prompt:\n\n{request.body}"

    # Score original
    original_score_data = score_prompt(request.body)
    score_before = original_score_data["total"]

    # Try provider chain
    raw_response: str | None = await _call_openrouter(system_prompt, user_message)
    if raw_response is None:
        raw_response = await _call_groq(system_prompt, user_message)

    refined_body: str
    explanation: str

    if raw_response is not None:
        # Parse JSON response from AI
        try:
            json_match = re.search(r"\{.*\}", raw_response, re.DOTALL)
            if json_match:
                import json
                parsed = json.loads(json_match.group())
                refined_body = parsed.get("refined", request.body)
                explanation = parsed.get("explanation", "Refined using AI.")
            else:
                # Fallback: treat entire response as refined body
                refined_body = raw_response
                explanation = "Refined using AI."
        except Exception:
            refined_body = raw_response
            explanation = "Refined using AI."
    else:
        # Rule-based fallback
        refined_body, explanation = _rule_based_refine(request.body, request.style)

    # Score refined
    refined_score_data = score_prompt(refined_body)
    score_after = refined_score_data["total"]

    return RefineResponse(
        original_body=request.body,
        refined_body=refined_body,
        explanation=explanation,
        score_before=score_before,
        score_after=score_after,
    )


async def score_prompt_service(body: str) -> ScoreResponse:
    result = score_prompt(body)
    return ScoreResponse(score=result["total"], breakdown=result["breakdown"])


async def suggest_tags(body: str) -> SuggestTagsResponse:
    system_prompt = (
        "You are a tagging assistant. Given a prompt, suggest 3-6 concise, lowercase tags "
        "that describe its topic, domain, and style. Return ONLY a JSON array of strings. "
        "Example: [\"writing\", \"email\", \"professional\"]"
    )

    raw: str | None = await _call_openrouter(system_prompt, body)
    if raw is None:
        raw = await _call_groq(system_prompt, body)

    if raw is not None:
        try:
            import json
            arr_match = re.search(r"\[.*\]", raw, re.DOTALL)
            if arr_match:
                tags = json.loads(arr_match.group())
                return SuggestTagsResponse(tags=[str(t).lower() for t in tags[:8]])
        except Exception:
            pass

    # Rule-based fallback: keyword extraction
    words = re.findall(r"\b[a-z]{4,}\b", body.lower())
    stopwords = {
        "this", "that", "with", "from", "have", "will", "your", "about",
        "what", "when", "where", "which", "their", "there", "here", "then",
        "than", "also", "just", "been", "into", "more", "some", "such",
        "well", "make", "like", "time", "year", "them", "these", "those",
    }
    freq: dict[str, int] = {}
    for w in words:
        if w not in stopwords:
            freq[w] = freq.get(w, 0) + 1

    top_tags = sorted(freq, key=lambda k: freq[k], reverse=True)[:6]
    return SuggestTagsResponse(tags=top_tags)


async def save_refinement(
    db: AsyncSession,
    request: RefineRequest,
    response: RefineResponse,
) -> AIRefinement:
    refinement = AIRefinement(
        prompt_id=request.prompt_id,
        original_body=response.original_body,
        refined_body=response.refined_body,
        style=request.style,
        explanation=response.explanation,
        score_before=response.score_before,
        score_after=response.score_after,
    )
    db.add(refinement)
    await db.flush()
    await db.refresh(refinement)
    return refinement


async def get_refinement_history(
    db: AsyncSession,
    prompt_id: UUID,
) -> list[RefinementHistoryItem]:
    result = await db.execute(
        select(AIRefinement)
        .where(AIRefinement.prompt_id == prompt_id)
        .order_by(AIRefinement.created_at.desc())
    )
    refinements = result.scalars().all()
    return [RefinementHistoryItem.model_validate(r) for r in refinements]


async def apply_feedback(
    db: AsyncSession,
    feedback: FeedbackRequest,
) -> None:
    result = await db.execute(
        select(AIRefinement).where(AIRefinement.id == feedback.refinement_id)
    )
    refinement = result.scalar_one_or_none()
    if not refinement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Refinement not found",
        )
    refinement.user_rating = feedback.rating
    db.add(refinement)
    await db.flush()
