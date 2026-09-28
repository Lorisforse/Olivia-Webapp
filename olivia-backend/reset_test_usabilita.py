"""
Prepara/ripristina il database di prova per i test di usabilita' del Capitolo 7
(sez. "Scenari d'uso"): 8 pazienti fissi + un piano dietetico condiviso, pensati
per far funzionare esattamente i 6 compiti della tesi.

Rilancialo dopo ogni partecipante: e' IDEMPOTENTE, cancella e ricrea da zero solo
le entita' che gestisce (i pazienti elencati in ROSTER, il piano "Mediterraneo
Base", ed eventuali residui del compito 3/6 lasciati dal partecipante precedente:
la paziente "Lucia Ferri" e il piano "Mediterranea 1600, fase 1"). Non tocca
nient'altro nel database.

Run:
    cd "Olivia webapp/Olivia-Webapp-Codice/olivia-backend"
    python reset_test_usabilita.py

Richiede il .env del backend (MONGODB_URL) e MongoDB attivo.
"""
import asyncio
import os
import random
from datetime import datetime, timedelta

from motor.motor_asyncio import AsyncIOMotorClient

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://olivia:olivia@localhost:27017/olivia?authSource=admin")
DB_NAME = "olivia"

# Nomi di cui questo script e' proprietario: alla partenza cancella tutto cio'
# che li riguarda, poi li ricrea. Nomi volutamente distinti da quelli di
# seed.py/seed_reports_demo.py per non confonderli con altri dati di sviluppo.
ROSTER_NAMES = [
    "Marco Neri", "Andrea Vitale", "Chiara Lombardi",
    "Sara Bruno", "Elisa Marchetti", "Federico Galli", "Ilaria Costa", "Tommaso Rinaldi",
]
LEFTOVER_NAMES = ["Lucia Ferri"]  # creata dal partecipante al compito 2, da ripulire
BASE_PLAN_NAME = "Mediterraneo Base"
LEFTOVER_PLAN_NAME = "Mediterranea 1600, fase 1"  # creato dal partecipante al compito 3

ALL_PROFILE_FIELDS = [
    "name", "gender", "age", "job", "living_at", "phone", "email",
    "weight", "height", "goal", "motivation", "motivation_cause",
    "wakes_up_at", "goes_to_sleep_at", "breakfast_at", "lunch_at", "dinner_at",
    "food_relationship", "dislikes", "allergies", "preferences",
    "emotional_eating", "emotional_eating_what", "emotional_eating_at",
    "physical_activity", "physical_activity_which", "physical_activity_frequency",
    "average_sleep_hours", "sleep_quality", "smoker", "activity_level", "notes",
    "personal_qualities", "personal_flaws", "identifies_in_garment",
]

BASE_PLAN = {
    "name": BASE_PLAN_NAME,
    "tips": [
        "Bere almeno 1,5-2 litri di acqua al giorno",
        "Preferire cereali integrali quando possibile",
        "Attivita' fisica leggera 30-45 minuti al giorno",
    ],
    "substitutions": "Pasta - Riso - Farro a parita' di grammatura.\nCarne bianca - Pesce magro - Legumi (raddoppiare la quantita').",
    "meal_plan": {
        day: {
            "colazione": "Latte parzialmente scremato 200 ml, fette biscottate integrali 4, marmellata 20 g",
            "spuntino mattutino": "Un frutto di stagione",
            "pranzo": "Pasta integrale 80 g con legumi, verdura di stagione",
            "spuntino pomeridiano": "Yogurt bianco 125 g",
            "cena": "Pesce azzurro 150 g, verdura, pane 50 g",
        }
        for day in ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"]
    },
}


def dbref(collection: str, oid):
    return {"$ref": collection, "$id": oid}


def build_profile(fields: dict) -> dict:
    profile = {f: {"value": None, "state": "unknown"} for f in ALL_PROFILE_FIELDS}
    for k, v in fields.items():
        profile[k] = {"value": v, "state": "set"}
    return profile


