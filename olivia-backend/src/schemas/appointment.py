from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

AppointmentStatus = Literal["scheduled", "confirmed", "reschedule_requested"]


class AppointmentCreate(BaseModel):
    patient_id: str
    scheduled_at: datetime
    duration_minutes: int = Field(default=30, ge=5, le=480)
    notes: Optional[str] = None


class AppointmentUpdate(BaseModel):
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(default=None, ge=5, le=480)
    notes: Optional[str] = None


class AppointmentStatusUpdate(BaseModel):
    status: AppointmentStatus


class AppointmentResponse(BaseModel):
    id: str
    patient_id: str
    patient_name: Optional[str] = None
    patient_linked: bool = False
    patient_active: bool = True
    scheduled_at: datetime
    duration_minutes: int
    notes: Optional[str] = None
    status: AppointmentStatus
    reminder_at: Optional[datetime] = None
    reminder_sent_at: Optional[datetime] = None
    responded_at: Optional[datetime] = None
    responded_via: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class AppointmentsConfig(BaseModel):
    bot_reminders_enabled: bool
    reminder_days: int
    reminder_hour: int
