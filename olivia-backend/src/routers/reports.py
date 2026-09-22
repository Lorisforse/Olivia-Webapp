from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from typing import Optional

from bson import DBRef, ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from src.database import get_database
from src.models.helpers import extract
from src.schemas.reports import (
    CohortAttentionPatient,
    CohortDayPoint,
    CohortHungerBreakdown,
    CohortMoodBreakdown,
    CohortReportResponse,
    CohortSleepBreakdown,
    DailyIndicators,
    DailyReportResponse,
    WeeklyIndicators,
    WeeklyReportResponse,
)

router = APIRouter()

# "completa" vale 1 pasto pieno, "parziale" mezzo, "nulla" zero: la media sui
# pasti loggati in un giorno diventa una % di aderenza 0-100 per quel giorno.
_ADHERENCE_SCORE = {"completa": 1.0, "parziale": 0.5, "nulla": 0.0}
# stessa logica per il gradimento: "soddisfatto" pieno, "neutro" mezzo, "insoddisfatto" zero.
_SATISFACTION_SCORE = {"soddisfatto": 1.0, "neutro": 0.5, "insoddisfatto": 0.0}
_MEAL_FIELDS = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner"]


def _day_meal_pct(meal_indicators: dict, score_map: dict) -> Optional[float]:
    scores = [score_map[v] for f in _MEAL_FIELDS if (v := meal_indicators.get(f)) in score_map]
    if not scores:
        return None
    return round(sum(scores) / len(scores) * 100, 1)


def _day_adherence_pct(diet_compliance: dict) -> Optional[float]:
    return _day_meal_pct(diet_compliance, _ADHERENCE_SCORE)


def _mood_avg(mood: dict) -> Optional[float]:
    vals = [v for v in (mood.get("morning"), mood.get("afternoon"), mood.get("evening")) if v is not None]
    if not vals:
        return None
    return sum(vals) / len(vals)


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


