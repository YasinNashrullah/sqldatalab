from datetime import datetime, timedelta, timezone
from typing import Any
import bcrypt
import jwt
from backend.app.core.config import settings
from backend.app.core.errors import UnauthorizedError


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against the stored bcrypt hash."""
    try:
        pw_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    pw_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt(rounds=14)
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


def create_access_token(
    data: dict[str, Any], expires_delta: timedelta | None = None
) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise UnauthorizedError("Session has expired. Please log in again.")
    except jwt.PyJWTError:
        raise UnauthorizedError("Invalid authentication token.")


def sanitize_identifier(name: str, fallback_prefix: str = "item") -> str:
    """
    Sanitizes SQL identifiers (table names, column names, slugs)
    to strictly permit only alphanumeric characters and underscores,
    preventing path traversal and quote escape exploits.
    """
    import re

    cleaned = re.sub(r"[^a-zA-Z0-9_]", "_", name).strip("_").lower()
    cleaned = re.sub(r"_+", "_", cleaned)
    if not cleaned or not cleaned[0].isalpha():
        cleaned = f"{fallback_prefix}_{cleaned}" if cleaned else f"{fallback_prefix}_id"
    return cleaned[:63]
