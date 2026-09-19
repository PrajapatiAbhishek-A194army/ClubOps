import base64
import hashlib
import hmac
import json
import time
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Union

from app.config.settings import settings

# Attempt to import passlib, fallback to PBKDF2
try:
    from passlib.context import CryptContext
    _pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    _has_passlib = True
except Exception:
    _has_passlib = False

# Attempt to import jose, fallback to standard HMAC-SHA256
try:
    from jose import JWTError as _JoseJWTError, jwt as _jose_jwt
    _has_jose = True
except Exception:
    _has_jose = False


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against hashed representation."""
    if _has_passlib:
        try:
            return _pwd_context.verify(plain_password, hashed_password)
        except Exception:
            pass

    # Standard library fallback: PBKDF2-HMAC-SHA256
    if hashed_password.startswith("pbkdf2"):
        parts = hashed_password.split("$")
        if len(parts) == 3:
            salt = parts[1].encode("utf-8")
            target_hash = parts[2]
            computed = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, 100000).hex()
            return hmac.compare_digest(computed, target_hash)
        elif len(parts) == 2:
            prefix, target_hash = parts
            salt = prefix.split(":", 1)[1].encode("utf-8") if ":" in prefix else b"clubops_salt_2026"
            computed = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, 100000).hex()
            return hmac.compare_digest(computed, target_hash)
    
    # Direct SHA-256 fallback if legacy
    computed_sha = hashlib.sha256(f"{settings.JWT_SECRET}:{plain_password}".encode("utf-8")).hexdigest()
    return hmac.compare_digest(computed_sha, hashed_password)


def get_password_hash(password: str) -> str:
    """Hashes a password with bcrypt or PBKDF2-HMAC-SHA256."""
    if _has_passlib:
        try:
            return _pwd_context.hash(password)
        except Exception:
            pass

    salt = "clubops_salt_2026".encode("utf-8")
    computed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000).hex()
    return f"pbkdf2:clubops_salt_2026${computed}"


def _b64_url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def _b64_url_decode(s: str) -> bytes:
    padding = "=" * (4 - (len(s) % 4)) if len(s) % 4 != 0 else ""
    return base64.urlsafe_b64decode((s + padding).encode("utf-8"))


def create_access_token(
    subject: Union[str, Any],
    claims: Optional[Dict[str, Any]] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Creates an HMAC-SHA256 signed JWT access token."""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode: Dict[str, Any] = {"exp": int(expire.timestamp()), "sub": str(subject)}
    if claims:
        to_encode.update(claims)

    if _has_jose:
        try:
            return _jose_jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
        except Exception:
            pass

    # Pure standard library JWT implementation (Zero dependencies required)
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = _b64_url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64_url_encode(json.dumps(to_encode, separators=(",", ":")).encode("utf-8"))
    
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(settings.JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64_url_encode(signature)

    return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a JWT token signature and expiration."""
    if _has_jose:
        try:
            return _jose_jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        except Exception:
            pass

    # Pure standard library JWT decoder & signature validator
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None

        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        expected_sig = hmac.new(settings.JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()
        actual_sig = _b64_url_decode(sig_b64)

        if not hmac.compare_digest(expected_sig, actual_sig):
            return None

        payload_json = _b64_url_decode(payload_b64).decode("utf-8")
        payload = json.loads(payload_json)

        # Check expiration
        exp = payload.get("exp")
        if exp and exp < time.time():
            return None

        return payload
    except Exception:
        return None
