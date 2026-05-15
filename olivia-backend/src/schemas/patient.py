from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class PatientCreate(BaseModel):
    full_name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    job: Optional[str] = None
    living_at: Optional[str] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    goal: Optional[str] = None
    motivation: Optional[int] = None
    wakes_up_at: Optional[str] = None
    goes_to_sleep_at: Optional[str] = None
    breakfast_at: Optional[str] = None
    lunch_at: Optional[str] = None
    dinner_at: Optional[str] = None
    food_relationship: Optional[str] = None
    dislikes: Optional[list[str]] = None
    emotional_eating: Optional[bool] = None
    physical_activity: Optional[bool] = None
    physical_activity_which: Optional[str] = None
    physical_activity_frequency: Optional[str] = None
    average_sleep_hours: Optional[int] = None
    sleep_quality: Optional[str] = None
    # Extended fields
    phone: Optional[str] = None
    email: Optional[str] = None
    allergies: Optional[list[str]] = None
    preferences: Optional[list[str]] = None
    smoker: Optional[bool] = None
    activity_level: Optional[str] = None
    notes: Optional[str] = None


class PatientListItem(BaseModel):
    id: str
    chat_id: Optional[int] = None
    username: Optional[str] = None
    name: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    living_at: Optional[str] = None
    goal: Optional[str] = None
    active_diet_plan_id: Optional[str] = None
    created_at: Optional[datetime] = None
    last_interaction_at: Optional[datetime] = None


class PatientDetail(BaseModel):
    id: str
    chat_id: Optional[int] = None
    username: Optional[str] = None
    # Personal
    name: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    job: Optional[str] = None
    living_at: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    # Clinical
    weight: Optional[float] = None
    height: Optional[float] = None
    # Lifestyle
    goal: Optional[str] = None
    motivation: Optional[int] = None
    motivation_cause: Optional[str] = None
    wakes_up_at: Optional[str] = None
    goes_to_sleep_at: Optional[str] = None
    breakfast_at: Optional[str] = None
    lunch_at: Optional[str] = None
    dinner_at: Optional[str] = None
    food_relationship: Optional[str] = None
    dislikes: Optional[list[str]] = None
    allergies: Optional[list[str]] = None
    preferences: Optional[list[str]] = None
    emotional_eating: Optional[bool] = None
    emotional_eating_what: Optional[list[str]] = None
    emotional_eating_at: Optional[str] = None
    physical_activity: Optional[bool] = None
    physical_activity_which: Optional[str] = None
    physical_activity_frequency: Optional[str] = None
    average_sleep_hours: Optional[int] = None
    sleep_quality: Optional[str] = None
    smoker: Optional[bool] = None
    activity_level: Optional[str] = None
    notes: Optional[str] = None
    # Personality
    personal_qualities: Optional[str] = None
    personal_flaws: Optional[str] = None
    identifies_in_garment: Optional[str] = None
    # Meta
    created_at: Optional[datetime] = None
    last_interaction_at: Optional[datetime] = None
    active_diet_plan_id: Optional[str] = None


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    job: Optional[str] = None
    living_at: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    goal: Optional[str] = None
    motivation: Optional[int] = None
    motivation_cause: Optional[str] = None
    wakes_up_at: Optional[str] = None
    goes_to_sleep_at: Optional[str] = None
    breakfast_at: Optional[str] = None
    lunch_at: Optional[str] = None
    dinner_at: Optional[str] = None
    food_relationship: Optional[str] = None
    dislikes: Optional[list[str]] = None
    allergies: Optional[list[str]] = None
    preferences: Optional[list[str]] = None
    emotional_eating: Optional[bool] = None
    emotional_eating_what: Optional[list[str]] = None
    emotional_eating_at: Optional[str] = None
    physical_activity: Optional[bool] = None
    physical_activity_which: Optional[str] = None
    physical_activity_frequency: Optional[str] = None
    average_sleep_hours: Optional[int] = None
    sleep_quality: Optional[str] = None
    smoker: Optional[bool] = None
    activity_level: Optional[str] = None
    notes: Optional[str] = None
    personal_qualities: Optional[str] = None
    personal_flaws: Optional[str] = None
    identifies_in_garment: Optional[str] = None
