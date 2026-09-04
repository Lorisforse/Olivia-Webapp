from datetime import datetime
from typing import Optional
from urllib.parse import quote

import segno
from bson import DBRef, ObjectId
from fastapi import APIRouter, Depends, HTTPException

from src.database import get_database
from src.models.helpers import extract, sanitize_bson
from src.schemas.diet import DietResponse
from src.schemas.patient import (
    OnboardingResponse,
    PatientCreate,
    PatientDetail,
    PatientListItem,
    PatientUpdate,
)
from src.settings import settings

router = APIRouter()


def _diet_id(diet_ref) -> str | None:
    if diet_ref is None:
        return None
    if isinstance(diet_ref, DBRef):
        return str(diet_ref.id)
    if isinstance(diet_ref, dict) and "$id" in diet_ref:
        return str(diet_ref["$id"])
    return None

# Collection scritte dal bot che referenziano il paziente con un DBRef
# `user` (Beanie `Link[User]`) — vanno ripulite quando il paziente viene
# eliminato, altrimenti restano log/report orfani nel Mongo condiviso.
_PATIENT_LOG_COLLECTIONS = [
    "meal-logs", "hydration-logs", "weight-logs", "wellness-logs",
    "daily-reports", "weekly-reports", "chat-logs", "training-logs",
    "notification-logs",
]

_PROFILE_FIELDS = [
    "name", "gender", "age", "job", "living_at", "phone", "email",
    "weight", "height",
    "goal", "motivation", "motivation_cause",
    "wakes_up_at", "goes_to_sleep_at", "breakfast_at", "lunch_at", "dinner_at",
    "food_relationship", "dislikes", "allergies", "preferences",
    "emotional_eating", "emotional_eating_what", "emotional_eating_at",
    "physical_activity", "physical_activity_which", "physical_activity_frequency",
    "average_sleep_hours", "sleep_quality", "smoker", "activity_level", "notes",
    "personal_qualities", "personal_flaws", "identifies_in_garment",
]


