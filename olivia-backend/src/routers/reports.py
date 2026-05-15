from datetime import date, datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from src.database import get_database
from src.schemas.reports import (
    DailyIndicators,
    DailyReportResponse,
    WeeklyIndicators,
    WeeklyReportResponse,
)

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


def _date_filter(from_date: Optional[date], to_date: Optional[date]) -> dict:
    f: dict = {}
    if from_date:
        f["$gte"] = datetime(from_date.year, from_date.month, from_date.day)
    if to_date:
        f["$lte"] = datetime(to_date.year, to_date.month, to_date.day, 23, 59, 59)
    return {"date": f} if f else {}


@router.get("/{patient_id}/reports/daily", response_model=list[DailyReportResponse])
async def get_daily_reports(
    patient_id: str,
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    db=Depends(get_database),
):
    user_oid = _oid(patient_id)
    if not await db["users"].find_one({"_id": user_oid}, {"_id": 1}):
        raise HTTPException(status_code=404, detail="Patient not found")

    query = {"user.$id": user_oid, **_date_filter(from_date, to_date)}
    docs = await db["daily-reports"].find(query).sort("date", 1).to_list(length=None)

    result = []
    for doc in docs:
        try:
            indicators = DailyIndicators(**doc.get("indicators", {}))
        except Exception:
            indicators = DailyIndicators()
        result.append(DailyReportResponse(
            id=str(doc["_id"]),
            date=_to_date_str(doc.get("date")),
            indicators=indicators,
            summary=doc.get("summary"),
        ))
    return result


@router.get("/{patient_id}/reports/weekly", response_model=list[WeeklyReportResponse])
async def get_weekly_reports(
    patient_id: str,
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    db=Depends(get_database),
):
    user_oid = _oid(patient_id)
    if not await db["users"].find_one({"_id": user_oid}, {"_id": 1}):
        raise HTTPException(status_code=404, detail="Patient not found")

    docs = await db["weekly-reports"].find({"user.$id": user_oid}).to_list(length=None)

    result = []
    for doc in docs:
        week_raw = doc.get("week", {})
        if not isinstance(week_raw, dict):
            week_raw = {"raw": str(week_raw)}
        try:
            indicators = WeeklyIndicators(**doc.get("indicators", {}))
        except Exception:
            indicators = WeeklyIndicators()
        result.append(WeeklyReportResponse(
            id=str(doc["_id"]),
            week=week_raw,
            indicators=indicators,
        ))
    return result
