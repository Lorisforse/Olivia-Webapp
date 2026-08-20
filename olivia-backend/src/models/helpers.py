from typing import Any

from bson import ObjectId


def extract(field: Any) -> Any:
    """Extract .value from a chatbot InfoField dict, or return the value as-is."""
    if isinstance(field, dict) and "value" in field:
        return field["value"]
    return field


def sanitize_bson(value: Any) -> Any:
    """
    Converte ricorsivamente gli ObjectId di Mongo in stringhe.

    Necessario prima di passare dict grezzi letti da Mongo dentro campi Pydantic
    tipati 'Any' (es. le regole di sostituzione strutturate del bot, che hanno
    ObjectId annidati come rule_id): senza questo, la serializzazione JSON della
    risposta fallisce con PydanticSerializationError.
    """
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, dict):
        return {k: sanitize_bson(v) for k, v in value.items()}
    if isinstance(value, list):
        return [sanitize_bson(v) for v in value]
    return value