def _oid(patient_id: str) -> ObjectId:
    try:
        return ObjectId(patient_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Patient not found")


def _doc_to_list_item(doc: dict) -> PatientListItem:
    profile = doc.get("profile", {})
    diet_id = _diet_id(doc.get("active_nutrition_plan"))
    return PatientListItem(
        id=str(doc["_id"]),
        chat_id=doc.get("chat_id"),
        username=doc.get("username"),
        name=extract(profile.get("name")),
        gender=extract(profile.get("gender")),
        age=extract(profile.get("age")),
        weight=extract(profile.get("weight")),
        height=extract(profile.get("height")),
        living_at=extract(profile.get("living_at")),
        goal=extract(profile.get("goal")),
        active_diet_plan_id=diet_id,
        created_at=doc.get("created_at"),
        last_interaction_at=doc.get("last_interaction_at"),
    )


def _doc_to_detail(doc: dict) -> PatientDetail:
    profile = doc.get("profile", {})
    diet_id = _diet_id(doc.get("active_nutrition_plan"))
    return PatientDetail(
        id=str(doc["_id"]),
        chat_id=doc.get("chat_id"),
        username=doc.get("username"),
        name=extract(profile.get("name")),
        gender=extract(profile.get("gender")),
        age=extract(profile.get("age")),
        job=extract(profile.get("job")),
        living_at=extract(profile.get("living_at")),
        phone=extract(profile.get("phone")),
        email=extract(profile.get("email")),
        weight=extract(profile.get("weight")),
        height=extract(profile.get("height")),
        goal=extract(profile.get("goal")),
        motivation=extract(profile.get("motivation")),
        motivation_cause=extract(profile.get("motivation_cause")),
        wakes_up_at=extract(profile.get("wakes_up_at")),
        goes_to_sleep_at=extract(profile.get("goes_to_sleep_at")),
        breakfast_at=extract(profile.get("breakfast_at")),
        lunch_at=extract(profile.get("lunch_at")),
        dinner_at=extract(profile.get("dinner_at")),
        food_relationship=extract(profile.get("food_relationship")),
        dislikes=extract(profile.get("dislikes")),
        allergies=extract(profile.get("allergies")),
        preferences=extract(profile.get("preferences")),
        emotional_eating=extract(profile.get("emotional_eating")),
        emotional_eating_what=extract(profile.get("emotional_eating_what")),
        emotional_eating_at=extract(profile.get("emotional_eating_at")),
        physical_activity=extract(profile.get("physical_activity")),
        physical_activity_which=extract(profile.get("physical_activity_which")),
        physical_activity_frequency=extract(profile.get("physical_activity_frequency")),
        average_sleep_hours=extract(profile.get("average_sleep_hours")),
        sleep_quality=extract(profile.get("sleep_quality")),
        smoker=extract(profile.get("smoker")),
        activity_level=extract(profile.get("activity_level")),
        notes=extract(profile.get("notes")),
        personal_qualities=extract(profile.get("personal_qualities")),
        personal_flaws=extract(profile.get("personal_flaws")),
        identifies_in_garment=extract(profile.get("identifies_in_garment")),
        created_at=doc.get("created_at"),
        last_interaction_at=doc.get("last_interaction_at"),
        active_diet_plan_id=diet_id,
    )


@router.get("/", response_model=list[PatientListItem])
async def list_patients(db=Depends(get_database)):
    docs = await db["users"].find().to_list(length=None)
    return [_doc_to_list_item(doc) for doc in docs]


@router.post("/", response_model=PatientDetail, status_code=201)
async def create_patient(payload: PatientCreate, db=Depends(get_database)):
    profile = {f: {"value": None, "state": "unknown"} for f in _PROFILE_FIELDS}
    profile["name"] = {"value": payload.full_name, "state": "set"}
    for field in _PROFILE_FIELDS:
        if field == "name":
            continue
        val = getattr(payload, field, None)
        if val is not None:
            profile[field] = {"value": val, "state": "set"}

    # `patient_id` è la chiave con cui il bot collega il paziente via
    # `/start <patient_id>` (olivia-chatbot/src/user.py::get_or_update_user).
    # Il bot lo definisce come stringa libera; noi usiamo l'_id in esadecimale.
    oid = ObjectId()
    doc = {
        "_id": oid,
        "patient_id": str(oid),
        "chat_id": None,
        "username": None,
        "profile": profile,
        "active_nutrition_plan": None,
        "notifications": [],
        "created_at": datetime.now(),
        "last_interaction_at": None,
    }
    await db["users"].insert_one(doc)
    created = await db["users"].find_one({"_id": oid})
    return _doc_to_detail(created)


@router.delete("/{patient_id}", status_code=204)
async def delete_patient(patient_id: str, db=Depends(get_database)):
    oid = _oid(patient_id)
    if not await db["users"].find_one({"_id": oid}, {"_id": 1}):
        raise HTTPException(status_code=404, detail="Patient not found")

    for collection in _PATIENT_LOG_COLLECTIONS:
        await db[collection].delete_many({"user.$id": oid})

    await db["users"].delete_one({"_id": oid})


@router.get("/{patient_id}", response_model=PatientDetail)
async def get_patient(patient_id: str, db=Depends(get_database)):
    doc = await db["users"].find_one({"_id": _oid(patient_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")
    return _doc_to_detail(doc)


@router.get("/{patient_id}/onboarding", response_model=OnboardingResponse)
async def patient_onboarding(patient_id: str, db=Depends(get_database)):
    """QR + deep link per collegare il paziente al bot Telegram."""
    oid = _oid(patient_id)
    doc = await db["users"].find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Pazienti creati prima dell'introduzione di `patient_id` (o dal bot senza
    # averlo impostato): lo si riempie ora con l'_id, senza mai sovrascriverne
    # uno già presente.
    pid = doc.get("patient_id")
    if not pid:
        pid = str(doc["_id"])
        await db["users"].update_one({"_id": oid}, {"$set": {"patient_id": pid}})

    bot_username = settings.bot_username.lstrip("@")

    # `?start=<pid>` (deep link "ufficiale" dei bot) su alcuni client / passaggi
    # browser->app perde il parametro e arriva un `/start` nudo. `?text=` invece
    # precompila il messaggio nella chat in modo visibile e deterministico: il
    # paziente vede `/start <pid>` gia' scritto e deve solo premere invio.
    deep_link = f"https://t.me/{bot_username}?text={quote(f'/start {pid}', safe='')}"
    qr_svg = segno.make(deep_link, error="m").svg_data_uri(scale=5, border=2, dark="#1f2419")

    return OnboardingResponse(
        patient_id=pid,
        bot_username=bot_username,
        deep_link=deep_link,
        qr_svg=qr_svg,
        connected=doc.get("chat_id") is not None,
    )


@router.patch("/{patient_id}", response_model=PatientDetail)
async def update_patient(patient_id: str, payload: PatientUpdate, db=Depends(get_database)):
    oid = _oid(patient_id)
    if not await db["users"].find_one({"_id": oid}, {"_id": 1}):
        raise HTTPException(status_code=404, detail="Patient not found")

    updates = {}
    for field, value in payload.model_dump(exclude_none=True).items():
        updates[f"profile.{field}"] = {"value": value, "state": "set"}

    if updates:
        await db["users"].update_one({"_id": oid}, {"$set": updates})

    doc = await db["users"].find_one({"_id": oid})
    return _doc_to_detail(doc)


@router.get("/{patient_id}/diet", response_model=DietResponse)
async def get_patient_diet(patient_id: str, db=Depends(get_database)):
    doc = await db["users"].find_one({"_id": _oid(patient_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")

    diet_ref = doc.get("active_nutrition_plan")
    diet_oid = _diet_id(diet_ref)
    if not diet_oid:
        raise HTTPException(status_code=404, detail="No active diet plan")

    diet_object_id = ObjectId(diet_oid)
    diet_doc = await db["nutrition-plans"].find_one({"_id": diet_object_id})
    if not diet_doc:
        raise HTTPException(status_code=404, detail="Diet plan not found")

    has_pdf = await db["webapp-diet-pdfs"].find_one({"plan_id": diet_object_id}, {"_id": 1}) is not None
    return DietResponse(
        id=str(diet_doc["_id"]),
        name=diet_doc.get("name", ""),
        tips=diet_doc.get("tips", []),
        weekly_plan=diet_doc.get("meal_plan", {}),
        substitutions=sanitize_bson(diet_doc.get("substitutions", "")),
        created_at=diet_object_id.generation_time,
        has_pdf=has_pdf,
    )


@router.post("/{patient_id}/diet/{diet_id}")
async def assign_diet(patient_id: str, diet_id: str, db=Depends(get_database)):
    oid = _oid(patient_id)
    if not await db["users"].find_one({"_id": oid}, {"_id": 1}):
        raise HTTPException(status_code=404, detail="Patient not found")

    try:
        diet_oid = ObjectId(diet_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid diet id")

    if not await db["nutrition-plans"].find_one({"_id": diet_oid}, {"_id": 1}):
        raise HTTPException(status_code=404, detail="Diet plan not found")

    await db["users"].update_one(
        {"_id": oid},
        {"$set": {"active_nutrition_plan": {"$ref": "nutrition-plans", "$id": diet_oid}}},
    )
    return {"ok": True}
