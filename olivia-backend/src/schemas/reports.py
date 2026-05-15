from typing import Optional
from pydantic import BaseModel, Field


class MealIndicators(BaseModel):
    breakfast: Optional[str] = None
    morning_snack: Optional[str] = None
    lunch: Optional[str] = None
    afternoon_snack: Optional[str] = None
    dinner: Optional[str] = None


class DailyMoodIndicators(BaseModel):
    morning: Optional[float] = None
    afternoon: Optional[float] = None
    evening: Optional[float] = None


class DailyEngagementIndicators(BaseModel):
    messages_sent: int = 0
    session_count: int = 0
    average_session_duration: float = 0
    average_response_time: float = 0
    proactive_response_rate: float = 0
    daily_challenge_completed: bool = False
    points_earned: int = 0
    badges_unlocked: list[str] = Field(default_factory=list)
    ranking_position: int = 0


class DailyIndicators(BaseModel):
    engagement: DailyEngagementIndicators = Field(default_factory=DailyEngagementIndicators)
    mood: DailyMoodIndicators = Field(default_factory=DailyMoodIndicators)
    diet_compliance: MealIndicators = Field(default_factory=MealIndicators)
    meal_satisfaction: MealIndicators = Field(default_factory=MealIndicators)
    hydration: Optional[float] = None
    weight: Optional[float] = None
    sleep_quality: Optional[str] = None
    hunger: Optional[str] = None


class DailyReportResponse(BaseModel):
    id: str
    date: str
    indicators: DailyIndicators
    summary: Optional[str] = None


class WeeklyEngagementIndicators(BaseModel):
    average_messages_sent: float = 0
    average_session_count: float = 0
    average_session_duration: float = 0
    average_response_time: float = 0
    average_proactive_response_rate: float = 0
    daily_challenges_completion_rate: float = 0
    weekly_challenge_completed: bool = False
    points_earned: int = 0
    badges_unlocked: list[str] = Field(default_factory=list)
    average_ranking_position: float = 0


class WeeklyIndicators(BaseModel):
    engagement: WeeklyEngagementIndicators = Field(default_factory=WeeklyEngagementIndicators)
    average_mood: Optional[float] = None
    mode_diet_compliance: MealIndicators = Field(default_factory=MealIndicators)
    mode_meal_satisfaction: MealIndicators = Field(default_factory=MealIndicators)
    average_hydration: Optional[float] = None
    average_weight: Optional[float] = None
    mode_sleep_quality: Optional[str] = None
    mode_hunger: Optional[str] = None


class WeeklyReportResponse(BaseModel):
    id: str
    week: dict
    indicators: WeeklyIndicators
