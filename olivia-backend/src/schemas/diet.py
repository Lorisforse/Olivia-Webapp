from typing import Any, Optional
from pydantic import BaseModel


class DietCreate(BaseModel):
    name: str
    tips: list[str] = []
    weekly_plan: dict[str, dict[str, str]] = {}
    # Piani creati dalla webapp restano testo libero: l'editor di regole
    # strutturate (come quelle scritte dal bot, vedi DietResponse) non esiste ancora.
    substitutions: str = ""


class DietUpdate(BaseModel):
    name: Optional[str] = None
    tips: Optional[list[str]] = None
    weekly_plan: Optional[dict[str, dict[str, str]]] = None
    substitutions: Optional[str] = None


class DietResponse(BaseModel):
    id: str
    name: str
    tips: list[str] = []
    weekly_plan: dict[str, dict[str, str]] = {}
    # Il bot salva le sostituzioni come regole strutturate (dict), non più come
    # semplice stringa: i piani creati dal bot restituiscono un dict qui.
    # I piani creati dalla webapp restano stringa finché non esiste un editor dedicato.
    substitutions: str | dict[str, Any] = ""
