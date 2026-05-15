from typing import Optional
from pydantic import BaseModel, Field


class User(BaseModel):
    id: Optional[str] = Field(default=None, alias='_id')
    full_name: str
    age: Optional[int] = None
    email: Optional[str] = None
