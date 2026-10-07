"""
Fa slittare in avanti le date dei dati di esempio, così i grafici della webapp
arrivano fino a ieri invece di fermarsi al giorno in cui sono stati generati.

Non cancella né ricrea pazienti: sposta di N giorni tutte le date di log, report
giornalieri, appuntamenti e dei campi created_at/last_interaction_at/
deactivated_at dei pazienti di esempio. N lo calcola da solo: è la distanza tra
l'ultimo giorno con dati veri e ieri. Rilanciabile quando serve.

Pazienti di esempio = non collegati a Telegram, oppure con un chat_id finto
degli script di seed (seed.py, seed_reports_demo.py, reset_test_usabilita.py).
I pazienti collegati a un account Telegram vero vengono saltati: i loro dati
arrivano già a oggi e spostarli li porterebbe nel futuro.

Il bot genera ogni notte un report giornaliero per tutti i pazienti, anche
quelli di esempio (olivia-chatbot/src/reports/manager.py): dopo l'ultimo giorno
di dati restano report vuoti, che andrebbero a sovrapporsi a quelli spostati.
Lo script cancella quindi i report successivi all'ultimo giorno di dati e, se
per lo stesso giorno ce n'è più di uno, tiene il primo non vuoto. I report vuoti
dentro lo storico restano: sono i giorni "silenziosi" voluti dai seed.

I weekly-reports non vengono toccati: la webapp non li usa.

Run (sul VPS, dentro il container del backend):
    docker exec -it olivia-backend python shift_demo_dates.py --dry-run
    docker exec -it olivia-backend python shift_demo_dates.py
"""
import argparse
import asyncio
import os
from datetime import datetime, timedelta

from motor.motor_asyncio import AsyncIOMotorClient

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://olivia:olivia@localhost:27017/olivia?authSource=admin")
DB_NAME = os.getenv("MONGODB_DB", "olivia")

LOG_COLLECTIONS = [
    "meal-logs", "weight-logs", "hydration-logs", "wellness-logs",
    "chat-logs", "notification-logs", "training-logs",
]
USER_DATE_FIELDS = ["created_at", "last_interaction_at", "deactivated_at"]
# chat_id // 1000 dei blocchi usati dagli script di seed: 100_000_000 + i,
# 200_000_000 + i, 500_000_000 + i, 600_000_001..8.
SEED_CHAT_ID_BLOCKS = {100_000, 200_000, 500_000, 600_000}


def is_demo(user: dict) -> bool:
    chat_id = user.get("chat_id") or user.get("archived_chat_id")
    return chat_id is None or chat_id // 1000 in SEED_CHAT_ID_BLOCKS


def shift(value, delta: timedelta):
    if isinstance(value, datetime):
        return value + delta
    if isinstance(value, dict):
        return {k: shift(v, delta) for k, v in value.items()}
    if isinstance(value, list):
        return [shift(v, delta) for v in value]
    return value


def ref_id(ref):
    # DBRef come lo restituisce pymongo, o dict {"$ref", "$id"}.
    return ref.id if hasattr(ref, "id") else ref["$id"]


def is_empty_report(report: dict) -> bool:
    ind = report.get("indicators") or {}
    if (ind.get("engagement") or {}).get("messages_sent"):
        return False
    for key in ("mood", "diet_compliance", "meal_satisfaction"):
        if any(v is not None for v in (ind.get(key) or {}).values()):
            return False
    return all(ind.get(k) is None for k in ("hydration", "weight", "sleep_quality", "hunger"))


async def last_data_day(db, user_filter: dict) -> datetime | None:
    last = None
    for coll in LOG_COLLECTIONS:
        doc = await db[coll].find_one(user_filter, {"date": 1}, sort=[("date", -1)])
        if doc and doc.get("date") and (last is None or doc["date"] > last):
            last = doc["date"]
    async for report in db["daily-reports"].find(user_filter, {"date": 1, "indicators": 1}).sort("date", -1):
        if not is_empty_report(report):
            if last is None or report["date"] > last:
                last = report["date"]
            break
    return last


