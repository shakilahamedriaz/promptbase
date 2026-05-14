import json
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
GROQ_MODEL = "llama-3.1-8b-instant"

# ---------------------------------------------------------------------------
# System prompts — modern prompt-engineering approach
#
# Core framework for every style:
#   ROLE  →  TASK  →  CONTEXT  →  CONSTRAINTS  →  OUTPUT FORMAT
#
# The AI must understand the user's *intent* first, then reconstruct the
# prompt as a well-structured instruction that will extract the best possible
# response from any large language model.
# ---------------------------------------------------------------------------

_BASE_RULES = """
RULES YOU MUST FOLLOW:
- Preserve the user's original intent 100% — only improve HOW it is expressed
- Add a specific AI role/persona if none is present (e.g. "You are a senior...")
- Make the core task explicit and action-oriented (strong verb + clear object)
- Add context or background that the user implied but did not state
- Include constraints (scope, length, tone, audience) where helpful
- Specify an output format (list, paragraphs, code block, table, etc.) when relevant
- Do NOT add fictional information or invent details the user never implied
- Do NOT include meta-commentary like "Here is your refined prompt:"
- The refined prompt is ready to be pasted directly into an AI chat — write it that way

Return ONLY a valid JSON object — no markdown, no extra text:
{"refined": "<the complete improved prompt>", "explanation": "<one sentence describing the key improvement>"}
"""

STYLE_SYSTEM_PROMPTS = {
    "professional": f"""You are an expert prompt engineer specializing in professional, business, and enterprise communication.

YOUR JOB: Transform the user's rough or informal prompt into a polished, professional AI prompt that produces precise, business-ready output.

HOW TO IMPROVE IT:
1. ROLE — Assign the AI a clear expert identity (e.g. "You are a senior project manager", "You are a professional copywriter")
2. TASK — State the deliverable explicitly: what to produce, for whom, and why
3. CONTEXT — Include the business situation, audience, or domain that shapes the response
4. CONSTRAINTS — Specify tone (formal, authoritative), length guidance, and quality criteria
5. OUTPUT FORMAT — Define structure: sections, bullet points, numbered steps, executive summary, etc.

The result should read like a brief from a senior professional — clear, specific, unambiguous.
{_BASE_RULES}""",

    "creative": f"""You are an expert prompt engineer specializing in creative, storytelling, and imaginative AI prompts.

YOUR JOB: Transform the user's rough idea into an evocative, richly detailed AI prompt that unlocks genuinely creative and original output.

HOW TO IMPROVE IT:
1. ROLE — Give the AI a vivid creative persona (e.g. "You are a bestselling novelist", "You are a visionary concept artist")
2. TASK — Frame the creative goal with emotional and sensory richness: mood, genre, themes, tone
3. CONTEXT — Set the scene: time period, world, characters, or creative constraints that spark imagination
4. CONSTRAINTS — Add creative guardrails: genre, perspective (first/third person), length, style influences
5. OUTPUT FORMAT — Specify form: short story, poem, dialogue, scene, screenplay excerpt, etc.

The result should ignite the AI's creativity while keeping it focused on what the user actually wants.
{_BASE_RULES}""",

    "technical": f"""You are an expert prompt engineer specializing in technical, developer-focused, and analytical AI prompts.

YOUR JOB: Transform the user's rough technical request into a precise, unambiguous AI prompt that produces correct, implementable, and well-structured technical output.

HOW TO IMPROVE IT:
1. ROLE — Assign a precise technical expert identity (e.g. "You are a senior software engineer", "You are a data scientist with ML expertise")
2. TASK — State the technical objective with exact terminology: language, framework, algorithm, data type, version if known
3. CONTEXT — Describe the system, codebase context, environment, or constraints (e.g. "using Python 3.11", "RESTful API", "production environment")
4. CONSTRAINTS — Specify requirements: performance, security, edge cases, error handling, compatibility
5. OUTPUT FORMAT — Define exact output: working code with comments, step-by-step explanation, pseudocode first then implementation, etc.

The result should read like a well-written engineering ticket or technical specification.
{_BASE_RULES}""",

    "concise": f"""You are an expert prompt engineer specializing in minimal, high-signal AI prompts.

YOUR JOB: Transform the user's prompt into the shortest possible version that still gives an AI model everything it needs to produce excellent output. Cut ruthlessly — every word must earn its place.

HOW TO IMPROVE IT:
1. ROLE — One short phrase if needed (e.g. "As a data analyst,") — skip if obvious from context
2. TASK — A single sharp imperative sentence: strong verb + precise object
3. CONTEXT — Only include context that would change the response if omitted
4. CONSTRAINTS — One or two hard constraints maximum (length, format, tone)
5. OUTPUT FORMAT — State it in under 5 words if it matters

Remove: filler words, politeness padding, redundant qualifiers, restated context, anything the AI can infer.
The result should be 1–4 tight sentences maximum.
{_BASE_RULES}""",
}


