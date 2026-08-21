from motor.motor_asyncio import AsyncIOMotorClient

from src.settings import settings

# Le variabili d'ambiente vincono sul .env letto da Settings (vedi src/settings.py).
MONGODB_URL = settings.mongodb_url
MONGODB_DB = settings.mongodb_db

client = AsyncIOMotorClient(MONGODB_URL)
db = client[MONGODB_DB]


def get_database():
    return db


def get_users_col(database): return database["users"]
# Account di accesso alla dashboard (medici/nutrizionisti): collection separata da
# "users", che invece appartiene ai pazienti del bot e non va toccata.
def get_webapp_users_col(database): return database["webapp-users"]
# Il bot chiama questa collection "nutrition-plans" (vedi olivia-chatbot/src/models/nutrition_plan.py)
def get_nutrition_plans_col(database): return database["nutrition-plans"]
def get_meal_logs_col(database): return database["meal-logs"]
def get_weight_logs_col(database): return database["weight-logs"]
def get_hydration_logs_col(database): return database["hydration-logs"]
def get_wellness_logs_col(database): return database["wellness-logs"]
def get_daily_reports_col(database): return database["daily-reports"]
def get_weekly_reports_col(database): return database["weekly-reports"]
