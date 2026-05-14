"""
Prompt quality scorer — evaluates how well-structured an AI prompt is.

Dimensions (total 100 pts):
  role_clarity        0-20   Has a clear AI role/persona?
  task_precision      0-25   Is the task specific and action-oriented?
  context_richness    0-20   Does it provide relevant context/background?
  output_definition   0-20   Is the expected output format/length defined?
  clarity             0-15   Low vagueness, good signal-to-noise ratio

Returns:
  {"total": int, "breakdown": {...}}
"""

import re
from typing import TypedDict


class ScoreBreakdown(TypedDict):
    role_clarity: int
    task_precision: int
    context_richness: int
    output_definition: int
    clarity: int


class ScoreResult(TypedDict):
    total: int
    breakdown: ScoreBreakdown


# ---------------------------------------------------------------------------
# Word lists
# ---------------------------------------------------------------------------

ACTION_VERBS = {
    "write", "create", "generate", "list", "explain", "describe", "summarize",
    "analyze", "compare", "translate", "rewrite", "convert", "extract",
    "identify", "evaluate", "review", "suggest", "design", "build", "draft",
    "provide", "give", "show", "make", "find", "answer", "define", "calculate",
    "solve", "outline", "format", "classify", "predict", "implement", "develop",
    "refactor", "debug", "test", "document", "plan", "research", "propose",
    "assess", "recommend", "optimize", "transform", "improve", "fix",
}

VAGUE_WORDS = {
    "somehow", "something", "stuff", "thing", "things", "good", "bad", "nice",
    "great", "awesome", "terrible", "maybe", "perhaps", "kind of", "sort of",
    "basically", "generally", "usually", "often", "sometimes", "etc", "etc.",
    "and so on", "just", "very", "really", "quite", "pretty", "some",
}

ROLE_PATTERNS = [
    r"\byou are\b",
    r"\bact as\b",
    r"\bacting as\b",
    r"\bas an? [a-z]",
    r"\byour role\b",
    r"\byou('re| are) an? (expert|specialist|senior|professional|experienced)\b",
    r"\bexpert\b",
    r"\bspecialist\b",
    r"\bprofessional\b",
    r"\bsenior [a-z]",
]

CONTEXT_PATTERNS = [
    r"\bgiven\b",
    r"\bassume\b",
    r"\bcontext[:\s]",
    r"\bbackground[:\s]",
    r"\bthe following\b",
    r"\buse case\b",
    r"\bscenario\b",
    r"\bfor (a|the|my|our)\b",
    r"\bin the context of\b",
    r"\bbased on\b",
    r"\busing\b",
    r"\bwith the following\b",
    r"\bthe (project|codebase|system|application|dataset|document)\b",
    r"\btarget audience\b",
    r"\baudience\b",
]

OUTPUT_PATTERNS = [
    r"\blist\b", r"\bbullet[s]?\b", r"\btable\b", r"\bjson\b",
    r"\bmarkdown\b", r"\bparagraph[s]?\b", r"\bsentence[s]?\b",
    r"\bstep[s]?\b", r"\bformat\b", r"\bstructure\b", r"\bexample[s]?\b",
    r"\bcode\b", r"\bsummary\b", r"\bheading[s]?\b", r"\bsection[s]?\b",
    r"\btemplate\b", r"\boutput\b", r"\bresponse\b", r"\bexplain\b",
    r"\b\d+\s*(word[s]?|sentence[s]?|paragraph[s]?|line[s]?|item[s]?|point[s]?)\b",
    r"\bbrief\b", r"\bdetailed?\b", r"\bcomprehensive\b", r"\bconcise\b",
    r"\bshort\b", r"\blong\b", r"\bin (\d+|a few|several) (words?|sentences?|paragraphs?)\b",
]

PRECISION_INDICATORS = [
    r"\b\d+\.?\d*\s*%?\b",          # numbers / percentages
    r'(["\'])[^"\']{2,}\1',          # quoted strings
    r"\b(must|should|shall|need to|required to|ensure|guarantee)\b",
    r"\b(specifically|exactly|precisely|strictly|only|always|never)\b",
    r"\b(version|v\d|python|javascript|typescript|react|fastapi|sql)\b",
    r"\b(include|exclude|avoid|do not|don't|without)\b",
]


# ---------------------------------------------------------------------------
# Scoring functions
# ---------------------------------------------------------------------------


def _score_role_clarity(body: str) -> int:
    """0-20. Does the prompt assign a clear identity/expertise to the AI?"""
    lower = body.lower()
    hits = sum(1 for p in ROLE_PATTERNS if re.search(p, lower))
    if hits == 0:
        return 0
    elif hits == 1:
        return 10
    elif hits == 2:
        return 16
    else:
        return 20


def _score_task_precision(body: str) -> int:
    """0-25. Is the task specific, action-oriented, and unambiguous?"""
    lower = body.lower().strip()
    words = re.findall(r"\b\w+\b", lower)
    score = 0

    # Action verb in first 10 words (8 pts)
    first_ten = words[:10]
    if words and words[0] in ACTION_VERBS:
        score += 8
    elif any(w in ACTION_VERBS for w in first_ten):
        score += 4

    # Precision / specificity indicators (up to 12 pts)
    precision_hits = sum(1 for p in PRECISION_INDICATORS if re.search(p, lower))
    score += min(precision_hits * 3, 12)

    # Adequate length — too short = underspecified (5 pts)
    char_len = len(body)
    if char_len >= 150:
        score += 5
    elif char_len >= 60:
        score += 3

    return min(score, 25)


def _score_context_richness(body: str) -> int:
    """0-20. Does the prompt provide relevant background/context?"""
    lower = body.lower()
    hits = sum(1 for p in CONTEXT_PATTERNS if re.search(p, lower))
    return min(hits * 4, 20)


def _score_output_definition(body: str) -> int:
    """0-20. Is the expected output format or shape specified?"""
    lower = body.lower()
    hits = sum(1 for p in OUTPUT_PATTERNS if re.search(p, lower))
    if hits == 0:
        return 0
    elif hits == 1:
        return 8
    elif hits == 2:
        return 14
    else:
        return 20


def _score_clarity(body: str) -> int:
    """0-15. Low vague-word ratio → high score."""
    lower = body.lower()
    total_words = max(len(re.findall(r"\b\w+\b", lower)), 1)

    vague_hits = 0
    for vague in VAGUE_WORDS:
        vague_hits += len(re.findall(r"\b" + re.escape(vague) + r"\b", lower))

    ratio = vague_hits / total_words
    if ratio == 0:
        return 15
    elif ratio < 0.02:
        return 12
    elif ratio < 0.05:
        return 8
    elif ratio < 0.10:
        return 4
    else:
        return 0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def score_prompt(body: str) -> ScoreResult:
    """Score a prompt on a 0-100 scale across five dimensions."""
    role_clarity = _score_role_clarity(body)
    task_precision = _score_task_precision(body)
    context_richness = _score_context_richness(body)
    output_definition = _score_output_definition(body)
    clarity = _score_clarity(body)

    total = role_clarity + task_precision + context_richness + output_definition + clarity

    return ScoreResult(
        total=min(total, 100),
        breakdown=ScoreBreakdown(
            role_clarity=role_clarity,
            task_precision=task_precision,
            context_richness=context_richness,
            output_definition=output_definition,
            clarity=clarity,
        ),
    )
