import asyncio
from datetime import date, datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from src.database import get_database
from src.schemas.logs import DayLogs, HydrationEntry, LogsResponse, MealEntry, WeightEntry, WellnessEntry

router = APIRouter()


def _oid(patient_id: str) -> ObjectId:
    try:
        return ObjectId(patient_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Patient not found")


def _to_date_str(val) -> str:
    if isinstance(val, datetime):
        return val.date().isoformat()
    if isinstance(val, date):
        return val.isoformat()
    return str(val)[:10]


def _build_date_filter(from_date: Optional[date], to_date: Optional[date]) -> dict:
    f: dict = {}
    if from_date:
        f["$gte"] = datetime(from_date.year, from_date.month, from_date.day)
    if to_date:
        f["$lte"] = datetime(to_date.year, to_date.month, to_date.day, 23, 59, 59)
    return {"date": f} if f else {}


def _get_or_create_day(days: dict, val) -> DayLogs:
    ds = _to_date_str(val)
    if ds not in days:
        days[ds] = DayLogs(date=ds)
    return days[ds]


@router.get("/{patient_id}/logs", response_model=LogsResponse)
async def get_patient_logs(
    patient_id: str,
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    db=Depends(get_database),
):
    user_oid = _oid(patient_id)
    if not await db["users"].find_one({"_id": user_oid}, {"_id": 1}):
        raise HTTPException(status_code=404, detail="Patient not found")

    query = {"user.$id": user_oid, **_build_date_filter(from_date, to_date)}

    meal_docs, weight_docs, hydration_docs, wellness_docs = await asyncio.gather(
        db["meal-logs"].find(query).to_list(length=None),
        db["weight-logs"].find(query).to_list(length=None),
        db["hydration-logs"].find(query).to_list(length=None),
        db["wellness-logs"].find(query).to_list(length=None),
    )

    days: dict[str, DayLogs] = {}

    for doc in meal_docs:
        day = _get_or_create_day(days, doc.get("date"))
        for m in doc.get("meals", []):
            day.meals.append(MealEntry(
                meal_type=m.get("meal_type"),
                food=m.get("food", []),
                satisfaction=m.get("satisfaction"),
                adherence=m.get("adherence"),
                adherence_reason=m.get("adherence_reason"),
                created_at=m.get("created_at"),
            ))

    for doc in weight_docs:
        day = _get_or_create_day(days, doc.get("date"))
        for w in doc.get("weights", []):
            day.weights.append(WeightEntry(
                value_kg=w.get("value_kg"),
                created_at=w.get("created_at"),
            ))

    for doc in hydration_docs:
        day = _get_or_create_day(days, doc.get("date"))
        for h in doc.get("hydrations", []):
            day.hydrations.append(HydrationEntry(
                value_ml=h.get("value_ml"),
                created_at=h.get("created_at"),
            ))

    for doc in wellness_docs:
        day = _get_or_create_day(days, doc.get("date"))
        for e in doc.get("entries", []):
            etype = e.get("type", "")
            day.wellness.append(WellnessEntry(
                type=etype,
                mood=e.get("mood") if etype == "mood" else None,
                cause=e.get("cause") if etype == "mood" else None,
                sleep_quality=e.get("sleep_quality") if etype == "sleep" else None,
                hunger=e.get("hunger") if etype == "hunger" else None,
                created_at=e.get("created_at"),
            ))

    return LogsResponse(days=sorted(days.values(), key=lambda d: d.date))
