"""
Variable parser for prompt templates.

Variables are denoted with double curly braces: {{variable_name}}

Examples:
  extract_variables("Write a {{tone}} email about {{topic}}.")
  # -> ["tone", "topic"]

  substitute_variables("Hello {{name}}!", {"name": "Alice"})
  # -> "Hello Alice!"
"""

import re

_VARIABLE_PATTERN = re.compile(r"\{\{\s*([a-zA-Z_][a-zA-Z0-9_ ]*?)\s*\}\}")


def extract_variables(body: str) -> list[str]:
    """
    Find all {{variable_name}} placeholders in the prompt body.

    Returns a deduplicated list of variable names in the order they first appear.
    Variable names are stripped of surrounding whitespace.
    """
    seen: set[str] = set()
    result: list[str] = []

    for match in _VARIABLE_PATTERN.finditer(body):
        name = match.group(1).strip()
        if name not in seen:
            seen.add(name)
            result.append(name)

    return result


def substitute_variables(body: str, values: dict[str, str]) -> str:
    """
    Replace all {{variable_name}} placeholders with values from the dict.

    - Variables not present in `values` are left as-is.
    - Variable names in the template are matched case-sensitively after stripping
      surrounding whitespace.
    """

    def replacer(match: re.Match) -> str:
        name = match.group(1).strip()
        if name in values:
            return str(values[name])
        # Leave unresolved variables intact
        return match.group(0)

    return _VARIABLE_PATTERN.sub(replacer, body)
