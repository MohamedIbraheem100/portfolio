"""Abuse protection for the write endpoints (D10): invisible to visitors, no CAPTCHA.

Two layers, both cheap:
- Origin/Referer check: requests must come from the site itself.
- Short-lived session token: HMAC-signed "<expiry>.<nonce>.<signature>", issued by GET /session
  and sent back with every POST. A script that never loaded the page has no token.
Rate limiting is the third layer (core/ratelimit.py).
"""

import hashlib
import hmac
import secrets
import time
from urllib.parse import urlsplit

from fastapi import HTTPException, Request, status

from portfolio_api.core.config import get_settings

_DEV_SECRET = "dev-only-secret-not-for-production"


def _secret() -> str:
    return get_settings().session_token_secret or _DEV_SECRET


def _sign(payload: str, secret: str) -> str:
    return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()[:32]


def issue_token(now: float | None = None) -> tuple[str, int]:
    """Return (token, expires_at_unix)."""
    exp = int((now if now is not None else time.time()) + get_settings().session_token_ttl_s)
    payload = f"{exp}.{secrets.token_hex(8)}"
    return f"{payload}.{_sign(payload, _secret())}", exp


def verify_token(token: str, now: float | None = None) -> bool:
    parts = token.split(".")
    if len(parts) != 3:
        return False
    exp_s, nonce, sig = parts
    payload = f"{exp_s}.{nonce}"
    if not hmac.compare_digest(sig, _sign(payload, _secret())):
        return False
    try:
        return int(exp_s) > (now if now is not None else time.time())
    except ValueError:
        return False


def require_token(token: str) -> None:
    if not verify_token(token):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Session expired. Reload the page and try again."
        )


def _origin_of(request: Request) -> str | None:
    origin = request.headers.get("origin")
    if origin:
        return origin.rstrip("/")
    referer = request.headers.get("referer")
    if referer:
        u = urlsplit(referer)
        if u.scheme and u.netloc:
            return f"{u.scheme}://{u.netloc}"
    return None


def require_origin(request: Request) -> None:
    """Reject requests whose Origin (or Referer) is not one of ALLOWED_ORIGINS."""
    origin = _origin_of(request)
    allowed = get_settings().allowed_origin_list
    if origin is None or origin not in allowed:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "This endpoint only accepts requests from the site."
        )


def visitor_key(request: Request) -> str:
    """Hashed client IP: no raw IPs are stored anywhere (Mizan's rule)."""
    fwd = request.headers.get("x-forwarded-for", "")
    direct = request.client.host if request.client else "unknown"
    ip = fwd.split(",")[0].strip() if fwd else direct
    return hashlib.sha256(ip.encode()).hexdigest()[:16]
