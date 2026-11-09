"""Small JSON cache with a TTL: Upstash Redis over REST in production, memory otherwise.

Used by Recruiter Mode to keep a fit result for 24 h under the SHA-256 of the normalized
job description (D11). Only the hash and the result are stored; the JD text never is.
A broken cache must not break the feature: every error degrades to a miss.
"""

import json
import logging
import threading
import time
from functools import lru_cache
from typing import Any, Protocol

import httpx

from portfolio_api.core.config import get_settings

log = logging.getLogger("portfolio.cache")


class Cache(Protocol):
    def get(self, key: str) -> Any | None: ...
    def set(self, key: str, value: Any, ttl_s: int) -> None: ...


class MemoryCache:
    def __init__(self) -> None:
        self._data: dict[str, tuple[float, str]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Any | None:
        with self._lock:
            hit = self._data.get(key)
            if hit is None:
                return None
            expires, raw = hit
            if expires <= time.time():
                self._data.pop(key, None)
                return None
            return json.loads(raw)

    def set(self, key: str, value: Any, ttl_s: int) -> None:
        with self._lock:
            self._data[key] = (time.time() + ttl_s, json.dumps(value))

    def clear(self) -> None:
        with self._lock:
            self._data.clear()


class UpstashCache:
    def __init__(self, url: str, token: str, timeout_s: float = 3.0) -> None:
        self._client = httpx.Client(
            base_url=url.rstrip("/"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=timeout_s,
        )

    def get(self, key: str) -> Any | None:
        try:
            resp = self._client.post("/", json=["GET", key])
            resp.raise_for_status()
            raw = resp.json().get("result")
            return json.loads(raw) if raw else None
        except Exception as exc:  # noqa: BLE001
            log.warning("cache get failed: %s", exc)
            return None

    def set(self, key: str, value: Any, ttl_s: int) -> None:
        try:
            resp = self._client.post("/", json=["SET", key, json.dumps(value), "EX", ttl_s])
            resp.raise_for_status()
        except Exception as exc:  # noqa: BLE001
            log.warning("cache set failed: %s", exc)


@lru_cache
def get_cache() -> Cache:
    s = get_settings()
    if s.upstash_redis_rest_url and s.upstash_redis_rest_token:
        return UpstashCache(s.upstash_redis_rest_url, s.upstash_redis_rest_token)
    log.info("cache: in-memory backend (Upstash not configured)")
    return MemoryCache()
