from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class MealEntry(BaseModel):
    meal_type: Optional[str] = None
    food: list[str] = []
    satisfaction: Optional[str] = None
    adherence: Optional[str] = None
    adherence_reason: Optional[str] = None
    created_at: Optional[datetime] = None


class WeightEntry(BaseModel):
    value_kg: Optional[float] = None
    created_at: Optional[datetime] = None


class HydrationEntry(BaseModel):
    value_ml: Optional[float] = None
    created_at: Optional[datetime] = None


class WellnessEntry(BaseModel):
    type: str
    mood: Optional[str] = None
    cause: Optional[str] = None
    sleep_quality: Optional[str] = None
    hunger: Optional[str] = None
    created_at: Optional[datetime] = None


class DayLogs(BaseModel):
    date: str
    meals: list[MealEntry] = []
    weights: list[WeightEntry] = []
    hydrations: list[HydrationEntry] = []
    wellness: list[WellnessEntry] = []


class LogsResponse(BaseModel):
    days: list[DayLogs]