@router.get("/reports/cohort", response_model=CohortReportResponse)
async def get_cohort_report(
    days: int = Query(14, ge=1, le=90),
    db=Depends(get_database),
):
    """Vista aggregata per la home page: solo pazienti collegati al bot
    (chat_id valorizzato) e non disattivati. Percorso `/patients/reports/cohort`
    (non `/patients/{patient_id}/...`): con soli 2 segmenti dopo il prefisso
    non può mai essere scambiato per un patient_id dalle altre rotte."""
    today = date.today()
    start = today - timedelta(days=days - 1)
    week_start = today - timedelta(days=6)

    patients = await db["users"].find(
        {"chat_id": {"$ne": None}, "active": {"$ne": False}},
        {"_id": 1, "profile.name": 1},
    ).to_list(length=None)
    patient_ids = [p["_id"] for p in patients]
    name_by_id = {p["_id"]: extract(p.get("profile", {}).get("name")) for p in patients}

    if not patient_ids:
        return CohortReportResponse(
            days=days, active_patients=0, daily=[], attention=[], mood=CohortMoodBreakdown(),
        )

    docs = await db["daily-reports"].find({
        "user.$id": {"$in": patient_ids},
        **_date_filter(start, None),
    }).to_list(length=None)

    by_day_adherence: dict[str, list[float]] = defaultdict(list)
    by_day_hydration: dict[str, list[float]] = defaultdict(list)
    by_day_satisfaction: dict[str, list[float]] = defaultdict(list)
    by_day_messages: dict[str, list[float]] = defaultdict(list)
    by_patient_week: dict[ObjectId, list[float]] = defaultdict(list)
    mood_by_patient: dict[ObjectId, list[float]] = defaultdict(list)
    sleep_by_patient: dict[ObjectId, list[str]] = defaultdict(list)
    hunger_by_patient: dict[ObjectId, list[str]] = defaultdict(list)

    for doc in docs:
        raw_date = doc.get("date")
        d = raw_date.date() if isinstance(raw_date, datetime) else raw_date
        user_ref = doc.get("user")
        pid = user_ref.id if isinstance(user_ref, DBRef) else None
        if d is None or pid is None:
            continue
        date_str = d.isoformat()
        indicators = doc.get("indicators") or {}

        pct = _day_adherence_pct(indicators.get("diet_compliance") or {})
        if pct is not None:
            by_day_adherence[date_str].append(pct)
            if d >= week_start:
                by_patient_week[pid].append(pct)

        hydration = indicators.get("hydration")
        if hydration is not None:
            by_day_hydration[date_str].append(hydration)

        satisfaction_pct = _day_meal_pct(indicators.get("meal_satisfaction") or {}, _SATISFACTION_SCORE)
        if satisfaction_pct is not None:
            by_day_satisfaction[date_str].append(satisfaction_pct)

        messages_sent = (indicators.get("engagement") or {}).get("messages_sent")
        if messages_sent is not None:
            by_day_messages[date_str].append(messages_sent)

        mood_avg = _mood_avg(indicators.get("mood") or {})
        if mood_avg is not None:
            mood_by_patient[pid].append(mood_avg)

        sleep_quality = indicators.get("sleep_quality")
        if sleep_quality:
            sleep_by_patient[pid].append(sleep_quality)

        hunger = indicators.get("hunger")
        if hunger:
            hunger_by_patient[pid].append(hunger)

    daily_points = []
    for i in range(days):
        d = start + timedelta(days=i)
        date_str = d.isoformat()
        adherences = by_day_adherence.get(date_str, [])
        hydrations = by_day_hydration.get(date_str, [])
        satisfactions = by_day_satisfaction.get(date_str, [])
        messages = by_day_messages.get(date_str, [])
        daily_points.append(CohortDayPoint(
            date=date_str,
            adherence_pct=round(sum(adherences) / len(adherences), 1) if adherences else None,
            hydration_ml=round(sum(hydrations) / len(hydrations), 0) if hydrations else None,
            satisfaction_pct=round(sum(satisfactions) / len(satisfactions), 1) if satisfactions else None,
            messages_avg=round(sum(messages) / len(messages), 1) if messages else None,
        ))

    all_adherence_vals = [p.adherence_pct for p in daily_points if p.adherence_pct is not None]
    all_hydration_vals = [p.hydration_ml for p in daily_points if p.hydration_ml is not None]
    all_satisfaction_vals = [p.satisfaction_pct for p in daily_points if p.satisfaction_pct is not None]
    all_messages_vals = [p.messages_avg for p in daily_points if p.messages_avg is not None]

    # "Serve attenzione": aderenza media ultimi 7gg, solo chi ha almeno 2 giorni
    # loggati (un solo giorno storto non basta a segnalare nessuno).
    attention = []
    for pid, vals in by_patient_week.items():
        if len(vals) < 2:
            continue
        attention.append(CohortAttentionPatient(
            patient_id=str(pid),
            name=name_by_id.get(pid),
            adherence_pct=round(sum(vals) / len(vals), 1),
            days_logged=len(vals),
        ))
    attention.sort(key=lambda a: a.adherence_pct)
    attention = attention[:5]

    mood = CohortMoodBreakdown()
    for pid in patient_ids:
        vals = mood_by_patient.get(pid, [])
        if not vals:
            mood.senza_dati += 1
            continue
        avg = sum(vals) / len(vals)
        if avg > 0.2:
            mood.sereno += 1
        elif avg < -0.2:
            mood.in_difficolta += 1
        else:
            mood.neutro += 1

    # Sonno/fame sono categorici (non numerici come l'umore): per ogni paziente si
    # prende il valore più frequente registrato nel periodo (moda), non una media.
    sleep = CohortSleepBreakdown()
    for pid in patient_ids:
        vals = sleep_by_patient.get(pid, [])
        if not vals:
            sleep.senza_dati += 1
            continue
        mode = Counter(vals).most_common(1)[0][0]
        if mode == "buona":
            sleep.buona += 1
        elif mode == "discreta":
            sleep.discreta += 1
        elif mode == "scarsa":
            sleep.scarsa += 1
        else:
            sleep.senza_dati += 1

    hunger = CohortHungerBreakdown()
    for pid in patient_ids:
        vals = hunger_by_patient.get(pid, [])
        if not vals:
            hunger.senza_dati += 1
            continue
        mode = Counter(vals).most_common(1)[0][0]
        if mode == "bassa":
            hunger.bassa += 1
        elif mode == "moderata":
            hunger.moderata += 1
        elif mode == "alta":
            hunger.alta += 1
        else:
            hunger.senza_dati += 1

    return CohortReportResponse(
        days=days,
        active_patients=len(patient_ids),
        avg_adherence_pct=round(sum(all_adherence_vals) / len(all_adherence_vals), 1) if all_adherence_vals else None,
        avg_hydration_ml=round(sum(all_hydration_vals) / len(all_hydration_vals), 0) if all_hydration_vals else None,
        avg_satisfaction_pct=round(sum(all_satisfaction_vals) / len(all_satisfaction_vals), 1) if all_satisfaction_vals else None,
        avg_messages=round(sum(all_messages_vals) / len(all_messages_vals), 1) if all_messages_vals else None,
        daily=daily_points,
        attention=attention,
        mood=mood,
        sleep=sleep,
        hunger=hunger,
    )
