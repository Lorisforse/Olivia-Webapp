from datetime import datetime

from pydantic import BaseModel


class GoalOptionCreate(BaseModel):
    value: str


class GoalOptionResponse(BaseModel):
    id: str
    value: str
    created_at: datetime
