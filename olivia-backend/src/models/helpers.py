from typing import Any

from bson import ObjectId
from bson.decimal128 import Decimal128


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
    if isinstance(value, Decimal128):
        return float(value.to_decimal())
    if isinstance(value, dict):
        # anche le CHIAVI vanno convertite: le regole di sostituzione del bot
        # possono essere indicizzate per rule_id (ObjectId), e Pydantic non
        # sa serializzare un ObjectId usato come chiave.
        return {sanitize_bson(k): sanitize_bson(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [sanitize_bson(v) for v in value]
    return value