def base_fields(name, gender, age, job, living_at, goal, weight, height):
    return {
        "name": name, "gender": gender, "age": age, "job": job, "living_at": living_at,
        "weight": weight, "height": height, "goal": goal,
        "wakes_up_at": "07:00", "goes_to_sleep_at": "23:00",
        "breakfast_at": "08:00", "lunch_at": "13:00", "dinner_at": "20:00",
        "physical_activity": True, "physical_activity_which": "Camminata",
        "physical_activity_frequency": "2-3 volte a settimana",
    }


async def wipe_user_and_data(db, name: str):
    """Cancella lo user con questo nome (se esiste) e tutto cio' che lo referenzia."""
    doc = await db["users"].find_one({"profile.name.value": name})
    if not doc:
        return
    uid = doc["_id"]
    for coll in ["meal-logs", "weight-logs", "hydration-logs", "wellness-logs",
                 "daily-reports", "weekly-reports", "chat-logs", "notification-logs",
                 "training-logs", "webapp-diet-notifications"]:
        await db[coll].delete_many({"user.$id": uid})
    await db["users"].delete_one({"_id": uid})


async def wipe_plan_and_pdf(db, name: str):
    plan = await db["nutrition-plans"].find_one({"name": name})
    if not plan:
        return
    await db["webapp-diet-pdfs"].delete_many({"plan_id": plan["_id"]})
    await db["nutrition-plans"].delete_one({"_id": plan["_id"]})


async def make_patient(db, *, name, gender, age, job, living_at, goal, weight, height,
                        diet_id, connected: bool, rng_seed: int):
    fields = base_fields(name, gender, age, job, living_at, goal, weight, height)
    now = datetime.now()
    doc = {
        "chat_id": rng_seed if connected else None,
        "username": name.split()[0].lower() if connected else None,
        "profile": build_profile(fields),
        "active_nutrition_plan": dbref("nutrition-plans", diet_id) if diet_id else None,
        "notifications": [],
        "created_at": now - timedelta(days=60),
        "last_interaction_at": (now - timedelta(hours=rng_seed % 30 + 1)) if connected else None,
        "active": True,
    }
    result = await db["users"].insert_one(doc)
    uid = result.inserted_id
    await db["users"].update_one({"_id": uid}, {"$set": {"patient_id": str(uid)}})
    return uid


async def seed_daily_reports_andamento(db, uid, days: int, rng: random.Random):
    """Storico 'pulito' per Marco Neri: usato dal tab Andamento (grafici)."""
    now = datetime.now()
    today = datetime(now.year, now.month, now.day)
    weight = 88.0
    reports = []
    for i in range(days):
        d = today - timedelta(days=days - 1 - i)
        weight += rng.uniform(-0.15, 0.1)
        indicators = {
            "engagement": {
                "messages_sent": rng.randint(4, 14), "session_count": rng.randint(2, 5),
                "average_session_duration": round(rng.uniform(1.5, 6.0), 1),
                "average_response_time": round(rng.uniform(5, 90), 1),
                "proactive_response_rate": round(rng.uniform(0.5, 1.0), 2),
                "daily_challenge_completed": False, "points_earned": 0,
                "badges_unlocked": [], "ranking_position": 0,
            },
            "mood": {
                "morning": round(rng.uniform(-0.2, 0.6), 2),
                "afternoon": round(rng.uniform(-0.2, 0.6), 2),
                "evening": round(rng.uniform(-0.2, 0.6), 2),
            },
            "diet_compliance": {
                "breakfast": rng.choice(["completa", "completa", "parziale"]),
                "morning_snack": rng.choice(["completa", "parziale"]),
                "lunch": rng.choice(["completa", "completa", "parziale"]),
                "afternoon_snack": rng.choice(["completa", "parziale"]),
                "dinner": rng.choice(["completa", "completa", "parziale"]),
            },
            "meal_satisfaction": {
                "breakfast": "soddisfatto", "morning_snack": "neutro",
                "lunch": "soddisfatto", "afternoon_snack": "neutro", "dinner": "soddisfatto",
            },
            "hydration": float(rng.randint(1700, 2300)),
            "weight": round(weight, 1) if i % 7 == 0 else None,  # peso ~1 volta a settimana
            "sleep_quality": rng.choice(["buona", "buona", "discreta"]),
            "hunger": rng.choice(["bassa", "moderata"]),
        }
        reports.append({"user": dbref("users", uid), "date": d, "indicators": indicators, "summary": None})
    await db["daily-reports"].insert_many(reports)