# ---------------------------------------------------------------------------
# Internal AI callers
# ---------------------------------------------------------------------------


async def _call_openrouter(system: str, user_msg: str, api_key: str | None = None) -> str | None:
    key = api_key or settings.OPENROUTER_API_KEY
    if not key:
        return None
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {key}",
                    "HTTP-Referer": settings.BACKEND_URL,
                    "X-Title": "PromptVault Pro",
                },
                json={
                    "model": OPENROUTER_MODEL,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user_msg},
                    ],
                    "max_tokens": 1500,
                    "temperature": 0.4,
                },
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
    except Exception:
        return None


async def _call_groq(system: str, user_msg: str, api_key: str | None = None) -> str | None:
    key = api_key or settings.GROQ_API_KEY
    if not key:
        return None
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {key}"},
                json={
                    "model": GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user_msg},
                    ],
                    "max_tokens": 1500,
                    "temperature": 0.4,
                },
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
    except Exception:
        return None


def _parse_ai_json(raw: str) -> tuple[str, str] | None:
    """Extract refined/explanation from AI response. Returns None if unparseable."""
    # Try direct parse first
    try:
        parsed = json.loads(raw)
        if "refined" in parsed:
            return parsed["refined"], parsed.get("explanation", "Refined using AI.")
    except Exception:
        pass

    # Try extracting JSON block (model may wrap in markdown)
    json_match = re.search(r"\{[\s\S]*?\}", raw)
    if json_match:
        try:
            parsed = json.loads(json_match.group())
            if "refined" in parsed:
                return parsed["refined"], parsed.get("explanation", "Refined using AI.")
        except Exception:
            pass

    # Last resort: treat the whole response as the refined prompt
    cleaned = re.sub(r"^```[a-z]*\n?", "", raw).rstrip("`").strip()
    if len(cleaned) > 10:
        return cleaned, "Refined using AI."

    return None


