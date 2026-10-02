from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str
    # "Resta connesso": allunga la durata del token (vedi src/auth.py)
    remember_me: bool = False


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str = 'Nutrizionista'
    # False per gli account che non devono poter collegare pazienti al bot
    # (es. quello dato agli studenti): niente QR né link di onboarding.
    can_link_bot: bool = True


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    expires_at: datetime
    user: UserResponse


class MetricPreference(BaseModel):
    key: str
    visible: bool = True


class PreferencesUpdate(BaseModel):
    metrics: list[MetricPreference]


class PreferencesResponse(BaseModel):
    # None = mai salvate: il frontend usa l'ordine predefinito di ogni schermata.
    metrics: Optional[list[MetricPreference]] = None
