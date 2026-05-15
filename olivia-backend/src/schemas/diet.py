from typing import Optional
from pydantic import BaseModel


class DietCreate(BaseModel):
    name: str
    tips: list[str] = []
    weekly_plan: dict[str, dict[str, str]] = {}
    substitutions: str = ""


class DietUpdate(BaseModel):
    name: Optional[str] = None
    tips: Optional[list[str]] = None
    weekly_plan: Optional[dict[str, dict[str, str]]] = None
    substitutions: Optional[str] = None


class DietResponse(BaseModel):
    id: str
    name: str
    tips: list[str] = []
    weekly_plan: dict[str, dict[str, str]] = {}
    substitutions: str = ""