def _rule_based_refine(body: str, style: str) -> tuple[str, str]:
    """
    Structural fallback when no AI provider is available.
    Builds a proper prompt skeleton from the raw input.
    """
    body = body.strip()
    if not body:
        return body, "No changes made."

    # Detect if there's already a role
    has_role = bool(re.search(r"\byou are\b|\bas a\b|\bacting as\b", body, re.IGNORECASE))
    # Detect if there's already an action verb at start
    first_word = re.split(r"\W+", body.lower())[0] if body else ""
    action_verbs = {
        "write", "create", "generate", "list", "explain", "describe",
        "summarize", "analyze", "compare", "translate", "rewrite",
        "design", "build", "draft", "find", "solve", "evaluate",
    }
    has_action = first_word in action_verbs

    if style == "professional":
        role = "" if has_role else "You are a knowledgeable professional assistant. "
        task = body if has_action else f"Please provide a clear and professional response to the following: {body}"
        refined = f"{role}{task}\n\nProvide a well-structured, formal response with clear sections where appropriate."
        explanation = "Added professional framing, clear role, and structured output request."

    elif style == "creative":
        role = "" if has_role else "You are a talented creative writer with a vivid imagination. "
        task = body if has_action else f"Create an imaginative and engaging response to: {body}"
        refined = f"{role}{task}\n\nBe expressive, original, and vivid. Focus on imagery, emotion, and narrative flow."
        explanation = "Added creative persona, expressive framing, and style direction."

    elif style == "technical":
        role = "" if has_role else "You are an expert technical specialist with deep domain knowledge. "
        task = body if has_action else f"Provide a technically precise and detailed response to: {body}"
        refined = f"{role}{task}\n\nInclude specific details, relevant constraints, and practical examples. Format your response clearly with code blocks or numbered steps as appropriate."
        explanation = "Added expert technical role, precision requirements, and structured output format."

    else:  # concise
        # Strip filler words
        fillers = [r"\bplease\b", r"\bkindly\b", r"\bjust\b", r"\bbasically\b",
                   r"\bactually\b", r"\bcan you\b", r"\bcould you\b", r"\bwould you\b"]
        refined = body
        for filler in fillers:
            refined = re.sub(filler, "", refined, flags=re.IGNORECASE)
        refined = re.sub(r" {2,}", " ", refined).strip()
        # Capitalise and add period
        if refined and refined[0].islower():
            refined = refined[0].upper() + refined[1:]
        if refined and refined[-1] not in ".!?":
            refined += "."
        explanation = "Removed filler words and tightened the instruction for maximum clarity."

    return refined, explanation


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------


async def refine_prompt(
    request: RefineRequest,
    groq_key: str | None = None,
    openrouter_key: str | None = None,
) -> RefineResponse:
    style = request.style.lower() if request.style else "professional"
    system_prompt = STYLE_SYSTEM_PROMPTS.get(style, STYLE_SYSTEM_PROMPTS["professional"])

    if request.custom_instruction:
        system_prompt += f"\n\nADDITIONAL USER INSTRUCTION: {request.custom_instruction}"

    user_message = (
        f"Here is the user's rough prompt that needs to be improved:\n\n"
        f"---\n{request.body.strip()}\n---\n\n"
        f"Transform it into a properly structured, highly effective AI prompt using the {style} style."
    )

    # Score original
    score_before = score_prompt(request.body)["total"]

    # Try provider chain
    raw: str | None = await _call_openrouter(system_prompt, user_message, openrouter_key)
    if raw is None:
        raw = await _call_groq(system_prompt, user_message, groq_key)

    if raw is not None:
        parsed = _parse_ai_json(raw)
        if parsed:
            refined_body, explanation = parsed
        else:
            refined_body, explanation = _rule_based_refine(request.body, style)
    else:
        refined_body, explanation = _rule_based_refine(request.body, style)

    score_after = score_prompt(refined_body)["total"]

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


async def suggest_tags(
    body: str,
    groq_key: str | None = None,
    openrouter_key: str | None = None,
) -> SuggestTagsResponse:
    system_prompt = (
        "You are a tagging assistant. Given a prompt, suggest 3-6 concise, lowercase tags "
        "that describe its topic, domain, and style. Return ONLY a JSON array of strings. "
        'Example: ["writing", "email", "professional"]'
    )

    raw: str | None = await _call_openrouter(system_prompt, body, openrouter_key)
    if raw is None:
        raw = await _call_groq(system_prompt, body, groq_key)

    if raw is not None:
        try:
            arr_match = re.search(r"\[.*\]", raw, re.DOTALL)
            if arr_match:
                tags = json.loads(arr_match.group())
                return SuggestTagsResponse(tags=[str(t).lower() for t in tags[:8]])
        except Exception:
            pass

    # Rule-based fallback
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