async def shift_collection(db, coll: str, query: dict, keep: tuple[str, ...], delta: timedelta) -> int:
    count = 0
    async for doc in db[coll].find(query):
        fields = {k: shift(v, delta) for k, v in doc.items() if k not in keep}
        await db[coll].update_one({"_id": doc["_id"]}, {"$set": fields})
        count += 1
    return count


async def run(dry_run: bool, days: int | None):
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]

    users = await db["users"].find({}, {"chat_id": 1, "archived_chat_id": 1, "profile.name.value": 1}).to_list(None)
    demo_ids = [u["_id"] for u in users if is_demo(u)]
    skipped = [((u.get("profile") or {}).get("name") or {}).get("value") or str(u["_id"])
               for u in users if not is_demo(u)]
    print(f"Pazienti di esempio: {len(demo_ids)}. Saltati (collegati a Telegram): {', '.join(skipped) or 'nessuno'}")

    user_filter = {"user.$id": {"$in": demo_ids}}
    last = await last_data_day(db, user_filter)
    if last is None:
        print("Nessun dato da spostare.")
        client.close()
        return

    now = datetime.now()
    yesterday = datetime(now.year, now.month, now.day) - timedelta(days=1)
    if days is None:
        days = (yesterday - datetime(last.year, last.month, last.day)).days
    print(f"Ultimo giorno con dati: {last:%d/%m/%Y}. Slittamento: {days} giorni.")
    if days <= 0:
        print("I dati arrivano già a ieri: niente da fare.")
        client.close()
        return

    first_empty_day = datetime(last.year, last.month, last.day) + timedelta(days=1)
    after_ids, duplicate_ids, by_day = [], [], {}
    async for report in db["daily-reports"].find(user_filter, {"user": 1, "date": 1, "indicators": 1}).sort("_id", 1):
        if report["date"] >= first_empty_day:
            after_ids.append(report["_id"])
            continue
        by_day.setdefault((ref_id(report["user"]), report["date"]), []).append(report)
    for reports in by_day.values():
        keep = next((r for r in reports if not is_empty_report(r)), reports[0])
        duplicate_ids += [r["_id"] for r in reports if r is not keep]
    print(f"Report dopo l'ultimo giorno di dati (vuoti, del bot) da cancellare: {len(after_ids)}. "
          f"Report doppi da cancellare: {len(duplicate_ids)}.")

    if dry_run:
        print("--dry-run: nessuna modifica scritta.")
        client.close()
        return

    await db["daily-reports"].delete_many({"_id": {"$in": after_ids + duplicate_ids}})

    delta = timedelta(days=days)
    for coll in LOG_COLLECTIONS + ["daily-reports"]:
        n = await shift_collection(db, coll, user_filter, ("_id", "user"), delta)
        print(f"  {coll}: {n} documenti spostati")
    n = await shift_collection(db, "webapp-appointments", {"user_id": {"$in": demo_ids}}, ("_id", "user_id"), delta)
    print(f"  webapp-appointments: {n} documenti spostati")

    for user_id in demo_ids:
        doc = await db["users"].find_one({"_id": user_id}, {f: 1 for f in USER_DATE_FIELDS})
        fields = {f: doc[f] + delta for f in USER_DATE_FIELDS if isinstance(doc.get(f), datetime)}
        if fields:
            await db["users"].update_one({"_id": user_id}, {"$set": fields})
    print(f"  users: date di {len(demo_ids)} pazienti spostate")

    print("\nFatto: i dati di esempio ora arrivano fino a ieri.")
    client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fa slittare a ieri le date dei dati di esempio.")
    parser.add_argument("--dry-run", action="store_true", help="Mostra cosa farebbe senza scrivere nulla")
    parser.add_argument("--days", type=int, help="Numero di giorni forzato (di default lo calcola da solo)")
    args = parser.parse_args()
    asyncio.run(run(args.dry_run, args.days))
