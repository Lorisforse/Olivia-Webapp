from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class DietCreate(BaseModel):
    name: str
    tips: list[str] = []
    weekly_plan: dict[str, dict[str, str]] = {}
    # Le regole di sostituzione non si creano da qui: sono lo stesso blocco fisso
    # per tutti i pazienti, scritto automaticamente dal backend (vedi
    # src/fixed_substitutions.py e src/routers/diets.py::_to_mongo_doc).


class DietUpdate(BaseModel):
    name: Optional[str] = None
    tips: Optional[list[str]] = None
    weekly_plan: Optional[dict[str, dict[str, str]]] = None


class DietResponse(BaseModel):
    id: str
    name: str
    tips: list[str] = []
    weekly_plan: dict[str, dict[str, str]] = {}
    # Sempre il blocco di regole strutturate (vedi src/fixed_substitutions.py):
    # nessun piano ha più "substitutions" come stringa libera.
    substitutions: dict[str, Any] = {}
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