async def seed_meal_logs_da_seguire(db, uid, rng: random.Random):
    """Ultimi 7 giorni per Chiara Lombardi: aderenza bassa CON motivi espliciti nel
    registro (compito 4), e daily-reports coerenti cosi' compare in 'Serve attenzione'."""
    now = datetime.now()
    today = datetime(now.year, now.month, now.day)
    reasons = [
        "Pranzo di lavoro, non c'era altra scelta sul menu",
        "Cena fuori con amici, non ho seguito il piano",
        "Giornata piena, ho saltato lo spuntino",
        "Troppo stress, ho mangiato quello che avevo in casa",
    ]
    reports = []
    for i in range(7):
        d = today - timedelta(days=6 - i)
        meals = []
        for meal_type in ["colazione", "pranzo", "cena"]:
            adherence = rng.choice(["nulla", "parziale", "parziale", "completa"])
            meal = {
                "meal_type": meal_type,
                "food": ["quello che avevo disponibile"] if adherence != "completa" else ["pasto come da piano"],
                "satisfaction": "neutro" if adherence != "completa" else "soddisfatto",
                "adherence": adherence,
                "created_at": d + timedelta(hours=13 if meal_type == "pranzo" else 8 if meal_type == "colazione" else 20),
            }
            if adherence != "completa":
                meal["adherence_reason"] = rng.choice(reasons)
            meals.append(meal)
        await db["meal-logs"].insert_one({"user": dbref("users", uid), "date": d, "meals": meals})

        indicators = {
            "engagement": {"messages_sent": rng.randint(2, 6), "session_count": 1,
                            "average_session_duration": 2.0, "average_response_time": 40.0,
                            "proactive_response_rate": 0.4, "daily_challenge_completed": False,
                            "points_earned": 0, "badges_unlocked": [], "ranking_position": 0},
            "mood": {"morning": -0.1, "afternoon": -0.1, "evening": -0.2},
            "diet_compliance": {"breakfast": meals[0]["adherence"], "morning_snack": None,
                                 "lunch": meals[1]["adherence"], "afternoon_snack": None,
                                 "dinner": meals[2]["adherence"]},
            "meal_satisfaction": {"breakfast": meals[0]["satisfaction"], "morning_snack": None,
                                   "lunch": meals[1]["satisfaction"], "afternoon_snack": None,
                                   "dinner": meals[2]["satisfaction"]},
            "hydration": float(rng.randint(900, 1400)),
            "weight": None, "sleep_quality": "scarsa", "hunger": "alta",
        }
        reports.append({"user": dbref("users", uid), "date": d, "indicators": indicators, "summary": None})
    await db["daily-reports"].insert_many(reports)


async def seed_bot_logs_da_seguire(db, uid, rng: random.Random):
    """Peso/idratazione/umore per Chiara Lombardi: alimentano le card in cima ad
    'Attivita bot' (lette da weight-logs/hydration-logs/wellness-logs, collezioni
    separate da daily-reports - vedi src/routers/logs.py)."""
    now = datetime.now()
    today = datetime(now.year, now.month, now.day)
    base_weight = 79.0
    moods = ["ansioso", "triste", "neutro"]  # vocabolario reale: prompts/morning/extract_mood.yml
    for i in range(7):
        d = today - timedelta(days=6 - i)

        if i in (0, 6):  # due sole pesate nella settimana, come nell'uso reale
            w = base_weight + (0.3 if i == 6 else 0.0)
            await db["weight-logs"].insert_one({
                "user": dbref("users", uid), "date": d,
                "weights": [{"value_kg": round(w, 1), "created_at": d + timedelta(hours=7, minutes=30)}],
            })

        total_ml = rng.randint(900, 1400)  # sempre sotto l'obiettivo di 2 L
        await db["hydration-logs"].insert_one({
            "user": dbref("users", uid), "date": d,
            "hydrations": [
                {"value_ml": round(total_ml * 0.4), "created_at": d + timedelta(hours=10)},
                {"value_ml": round(total_ml * 0.6), "created_at": d + timedelta(hours=17)},
            ],
        })

        await db["wellness-logs"].insert_one({
            "user": dbref("users", uid), "date": d,
            "entries": [
                {"type": "mood", "mood": rng.choice(moods), "cause": None, "created_at": d + timedelta(hours=9)},
                {"type": "sleep", "sleep_quality": "scarsa", "created_at": d + timedelta(hours=9)},
                {"type": "hunger", "hunger": "alta", "created_at": d + timedelta(hours=9)},
            ],
        })


