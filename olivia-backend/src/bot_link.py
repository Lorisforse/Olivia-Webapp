"""Codice di collegamento paziente-bot (`users.patient_id`).

Il bot collega una chat Telegram a un paziente con `/start <patient_id>`
(olivia-chatbot/src/user.py::get_or_update_user) e, se la chat è nuova, scrive
il proprio chat_id sul paziente anche se ne aveva già uno: chi conosce il
codice può quindi collegarsi a quel paziente. Per questo il codice è un valore
casuale e non l'_id del documento, che compare negli URL della webapp
(/pazienti/<_id>) e quindi è visibile a chiunque abbia accesso alla dashboard.
"""

import logging
import secrets

from src.database import db

logger = logging.getLogger(__name__)


def new_link_code() -> str:
    # 24 caratteri esadecimali minuscoli: stessa forma dell'_id usato in
    # precedenza, e immune al message.lower() che il bot applica agli argomenti.
    return secrets.token_hex(12)


async def rotate_guessable_link_codes() -> int:
    """Sostituisce con un codice casuale i `patient_id` (e `archived_patient_id`)
    uguali all'_id del paziente, generati dalle versioni precedenti del backend.
    Idempotente: gira a ogni avvio e, dopo la prima volta, non trova più nulla.
    I pazienti già collegati non ne risentono (il bot li riconosce dal chat_id);
    per quelli ancora in attesa il vecchio QR smette di funzionare e va
    rigenerato dalla scheda."""
    rotated = 0
    for field in ("patient_id", "archived_patient_id"):
        async for doc in db["users"].find({field: {"$type": "string"}}, {field: 1}):
            if doc[field] != str(doc["_id"]):
                continue
            await db["users"].update_one(
                {"_id": doc["_id"], field: doc[field]},
                {"$set": {field: new_link_code()}},
            )
            rotated += 1
    if rotated:
        logger.info("Sostituiti %d codici di collegamento bot ricavabili dall'_id", rotated)
    return rotated
