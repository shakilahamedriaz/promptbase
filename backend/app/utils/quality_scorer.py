"""
Prompt quality scorer.

Returns a dict:
  {
    "total": int (0-100),
    "breakdown": {
        "specificity":               0-25,
        "context":                   0-20,
        "clarity":                   0-20,
        "length_fit":                0-15,
        "instruction_completeness":  0-20,
    }
  }
"""

import re
from typing import TypedDict


class ScoreBreakdown(TypedDict):
    specificity: int
    context: int
    clarity: int
    length_fit: int
    instruction_completeness: int


class ScoreResult(TypedDict):
    total: int
    breakdown: ScoreBreakdown


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

ACTION_VERBS = {
    "write", "create", "generate", "list", "explain", "describe", "summarize",
    "analyze", "compare", "translate", "rewrite", "convert", "extract",
    "identify", "evaluate", "review", "suggest", "design", "build", "draft",
    "provide", "give", "show", "make", "find", "answer", "tell", "help",
    "define", "calculate", "solve", "outline", "format", "classify", "predict",
}

VAGUE_WORDS = {
    "somehow", "something", "stuff", "thing", "things", "good", "bad", "nice",
    "great", "awesome", "terrible", "maybe", "perhaps", "kind of", "sort of",
    "basically", "generally", "usually", "often", "sometimes", "etc", "etc.",
    "and so on", "like", "just", "very", "really", "quite", "pretty",
}

OUTPUT_FORMAT_CLUES = [
    r"\blist\b",
    r"\bbullet[s]?\b",
    r"\btable\b",
    r"\bjson\b",
    r"\bmarkdown\b",
    r"\bparagraph[s]?\b",
    r"\bsentence[s]?\b",
    r"\bword[s]?\b",
    r"\bstep[s]?\b",
    r"\bformat\b",
    r"\bstructure\b",
    r"\bexample[s]?\b",
    r"\bcode\b",
    r"\bsummary\b",
    r"\bdiagram\b",
    r"\bheading[s]?\b",
    r"\bsection[s]?\b",
    r"\btemplate\b",
    r"\bresponse\b",
    r"\boutput\b",
    r"\bresponse in\b",
]

CONTEXT_KEYWORDS = [
    r"\bgiven\b",
    r"\bassume\b",
    r"\bcontext[:\s]",
    r"\bbackground[:\s]",
    r"\byou are\b",
    r"\bacting as\b",
    r"\bas a\b",
    r"\byour role\b",
    r"\bthe following\b",
    r"\buse case\b",
    r"\bscenario\b",
]


# ---------------------------------------------------------------------------
# Scoring functions
# ---------------------------------------------------------------------------


def _score_specificity(body: str) -> int:
    """
    0-25.  Count concrete indicators:
      - numbers / percentages / dates
      - quoted strings
      - proper nouns (title-cased words not at sentence start)
    """
    score = 0

    # Numbers, percentages, years
    numbers = re.findall(r"\b\d+\.?\d*\s*%?\b", body)
    score += min(len(numbers) * 4, 12)

    # Quoted strings
    quotes = re.findall(r'(["\'])[^"\']{2,}\1', body)
    score += min(len(quotes) * 3, 9)

    # Proper nouns: words that are Title-Cased and not at sentence start
    words = re.findall(r"(?<![.!?]\s)(?<!\n)\b[A-Z][a-z]{2,}\b", body)
    proper_nouns = [w for w in words if w not in {"The", "This", "That", "These", "Those", "When", "Where", "What"}]
    score += min(len(proper_nouns) * 2, 10)

    return min(score, 25)


def _score_context(body: str) -> int:
    """0-20.  Detect context-providing phrases."""
    lower = body.lower()
    hits = sum(1 for pattern in CONTEXT_KEYWORDS if re.search(pattern, lower))
    # Each unique context signal is worth ~5 points, cap at 20
    return min(hits * 5, 20)


def _score_clarity(body: str) -> int:
    """0-20.  Penalise vague words."""
    lower = body.lower()
    total_words = max(len(re.findall(r"\b\w+\b", lower)), 1)

    vague_hits = 0
    for vague in VAGUE_WORDS:
        # Use word boundary for single-word vague terms
        pattern = r"\b" + re.escape(vague) + r"\b"
        vague_hits += len(re.findall(pattern, lower))

    vague_ratio = vague_hits / total_words
    if vague_ratio == 0:
        return 20
    elif vague_ratio < 0.02:
        return 16
    elif vague_ratio < 0.05:
        return 10
    elif vague_ratio < 0.10:
        return 5
    else:
        return 0


def _score_length_fit(body: str) -> int:
    """0-15.  Reward appropriate length."""
    length = len(body)
    if length < 20:
        return 0
    elif length < 100:
        return 8
    elif length < 2000:
        return 15
    else:
        return 8


def _score_instruction_completeness(body: str) -> int:
    """
    0-20.  Check for:
      - starts with action verb (7 pts)
      - has a noun subject / topic (7 pts)
      - contains an output format clue (6 pts)
    """
    score = 0
    lower = body.lower().strip()
    words = re.findall(r"\b\w+\b", lower)

    # Action verb in first 5 words
    if words and words[0] in ACTION_VERBS:
        score += 7
    elif any(w in ACTION_VERBS for w in words[:5]):
        score += 3

    # Noun subject: at least one non-stopword of 4+ chars in the first 20 words
    stopwords = {"that", "this", "with", "from", "have", "will", "your", "about", "what"}
    content_words = [w for w in words[:20] if len(w) >= 4 and w not in stopwords]
    if len(content_words) >= 2:
        score += 7
    elif len(content_words) == 1:
        score += 3

    # Output format clue anywhere in body
    for pattern in OUTPUT_FORMAT_CLUES:
        if re.search(pattern, lower):
            score += 6
            break

    return min(score, 20)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def score_prompt(body: str) -> ScoreResult:
    """
    Score a prompt on a 0-100 scale.

    Returns a dict with 'total' and 'breakdown' keys.
    """
    specificity = _score_specificity(body)
    context = _score_context(body)
    clarity = _score_clarity(body)
    length_fit = _score_length_fit(body)
    instruction_completeness = _score_instruction_completeness(body)

    total = specificity + context + clarity + length_fit + instruction_completeness

    return ScoreResult(
        total=min(total, 100),
        breakdown=ScoreBreakdown(
            specificity=specificity,
            context=context,
            clarity=clarity,
            length_fit=length_fit,
            instruction_completeness=instruction_completeness,
        ),
    )