async def run():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]

    print("Pulizia...")
    for name in ROSTER_NAMES + LEFTOVER_NAMES:
        await wipe_user_and_data(db, name)
    await wipe_plan_and_pdf(db, BASE_PLAN_NAME)
    await wipe_plan_and_pdf(db, LEFTOVER_PLAN_NAME)

    print("Creazione piano dietetico condiviso...")
    plan_result = await db["nutrition-plans"].insert_one(dict(BASE_PLAN))
    plan_id = plan_result.inserted_id

    rng = random.Random(42)  # seed fisso: stessi dati a ogni reset, sessioni confrontabili

    print("Creazione pazienti...")
    marco_id = await make_patient(
        db, name="Marco Neri", gender="Maschio", age=47, job="Impiegato", living_at="Bari",
        goal="Riduzione colesterolo", weight=87.0, height=176,
        diet_id=plan_id, connected=True, rng_seed=600000001,
    )
    await seed_daily_reports_andamento(db, marco_id, days=30, rng=rng)

    andrea_id = await make_patient(
        db, name="Andrea Vitale", gender="Maschio", age=39, job="Autista", living_at="Bari",
        goal="Perdita di peso", weight=95.0, height=180,
        diet_id=plan_id, connected=True, rng_seed=600000002,
    )

    chiara_id = await make_patient(
        db, name="Chiara Lombardi", gender="Femmina", age=44, job="Commerciante", living_at="Bari",
        goal="Regolarizzazione glicemia", weight=79.0, height=164,
        diet_id=plan_id, connected=True, rng_seed=600000003,
    )
    await seed_meal_logs_da_seguire(db, chiara_id, rng=rng)
    await seed_bot_logs_da_seguire(db, chiara_id, rng=rng)

    await make_patient(
        db, name="Sara Bruno", gender="Femmina", age=31, job="Insegnante", living_at="Bari",
        goal="Mantenimento", weight=61.0, height=167,
        diet_id=plan_id, connected=True, rng_seed=600000004,
    )
    await make_patient(
        db, name="Elisa Marchetti", gender="Femmina", age=52, job="Farmacista", living_at="Bari",
        goal="Riduzione colesterolo", weight=74.0, height=161,
        diet_id=plan_id, connected=True, rng_seed=600000005,
    )
    await make_patient(
        db, name="Federico Galli", gender="Maschio", age=28, job="Cuoco", living_at="Bari",
        goal="Aumento massa", weight=71.0, height=178,
        diet_id=None, connected=True, rng_seed=600000006,
    )
    await make_patient(
        db, name="Ilaria Costa", gender="Femmina", age=36, job="Grafica", living_at="Bari",
        goal="Perdita di peso", weight=68.0, height=165,
        diet_id=None, connected=True, rng_seed=600000007,
    )
    await make_patient(
        db, name="Tommaso Rinaldi", gender="Maschio", age=59, job="Pensionato", living_at="Bari",
        goal="Riduzione colesterolo", weight=90.0, height=173,
        diet_id=plan_id, connected=False, rng_seed=600000008,
    )

    print("\nFatto. Stato atteso in webapp:")
    print("  Attivi: Marco Neri, Andrea Vitale, Chiara Lombardi, Sara Bruno, Elisa Marchetti (5)")
    print("  Senza dieta: Federico Galli, Ilaria Costa (2)")
    print("  In attesa: Tommaso Rinaldi (1)")
    print("  'Lucia Ferri' e il piano 'Mediterranea 1600, fase 1' NON esistono: li crea il partecipante.")
    print("\nRilancia questo script dopo ogni partecipante per tornare a questo stato.")
    client.close()


if __name__ == "__main__":
    asyncio.run(run())
