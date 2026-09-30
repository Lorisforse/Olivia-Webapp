import asyncio
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends

from src.auth import create_access_token, doc_to_user, get_current_user, unauthorized
from src.database import get_database, get_webapp_users_col
from src.schemas.auth import (
    LoginRequest,
    LoginResponse,
    MetricPreference,
    PreferencesResponse,
    PreferencesUpdate,
    UserResponse,
)
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


# Metriche dei grafici (Home + tab Andamento) che la nutrizionista può ordinare e
# nascondere. Le chiavi devono coincidere con `METRICS` in olivia-frontend/src/utils/metrics.js.
METRIC_KEYS = ['weight', 'adherence', 'satisfaction', 'sleep', 'hunger', 'hydration', 'messages', 'mood']


def _normalize_metrics(metrics: list[MetricPreference]) -> list[MetricPreference]:
    """Scarta chiavi sconosciute e doppioni; le metriche mancanti vanno in fondo, visibili."""
    seen: set[str] = set()
    result: list[MetricPreference] = []
    for metric in metrics:
        if metric.key in METRIC_KEYS and metric.key not in seen:
            seen.add(metric.key)
            result.append(metric)
    result.extend(MetricPreference(key=key) for key in METRIC_KEYS if key not in seen)
    return result


@router.get('/me/preferences', response_model=PreferencesResponse)
async def get_preferences(
    current_user: UserResponse = Depends(get_current_user),
    database=Depends(get_database),
):
    doc = await get_webapp_users_col(database).find_one(
        {'_id': ObjectId(current_user.id)}, {'preferences.metrics': 1},
    )
    saved = ((doc or {}).get('preferences') or {}).get('metrics')
    if not saved:
        return PreferencesResponse(metrics=None)
    return PreferencesResponse(metrics=_normalize_metrics([MetricPreference(**m) for m in saved]))


@router.put('/me/preferences', response_model=PreferencesResponse)
async def update_preferences(
    payload: PreferencesUpdate,
    current_user: UserResponse = Depends(get_current_user),
    database=Depends(get_database),
):
    metrics = _normalize_metrics(payload.metrics)
    await get_webapp_users_col(database).update_one(
        {'_id': ObjectId(current_user.id)},
        {'$set': {'preferences.metrics': [m.model_dump() for m in metrics]}},
    )
    return PreferencesResponse(metrics=metrics)
