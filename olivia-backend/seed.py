"""
Seed script: populates MongoDB with 10 realistic Italian patients and 3 diet plans.

Run:
    cd "Oliva webapp/olivia-backend"
    python seed.py

Requires the backend .env to be present (reads MONGODB_URL from it).
"""
import asyncio
import os
import random
from datetime import datetime, timedelta

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://olivia:olivia@localhost:27017/olivia?authSource=admin")
DB_NAME = "olivia"

# ─── sample data ─────────────────────────────────────────────────────────────

PATIENTS = [
    {"name": "Giulia Ricci",       "gender": "Femmina", "age": 32, "height": 165, "weight": 72.5,  "living_at": "Roma",    "goal": "Perdita di peso",          "phone": "+39 333 1234567", "email": "giulia.ricci@email.it"},
    {"name": "Marco Bianchi",      "gender": "Maschio", "age": 45, "height": 178, "weight": 91.0,  "living_at": "Milano",  "goal": "Riduzione colesterolo",     "phone": "+39 334 2345678", "email": "marco.bianchi@email.it"},
    {"name": "Sofia Romano",       "gender": "Femmina", "age": 28, "height": 162, "weight": 58.0,  "living_at": "Napoli",  "goal": "Mantenimento",              "phone": "+39 335 3456789", "email": "sofia.romano@email.it"},
    {"name": "Alessandro Greco",   "gender": "Maschio", "age": 38, "height": 182, "weight": 88.0,  "living_at": "Torino",  "goal": "Aumento massa",             "phone": "+39 336 4567890", "email": "ale.greco@email.it"},
    {"name": "Chiara Marino",      "gender": "Femmina", "age": 52, "height": 160, "weight": 78.0,  "living_at": "Firenze", "goal": "Regolarizzazione glicemia", "phone": "+39 337 5678901", "email": "chiara.marino@email.it"},
    {"name": "Luca Ferrari",       "gender": "Maschio", "age": 29, "height": 175, "weight": 75.0,  "living_at": "Bologna", "goal": "Miglioramento sportivo",    "phone": "+39 338 6789012", "email": "luca.ferrari@email.it"},
    {"name": "Francesca Esposito", "gender": "Femmina", "age": 41, "height": 168, "weight": 83.5,  "living_at": "Padova",  "goal": "Perdita di peso",           "phone": "+39 339 7890123", "email": "fra.esposito@email.it"},
    {"name": "Matteo Russo",       "gender": "Maschio", "age": 35, "height": 180, "weight": 94.0,  "living_at": "Genova",  "goal": "Perdita di peso",           "phone": "+39 340 8901234", "email": "matteo.russo@email.it"},
    {"name": "Elena Conti",        "gender": "Femmina", "age": 24, "height": 170, "weight": 55.5,  "living_at": "Verona",  "goal": "Mantenimento",              "phone": "+39 341 9012345", "email": "elena.conti@email.it"},
    {"name": "Davide Bruno",       "gender": "Maschio", "age": 60, "height": 172, "weight": 85.0,  "living_at": "Roma",    "goal": "Riduzione colesterolo",     "phone": "+39 342 0123456", "email": "davide.bruno@email.it"},
]

SAMPLE_MEALS = {
    "breakfast": [
        "Yogurt greco 150g + avena 40g + mirtilli",
        "Pane integrale 60g + ricotta 80g + miele",
        "Porridge latte scremato 200ml + banana",
        "Uova strapazzate 2 + pane integrale 50g",
        "Smoothie proteico + mandorle 20g",
    ],
    "morning_snack": [
        "Mela 1 media",
        "Mandorle 20g",
        "Yogurt magro 125g",
        "Pera 1",
        "Noci 15g",
    ],
    "lunch": [
        "Pasta integrale 80g + pomodoro + tonno 80g",
        "Riso basmati 80g + pollo grigliato 120g + verdure",
        "Farro 70g + ceci 50g + feta 30g",
        "Orata al forno 150g + patate 150g",
        "Pasta 70g + zucchine + gamberi 100g",
    ],
    "afternoon_snack": [
        "Tè verde + gallette 3",
        "Carote e hummus 40g",
        "Frutta 150g",
        "Yogurt 125g",
        "Cioccolato fondente 20g",
    ],
    "dinner": [
        "Petto di pollo 150g + insalata + pane 40g",
        "Salmone 150g + broccoli + riso 60g",
        "Frittata 2 uova + spinaci + pane 50g",
        "Tacchino 150g + verdure grigliate",
        "Merluzzo 180g + patate 150g",
    ],
}

DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

DIET_PLANS = [
    {
        "name": "Piano Mediterraneo Base",
        "tips": [
            "Bere almeno 2L di acqua al giorno.",
            "Limitare il sale aggiunto.",
            "Attività fisica leggera 30 min al giorno.",
        ],
        "substitutions": "Pasta ↔ Riso ↔ Farro a parità di grammatura.\nCarne bianca ↔ Pesce magro ↔ Legumi (raddoppiare).\nFrutta a piacere tra quelle di stagione.",
    },
    {
        "name": "Piano Ipocalorico Moderato",
        "tips": [
            "Non saltare mai la colazione.",
            "Distribuire i pasti in 5 momenti al giorno.",
            "Evitare dolci e alcolici durante la settimana.",
        ],
        "substitutions": "Pane bianco → Pane integrale o gallette.\nBurro → Olio EVO (max 2 cucchiaini).\nSucchi → Frutta fresca.",
    },
    {
        "name": "Piano High-Protein Sport",
        "tips": [
            "Consumare proteine entro 30 min dall'allenamento.",
            "Idratarsi abbondantemente durante l'attività fisica.",
            "Non ridurre i carboidrati nei giorni di allenamento intenso.",
        ],
        "substitutions": "Pollo ↔ Tacchino ↔ Pesce magro.\nRiso ↔ Pasta integrale ↔ Patate dolci.\nWhey protein ↔ Yogurt greco 0% (200g).",
    },
]

