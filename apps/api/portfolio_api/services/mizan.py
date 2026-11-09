"""Client for Mizan, the owner's CV-screening product (D5).

Recruiter Mode drives Mizan's own public flow, server to server:
  POST /rubric      {jd_text}            -> Rubric
  POST /screenings  {rubric, blind}      -> {screening_id}
  POST /screen      multipart(file, screening_id), X-Internal-Key
                    -> SSE (progress..., then result | error)

The internal key makes Mizan count these calls on a separate daily cap instead of the
per-visitor limit (all portfolio traffic leaves from shared Vercel egress IPs).
"""

import json
import logging
from collections.abc import Iterator
from functools import lru_cache
from typing import Any

import httpx

from portfolio_api.core.config import get_settings

log = logging.getLogger("portfolio.mizan")


class MizanError(RuntimeError):
    """Mizan answered with an error, or could not be reached. `detail` is safe to show."""

    def __init__(self, detail: str, status: int | None = None) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status = status


def _detail(resp: httpx.Response, fallback: str) -> str:
    try:
        d = resp.json().get("detail")
        return d if isinstance(d, str) and d else fallback
    except Exception:  # noqa: BLE001
        return fallback


def parse_sse_lines(lines: Iterator[str]) -> Iterator[tuple[str, dict[str, Any]]]:
    """Turn an SSE line stream into (event, payload) pairs. Malformed blocks are skipped."""
    event = "message"
    data: list[str] = []
    for raw in lines:
        line = raw.rstrip("\r")
        if line == "":
            if data:
                try:
                    yield event, json.loads("\n".join(data))
                except json.JSONDecodeError:
                    log.warning("skipping malformed SSE block for event %s", event)
            event, data = "message", []
        elif line.startswith("event:"):
            event = line[6:].strip()
        elif line.startswith("data:"):
            data.append(line[5:].lstrip())
    if data:
        try:
            yield event, json.loads("\n".join(data))
        except json.JSONDecodeError:
            pass


class MizanClient:
    def __init__(self, base_url: str, internal_key: str = "", timeout_s: float = 90.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.internal_key = internal_key
        self.timeout = httpx.Timeout(timeout_s, connect=10.0)

    def rubric(self, jd_text: str) -> dict[str, Any]:
        try:
            resp = httpx.post(
                f"{self.base_url}/rubric", json={"jd_text": jd_text}, timeout=self.timeout
            )
        except httpx.HTTPError as exc:
            raise MizanError("Mizan could not be reached.") from exc
        if resp.status_code != 200:
            raise MizanError(
                _detail(resp, "Mizan could not build a rubric from this text."), resp.status_code
            )
        return resp.json()

    def create_screening(self, rubric: dict[str, Any]) -> str:
        try:
            resp = httpx.post(
                f"{self.base_url}/screenings",
                # Blind mode off: this is the owner's own public CV, and redaction would put
                # "[REDACTED]" inside the quoted evidence the visitor reads.
                json={"rubric": rubric, "blind": False},
                timeout=self.timeout,
            )
        except httpx.HTTPError as exc:
            raise MizanError("Mizan could not be reached.") from exc
        if resp.status_code != 201:
            raise MizanError(_detail(resp, "Mizan could not start a screening."), resp.status_code)
        return str(resp.json()["screening_id"])

    def screen(
        self, screening_id: str, cv_text: str, candidate_ref: str
    ) -> Iterator[tuple[str, dict[str, Any]]]:
        """Stream Mizan's events for one CV.

        Yields ("progress", {...}) pairs, then one ("result", {...}) or ("error", {...}).
        """
        headers = {"X-Internal-Key": self.internal_key} if self.internal_key else {}
        try:
            with httpx.stream(
                "POST",
                f"{self.base_url}/screen",
                files={"file": ("cv.txt", cv_text.encode("utf-8"), "text/plain")},
                data={"screening_id": screening_id, "candidate_ref": candidate_ref},
                headers=headers,
                timeout=self.timeout,
            ) as resp:
                if resp.status_code != 200:
                    resp.read()
                    raise MizanError(
                        _detail(resp, "Mizan refused the screening."), resp.status_code
                    )
                yield from parse_sse_lines(resp.iter_lines())
        except httpx.HTTPError as exc:
            raise MizanError("The connection to Mizan was interrupted.") from exc


@lru_cache
def get_mizan() -> MizanClient:
    s = get_settings()
    return MizanClient(s.mizan_api_url, s.mizan_internal_key)
