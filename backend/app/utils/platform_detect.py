"""
Platform detection from URLs.

Maps known AI platform domains to human-readable platform identifiers.
"""

from urllib.parse import urlparse

_DOMAIN_MAP: dict[str, str] = {
    "chat.openai.com": "chatgpt",
    "chatgpt.com": "chatgpt",
    "claude.ai": "claude",
    "gemini.google.com": "gemini",
    "bard.google.com": "gemini",
    "perplexity.ai": "perplexity",
    "grok.x.com": "grok",
    "x.com": "grok",  # grok is now embedded in x.com
    "copilot.microsoft.com": "copilot",
    "bing.com": "copilot",
    "you.com": "you",
    "poe.com": "poe",
    "character.ai": "character_ai",
    "cohere.com": "cohere",
    "huggingface.co": "huggingface",
    "replicate.com": "replicate",
    "mistral.ai": "mistral",
    "groq.com": "groq",
}


def detect_platform(url: str) -> str:
    """
    Determine the AI platform from a URL.

    Args:
        url: Full URL string (e.g. "https://chat.openai.com/chat").

    Returns:
        A lowercase platform identifier string, or "unknown" if unrecognised.
    """
    if not url:
        return "unknown"

    try:
        parsed = urlparse(url)
        hostname = parsed.hostname or ""
    except Exception:
        return "unknown"

    # Strip www. prefix for matching
    hostname = hostname.removeprefix("www.")

    # Exact match first
    if hostname in _DOMAIN_MAP:
        return _DOMAIN_MAP[hostname]

    # Suffix match (handles subdomains like studio.d-id.com)
    for domain, platform in _DOMAIN_MAP.items():
        if hostname.endswith(f".{domain}") or hostname == domain:
            return platform

    return "unknown"
