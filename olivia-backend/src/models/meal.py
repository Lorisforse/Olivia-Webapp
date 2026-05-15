from typing import Optional
from pydantic import BaseModel

from src.models.enums import MealType


class Meal(BaseModel):
    meal_type: MealType
    description: str
    calories: Optional[int] = None
