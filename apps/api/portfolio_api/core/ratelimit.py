"""Daily rate limit: N hits per visitor per scope + a global daily cap per scope.

Same shape as Mizan's: Upstash Redis over REST in production (works from serverless),
in-process memory when Upstash is not configured (local dev, tests). Keys are
"<scope>:<visitor>:<day>" and "<scope>:global:<day>"; the raw IP never appears.
"""

import logging
import threading
import time
from datetime import UTC, datetime
from functools import lru_cache
from typing import Protocol

import httpx
from fastapi import HTTPException, status

from portfolio_api.core.config import get_settings

log = logging.getLogger("portfolio.ratelimit")
DAY_S = 24 * 3600


class Backend(Protocol):
    def incr_with_ttl(self, key: str, ttl_s: int) -> int: ...


class MemoryBackend:
    def __init__(self) -> None:
        self._data: dict[str, tuple[int, float]] = {}
        self._lock = threading.Lock()

    def incr_with_ttl(self, key: str, ttl_s: int) -> int:
        now = time.time()
        with self._lock:
            count, expires = self._data.get(key, (0, 0.0))
            if expires <= now:
                count, expires = 0, now + ttl_s
            count += 1
            self._data[key] = (count, expires)
            return count

    def reset(self) -> None:
        with self._lock:
            self._data.clear()


class UpstashBackend:
    """INCR + EXPIRE NX in one pipeline call (one HTTP round trip)."""

    def __init__(self, url: str, token: str, timeout_s: float = 3.0) -> None:
        self._client = httpx.Client(
            base_url=url.rstrip("/"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=timeout_s,
        )

    def incr_with_ttl(self, key: str, ttl_s: int) -> int:
        resp = self._client.post("/pipeline", json=[["INCR", key], ["EXPIRE", key, ttl_s, "NX"]])
        resp.raise_for_status()
        return int(resp.json()[0]["result"])


def _day() -> str:
    return datetime.now(UTC).strftime("%Y%m%d")


class RateLimiter:
    def __init__(self, backend: Backend) -> None:
        self.backend = backend

    def hit(self, scope: str, visitor: str, per_visitor: int, global_cap: int) -> None:
        """Count one hit; raise 429 when the visitor or the global cap is exceeded.

        If the backend is unreachable we log and let the request through: a broken
        limiter must not take the site down.
        """
        day = _day()
        try:
            n_global = self.backend.incr_with_ttl(f"{scope}:global:{day}", DAY_S)
            n_visitor = self.backend.incr_with_ttl(f"{scope}:{visitor}:{day}", DAY_S)
        except Exception as exc:  # noqa: BLE001
            log.warning("rate limit backend unavailable: %s", exc)
            return
        if n_global > global_cap:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                "Today's quota for this feature is used up. Please email me instead.",
            )
        if n_visitor > per_visitor:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                "You have reached today's limit for this feature. Please email me instead.",
            )


@lru_cache
def get_limiter() -> RateLimiter:
    s = get_settings()
    if s.upstash_redis_rest_url and s.upstash_redis_rest_token:
        return RateLimiter(UpstashBackend(s.upstash_redis_rest_url, s.upstash_redis_rest_token))
    log.info("rate limit: in-memory backend (Upstash not configured)")
    return RateLimiter(MemoryBackend())
