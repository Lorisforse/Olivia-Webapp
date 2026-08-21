from datetime import datetime

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


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    expires_at: datetime
    user: UserResponse
