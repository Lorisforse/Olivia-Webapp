import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URL = os.getenv('MONGODB_URL', 'mongodb://localhost:27017')
MONGODB_DB = os.getenv('MONGODB_DB', 'olivia')

client = AsyncIOMotorClient(MONGODB_URL)
db = client[MONGODB_DB]


def get_database():
    return db


def get_users_col(database): return database["users"]
# Il bot chiama questa collection "nutrition-plans" (vedi olivia-chatbot/src/models/nutrition_plan.py)
def get_nutrition_plans_col(database): return database["nutrition-plans"]
def get_meal_logs_col(database): return database["meal-logs"]
def get_weight_logs_col(database): return database["weight-logs"]
def get_hydration_logs_col(database): return database["hydration-logs"]
def get_wellness_logs_col(database): return database["wellness-logs"]
def get_daily_reports_col(database): return database["daily-reports"]
def get_weekly_reports_col(database): return database["weekly-reports"]
