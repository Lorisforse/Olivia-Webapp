"""Sospende automaticamente i pazienti che hanno finito l'onboarding col bot ma
non hanno ancora una dieta assegnata, e li riattiva quando la dieta arriva
(src/routers/patients.py::assign_diet). Usa lo stesso identico meccanismo di
deactivate_patient/reactivate_patient (src/routers/patients.py): sposta
chat_id/patient_id in archived_*, cosa che il bot già interpreta come "utente
non trovato" e blocca del tutto (olivia-chatbot/src/user.py::get_or_update_user).

Il bot non ha nessun modo di avvisarci quando finisce l'onboarding (nessun
webhook), quindi lo deduciamo controllando periodicamente su Mongo se il
profilo è completo, con lo stesso criterio del bot stesso
(OnboardingHandler.get_missing_fields(enabled_only=True) in
olivia-chatbot/src/handlers/impl/onboarding.py): i 13 campi sempre richiesti,
più le due domande sull'attività fisica solo se physical_activity è positivo.
"""

import asyncio
import logging
from datetime import datetime

from src.database import db

logger = logging.getLogger(__name__)

DEACTIVATED_REASON_PENDING_DIET = "pending_diet"

_ONBOARDING_REQUIRED_FIELDS = [
    "name", "gender", "age", "job", "living_at",
    "weight", "height",
    "wakes_up_at", "goes_to_sleep_at", "breakfast_at", "lunch_at", "dinner_at",
    "physical_activity",
]
_ONBOARDING_CONDITIONAL_FIELDS = ["physical_activity_which", "physical_activity_frequency"]


def _is_set(profile: dict, field: str) -> bool:
    return profile.get(field, {}).get("state", "unknown") != "unknown"


def onboarding_complete(profile: dict) -> bool:
    if not all(_is_set(profile, f) for f in _ONBOARDING_REQUIRED_FIELDS):
        return False
    if profile.get("physical_activity", {}).get("value"):
        return all(_is_set(profile, f) for f in _ONBOARDING_CONDITIONAL_FIELDS)
    return True


def archive_bot_link(doc: dict) -> tuple[dict, dict]:
    """Costruisce gli update Mongo che scollegano il paziente dal bot: usato sia
    dalla disattivazione manuale sia da questa sospensione automatica."""
    update_set = {}
    update_unset = {}
    if doc.get("chat_id") is not None:
        update_set["archived_chat_id"] = doc["chat_id"]
        update_unset["chat_id"] = ""
    if doc.get("patient_id") is not None:
        update_set["archived_patient_id"] = doc["patient_id"]
        update_unset["patient_id"] = ""
    return update_set, update_unset


async def suspend_patients_pending_diet() -> int:
    suspended = 0
    cursor = db["users"].find({
        "active": True,
        "active_nutrition_plan": None,
        "chat_id": {"$ne": None},
    })
    async for doc in cursor:
        if not onboarding_complete(doc.get("profile", {})):
            continue
        update_set, update_unset = archive_bot_link(doc)
        update_set["active"] = False
        update_set["deactivated_at"] = datetime.now()
        update_set["deactivated_reason"] = DEACTIVATED_REASON_PENDING_DIET
        await db["users"].update_one({"_id": doc["_id"]}, {"$set": update_set, "$unset": update_unset})
        suspended += 1
        logger.info("Paziente %s sospeso in attesa di dieta (onboarding completato)", doc["_id"])
    return suspended


async def pending_diet_suspension_loop(interval_seconds: int = 300) -> None:
    while True:
        try:
            await suspend_patients_pending_diet()
        except Exception:
            logger.exception("Errore nel controllo periodico pazienti in attesa di dieta")
        await asyncio.sleep(interval_seconds)
