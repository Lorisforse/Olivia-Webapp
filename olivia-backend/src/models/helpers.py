from typing import Any


def extract(field: Any) -> Any:
    """Extract .value from a chatbot InfoField dict, or return the value as-is."""
    if isinstance(field, dict) and "value" in field:
        return field["value"]
    return field
