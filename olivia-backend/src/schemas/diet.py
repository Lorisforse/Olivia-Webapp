from datetime import datetime
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
    # Derivato dall'ObjectId (_id.generation_time): il bot non scrive un campo
    # data sui piani, quindi lo ricaviamo qui senza toccare la sua collection.
    created_at: Optional[datetime] = None
    # True se esiste il PDF originale in "webapp-diet-pdfs" (vedi router diets).
    has_pdf: bool = False


class ParsedPlanResponse(BaseModel):
    """Risultato del parsing di un PDF (endpoint POST /diets/parse-pdf).
    Non viene salvato nulla: il medico rivede la griglia e poi crea il piano."""
    weekly_plan: dict[str, dict[str, str]] = {}
    tips: list[str] = []
    warnings: list[str] = []


class DietPdfInfo(BaseModel):
    filename: str
    size: int
    uploaded_at: datetime
