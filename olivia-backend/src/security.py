"""
Hashing delle password degli account webapp.

Volutamente basato sulla sola standard library (hashlib.pbkdf2_hmac): questo
modulo viene importato anche da create_user.py, che gira senza le dipendenze
del backend installate.

Formato dello stored hash (stile Django, leggibile e auto-descrittivo):

    pbkdf2_sha256$<iterazioni>$<salt base64>$<digest base64>
"""

import base64
import hashlib
import hmac
import secrets

ALGORITHM = "pbkdf2_sha256"
ITERATIONS = 600_000  # raccomandazione OWASP per PBKDF2-HMAC-SHA256
SALT_BYTES = 16


def _b64(raw: bytes) -> str:
    return base64.b64encode(raw).decode("ascii")


def _unb64(text: str) -> bytes:
    return base64.b64decode(text.encode("ascii"))


def _derive(password: str, salt: bytes, iterations: int) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)


def hash_password(password: str) -> str:
    """Genera un salt casuale e restituisce l'hash serializzato da salvare su Mongo."""
    salt = secrets.token_bytes(SALT_BYTES)
    digest = _derive(password, salt, ITERATIONS)
    return f"{ALGORITHM}${ITERATIONS}${_b64(salt)}${_b64(digest)}"


def verify_password(password: str, stored: str) -> bool:
    """Confronta una password in chiaro con l'hash salvato, a tempo costante."""
    try:
        algorithm, iterations, salt_b64, digest_b64 = stored.split("$")
        if algorithm != ALGORITHM:
            return False
        candidate = _derive(password, _unb64(salt_b64), int(iterations))
        expected = _unb64(digest_b64)
    except (AttributeError, ValueError):
        # hash assente, troncato o in un formato che non conosciamo
        return False
    return hmac.compare_digest(candidate, expected)
