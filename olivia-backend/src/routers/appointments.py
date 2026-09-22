from datetime import datetime, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from src.database import get_appointments_col, get_database
from src.models.helpers import extract
from src.schemas.appointment import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentsConfig,
    AppointmentStatusUpdate,
    AppointmentUpdate,
)
from src.settings import settings

router = APIRouter()

LOCAL_TZ = ZoneInfo("Europe/Rome")

# Sotto questa distanza dall'appuntamento non ha senso chiedere conferma.
MIN_REMINDER_LEAD = timedelta(hours=2)


def _oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception:
        raise HTTPException(status_code=404, detail="Appointment not found")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _to_utc_naive(dt: datetime) -> datetime:
    """Le date in Mongo sono UTC senza tzinfo, come le scrive anche il bot."""
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def _as_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None or dt.tzinfo is not None:
        return dt
    return dt.replace(tzinfo=timezone.utc)


def _reminder_at(scheduled_at: datetime) -> Optional[datetime]:
    """Promemoria N giorni prima alle ore configurate (ora italiana). Se quel
    momento è già passato parte subito, purché l'appuntamento non sia troppo vicino."""
    now = _utcnow()
    if scheduled_at - now < MIN_REMINDER_LEAD:
        return None

    local = scheduled_at.replace(tzinfo=timezone.utc).astimezone(LOCAL_TZ)
    target_local = (local - timedelta(days=settings.appointment_reminder_days)).replace(
        hour=settings.appointment_reminder_hour, minute=0, second=0, microsecond=0
    )
    target = _to_utc_naive(target_local)
    return max(target, now)


async def _patients_by_id(db, ids: list[ObjectId]) -> dict:
    if not ids:
        return {}
    cursor = db["users"].find(
        {"_id": {"$in": ids}},
        {"profile.name": 1, "chat_id": 1, "active": 1},
    )
    return {doc["_id"]: doc async for doc in cursor}


def _to_response(doc: dict, patient: Optional[dict]) -> AppointmentResponse:
    profile = (patient or {}).get("profile", {})
    return AppointmentResponse(
        id=str(doc["_id"]),
        patient_id=str(doc["user_id"]),
        patient_name=extract(profile.get("name")) if patient else None,
        patient_linked=bool(patient and patient.get("chat_id") is not None),
        patient_active=bool(patient and patient.get("active", True)),
        scheduled_at=_as_utc(doc["scheduled_at"]),
        duration_minutes=doc.get("duration_minutes", 30),
        notes=doc.get("notes"),
        status=doc.get("status", "scheduled"),
        reminder_at=_as_utc(doc.get("reminder_at")),
        reminder_sent_at=_as_utc(doc.get("reminder_sent_at")),
        responded_at=_as_utc(doc.get("responded_at")),
        responded_via=doc.get("responded_via"),
        created_at=_as_utc(doc["created_at"]),
        updated_at=_as_utc(doc.get("updated_at", doc["created_at"])),
    )


async def _load(db, appointment_id: str) -> dict:
    doc = await get_appointments_col(db).find_one({"_id": _oid(appointment_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return doc


async def _respond(db, doc: dict) -> AppointmentResponse:
    patients = await _patients_by_id(db, [doc["user_id"]])
    return _to_response(doc, patients.get(doc["user_id"]))


@router.get("/config", response_model=AppointmentsConfig)
async def appointments_config():
    return AppointmentsConfig(
        bot_reminders_enabled=settings.appointments_bot_enabled,
        reminder_days=settings.appointment_reminder_days,
        reminder_hour=settings.appointment_reminder_hour,
    )


@router.get("/", response_model=list[AppointmentResponse])
async def list_appointments(
    db=Depends(get_database),
    start: Optional[datetime] = Query(default=None, alias="from"),
    end: Optional[datetime] = Query(default=None, alias="to"),
    patient_id: Optional[str] = None,
    limit: int = Query(default=500, ge=1, le=1000),
):
    query: dict = {}
    if patient_id:
        query["user_id"] = _oid(patient_id)
    if start or end:
        query["scheduled_at"] = {}
        if start:
            query["scheduled_at"]["$gte"] = _to_utc_naive(start)
        if end:
            query["scheduled_at"]["$lt"] = _to_utc_naive(end)

    docs = await get_appointments_col(db).find(query).sort("scheduled_at", 1).limit(limit).to_list(length=limit)
    patients = await _patients_by_id(db, list({d["user_id"] for d in docs}))
    return [_to_response(d, patients.get(d["user_id"])) for d in docs]


@router.post("/", response_model=AppointmentResponse, status_code=201)
async def create_appointment(payload: AppointmentCreate, db=Depends(get_database)):
    patient_oid = _oid(payload.patient_id)
    patient = await db["users"].find_one({"_id": patient_oid}, {"_id": 1})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    now = _utcnow()
    scheduled_at = _to_utc_naive(payload.scheduled_at)
    doc = {
        "user_id": patient_oid,
        "scheduled_at": scheduled_at,
        "duration_minutes": payload.duration_minutes,
        "notes": (payload.notes or "").strip() or None,
        "status": "scheduled",
        "reminder_at": _reminder_at(scheduled_at),
        "reminder_sent_at": None,
        "reminder_seq": 0,
        "responded_at": None,
        "responded_via": None,
        "created_at": now,
        "updated_at": now,
    }
    result = await get_appointments_col(db).insert_one(doc)
    doc["_id"] = result.inserted_id
    return await _respond(db, doc)


@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(appointment_id: str, payload: AppointmentUpdate, db=Depends(get_database)):
    doc = await _load(db, appointment_id)
    update: dict = {"updated_at": _utcnow()}

    if payload.duration_minutes is not None:
        update["duration_minutes"] = payload.duration_minutes
    if payload.notes is not None:
        update["notes"] = payload.notes.strip() or None

    if payload.scheduled_at is not None:
        scheduled_at = _to_utc_naive(payload.scheduled_at)
        if scheduled_at != doc["scheduled_at"]:
            # Cambio data: la conferma precedente non vale più e il promemoria riparte.
            update.update({
                "scheduled_at": scheduled_at,
                "status": "scheduled",
                "reminder_at": _reminder_at(scheduled_at),
                "reminder_sent_at": None,
                "responded_at": None,
                "responded_via": None,
            })

    await get_appointments_col(db).update_one({"_id": doc["_id"]}, {"$set": update})
    return await _respond(db, await _load(db, appointment_id))


@router.post("/{appointment_id}/status", response_model=AppointmentResponse)
async def set_appointment_status(
    appointment_id: str, payload: AppointmentStatusUpdate, db=Depends(get_database)
):
    doc = await _load(db, appointment_id)
    now = _utcnow()
    update: dict = {"status": payload.status, "updated_at": now}
    if payload.status == "scheduled":
        update["responded_at"] = None
        update["responded_via"] = None
    else:
        update["responded_at"] = now
        update["responded_via"] = "webapp"

    await get_appointments_col(db).update_one({"_id": doc["_id"]}, {"$set": update})
    return await _respond(db, await _load(db, appointment_id))


@router.delete("/{appointment_id}", status_code=204)
async def delete_appointment(appointment_id: str, db=Depends(get_database)):
    result = await get_appointments_col(db).delete_one({"_id": _oid(appointment_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