ALLERGIES_POOL = [["Lattosio"], ["Glutine", "Frutta secca"], [], [], ["Arachidi"]]
PREFERENCES_POOL = [["Vegetariana"], [], ["Pesce raro"], [], []]
NOTES_POOL = [
    "Paziente motivata, buona aderenza alle indicazioni.",
    "Ipertensione lieve, dieta iposodica raccomandata.",
    "Sportivo amatoriale, 3 allenamenti settimanali.",
    "Lavoro sedentario, gestione dello stress importante.",
    "Pre-diabete, monitoraggio glicemia ogni 2 settimane.",
]


def build_weekly_plan(seed: int) -> dict:
    r = random.Random(seed)
    plan = {}
    for day in DAYS:
        plan[day] = {meal: r.choice(items) for meal, items in SAMPLE_MEALS.items()}
    return plan


def build_profile(p: dict, idx: int) -> dict:
    profile_fields = [
        "name", "gender", "age", "job", "living_at", "phone", "email",
        "weight", "height", "goal", "motivation", "motivation_cause",
        "wakes_up_at", "goes_to_sleep_at", "breakfast_at", "lunch_at", "dinner_at",
        "food_relationship", "dislikes", "allergies", "preferences",
        "emotional_eating", "emotional_eating_what", "emotional_eating_at",
        "physical_activity", "physical_activity_which", "physical_activity_frequency",
        "average_sleep_hours", "sleep_quality", "smoker", "activity_level", "notes",
        "personal_qualities", "personal_flaws", "identifies_in_garment",
    ]
    profile = {f: {"value": None, "state": "unknown"} for f in profile_fields}
    known = {
        "name": p["name"], "gender": p["gender"], "age": p["age"],
        "height": p["height"], "weight": p["weight"], "living_at": p["living_at"],
        "goal": p["goal"], "phone": p["phone"], "email": p["email"],
        "allergies": ALLERGIES_POOL[idx % len(ALLERGIES_POOL)],
        "preferences": PREFERENCES_POOL[idx % len(PREFERENCES_POOL)],
        "notes": NOTES_POOL[idx % len(NOTES_POOL)],
        "activity_level": ["Sedentario", "Leggero", "Moderato", "Intenso"][idx % 4],
        "average_sleep_hours": 6 + (idx % 3),
        "smoker": idx % 7 == 0,
        "physical_activity": idx % 3 != 0,
        "breakfast_at": "07:30", "lunch_at": "13:00", "dinner_at": "20:00",
    }
    for k, v in known.items():
        if k in profile:
            profile[k] = {"value": v, "state": "set"}
    return profile


async def seed():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]

    # clear collections
    await db["users"].delete_many({})
    await db["diet-plans"].delete_many({})
    print("Cleared users and diet-plans collections.")

    # insert diet plans
    diet_docs = []
    for i, dp in enumerate(DIET_PLANS):
        doc = {
            "name": dp["name"],
            "tips": dp["tips"],
            "substitutions": dp["substitutions"],
            "weekly_plan": build_weekly_plan(seed=i * 17),
        }
        diet_docs.append(doc)
    diet_result = await db["diet-plans"].insert_many(diet_docs)
    diet_ids = diet_result.inserted_ids
    print(f"Inserted {len(diet_ids)} diet plans.")

    # insert patients
    now = datetime.now()
    for idx, p in enumerate(PATIENTS):
        profile = build_profile(p, idx)

        # First 4 patients get bot + diet, next 3 get only bot, last 3 are pending
        chat_id = None
        username = None
        active_diet_plan = None
        last_interaction = None

        if idx < 4:
            chat_id = 100_000_000 + idx
            username = p["name"].split()[0].lower() + str(idx)
            diet_oid = diet_ids[idx % len(diet_ids)]
            active_diet_plan = {"$ref": "diet-plans", "$id": diet_oid}
            last_interaction = now - timedelta(hours=random.randint(1, 48))
        elif idx < 7:
            chat_id = 200_000_000 + idx
            username = p["name"].split()[0].lower() + str(idx)
            last_interaction = now - timedelta(days=random.randint(1, 10))

        doc = {
            "chat_id": chat_id,
            "username": username,
            "profile": profile,
            "active_diet_plan": active_diet_plan,
            "notifications": [],
            "created_at": now - timedelta(days=30 - idx * 3),
            "last_interaction_at": last_interaction,
        }
        await db["users"].insert_one(doc)
        status = "active" if idx < 4 else ("no-diet" if idx < 7 else "pending")
        print(f"  [{status}] {p['name']}")

    print(f"\nSeeded {len(PATIENTS)} patients.")
    print("Done! Avvia il backend e apri http://localhost:5173")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
