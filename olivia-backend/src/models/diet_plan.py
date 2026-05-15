from typing import List, Optional
from pydantic import BaseModel, Field

from src.models.meal import Meal


class DietPlan(BaseModel):
    id: Optional[str] = Field(default=None, alias='_id')
    patient_id: str
    title: str
    notes: Optional[str] = None
    meals: List[Meal] = []
