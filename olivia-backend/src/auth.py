"""
Autenticazione della dashboard web: login con email/password e token JWT.

Riguarda solo gli account dello studio (collection "webapp-users"), non i
pazienti del bot Telegram (collection "users"), che non hanno credenziali.
"""

import logging
from datetime import datetime, timedelta, timezone

import jwt
from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.database import get_database, get_webapp_users_col
from src.schemas.auth import UserResponse
from src.settings import DEV_JWT_SECRET, settings

logger = logging.getLogger(__name__)

JWT_ALGORITHM = 'HS256'

# auto_error=False: gestiamo noi la risposta 401, così è uniforme fra token
# assente, malformato e scaduto.
_bearer = HTTPBearer(auto_error=False)

if settings.jwt_secret == DEV_JWT_SECRET:
    logger.warning(
        'JWT_SECRET non impostato: in uso il segreto di sviluppo. '
        'Impostarlo nel .env prima di esporre l\'API.'
    )


def unauthorized(detail: str = 'Not authenticated') -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={'WWW-Authenticate': 'Bearer'},
    )


def create_access_token(user: UserResponse, remember_me: bool = False) -> tuple[str, datetime]:
    """Firma un JWT per l'utente e restituisce (token, scadenza)."""
    lifetime = (
        timedelta(days=settings.jwt_remember_days) if remember_me
        else timedelta(minutes=settings.jwt_expire_minutes)
    )
    issued_at = datetime.now(timezone.utc)
    expires_at = issued_at + lifetime
    payload = {
        'sub': user.id,
        'email': user.email,
        'name': user.name,
        'iat': issued_at,
        'exp': expires_at,
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALGORITHM)
    return token, expires_at


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise unauthorized('Token expired')
    except jwt.PyJWTError:
        raise unauthorized('Invalid token')


def doc_to_user(doc: dict) -> UserResponse:
    return UserResponse(
        id=str(doc['_id']),
        email=doc.get('email', ''),
        name=doc.get('name', ''),
        role=doc.get('role', 'Nutrizionista'),
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    database=Depends(get_database),
) -> UserResponse:
    """Dependency di protezione: risolve il Bearer token nell'utente che lo ha ottenuto."""
    if credentials is None:
        raise unauthorized()

    payload = decode_access_token(credentials.credentials)
    user_id = payload.get('sub')
    if not user_id or not ObjectId.is_valid(user_id):
        raise unauthorized('Invalid token')

    # Rilettura da Mongo a ogni richiesta: un account disattivato o cancellato
    # perde subito l'accesso, senza aspettare la scadenza del token.
    doc = await get_webapp_users_col(database).find_one({'_id': ObjectId(user_id)})
    if doc is None or not doc.get('is_active', True):
        raise unauthorized('Account not available')

    return doc_to_user(doc)
