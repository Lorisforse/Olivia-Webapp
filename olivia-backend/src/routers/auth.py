import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from src.auth import create_access_token, doc_to_user, get_current_user, unauthorized
from src.database import get_database, get_webapp_users_col
from src.schemas.auth import LoginRequest, LoginResponse, UserResponse
from src.security import verify_password

router = APIRouter()


@router.post('/login', response_model=LoginResponse)
async def login(payload: LoginRequest, database=Depends(get_database)):
    users = get_webapp_users_col(database)
    doc = await users.find_one({'email': payload.email.strip().lower()})
    if doc is None or not doc.get('is_active', True):
        raise unauthorized('Invalid credentials')

    # PBKDF2 con 600k iterazioni impiega qualche centinaio di ms: fuori dall'event loop.
    valid = await asyncio.to_thread(verify_password, payload.password, doc.get('password_hash', ''))
    if not valid:
        raise unauthorized('Invalid credentials')

    user = doc_to_user(doc)
    token, expires_at = create_access_token(user, remember_me=payload.remember_me)
    await users.update_one(
        {'_id': doc['_id']},
        {'$set': {'last_login_at': datetime.now(timezone.utc)}},
    )
    return LoginResponse(access_token=token, expires_at=expires_at, user=user)


@router.get('/me', response_model=UserResponse)
async def me(current_user: UserResponse = Depends(get_current_user)):
    """Usata dal frontend all'avvio per validare la sessione salvata nel browser."""
    return current_user
