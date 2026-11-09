"""The CV that Recruiter Mode sends to Mizan.

Single source of truth stays `resume.yaml` in the web app: it renders a plain-text CV at
`/cv.txt`, and this module fetches it (cached in-process for an hour). Plain text keeps
Mizan's quote verification exact, with no PDF text-layer surprises.
"""

import logging
import time
from functools import lru_cache

import httpx

from portfolio_api.core.config import get_settings

log = logging.getLogger("portfolio.cv")

TTL_S = 3600
MIN_CHARS = 200


class CvUnavailable(RuntimeError):
    """The CV text could not be fetched or is implausibly short."""


class CvSource:
    def __init__(self, url: str) -> None:
        self.url = url
        self._text: str | None = None
        self._fetched_at = 0.0

    def text(self) -> str:
        if self._text and time.time() - self._fetched_at < TTL_S:
            return self._text
        try:
            resp = httpx.get(self.url, timeout=10.0, follow_redirects=True)
            resp.raise_for_status()
        except httpx.HTTPError as exc:
            if self._text:  # serve the stale copy rather than fail the visitor
                log.warning("cv refresh failed, serving stale copy: %s", exc)
                return self._text
            raise CvUnavailable("The CV text is not reachable.") from exc
        text = resp.text.strip()
        if len(text) < MIN_CHARS:
            raise CvUnavailable("The CV text looks empty.")
        self._text, self._fetched_at = text, time.time()
        return text


@lru_cache
def get_cv_source() -> CvSource:
    return CvSource(get_settings().cv_text_url)
