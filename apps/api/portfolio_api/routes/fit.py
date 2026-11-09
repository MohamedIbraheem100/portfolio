"""POST /fit: Recruiter Mode. A job description in, an evidence-first fit report out (SSE).

The work is done by Mizan (services/mizan.py); this route orchestrates its three calls with
the owner's CV, forwards progress, reshapes the result so evidence comes before the score
(D12), and caches it for 24 h under the SHA-256 of the normalized JD (D11). The JD text is
never stored or logged. If Mizan is unavailable the visitor gets a plain error event, never
a made-up score.

Stream (events arrive as each step happens, so the panel can narrate the wait):
    event: stage     {"stage": "rubric" | "screening", "status": "running" | "done", ...}
                     rubric/done also carries job_title and requirements[{name, type}]
    event: progress  {"node": "extract" | "judge" | ..., "status": "running" | "done"}
    event: result    FitResult
    event: error     {"detail": "..."}
"""

import hashlib
import json
import logging
import re
from collections.abc import Iterator
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from starlette.concurrency import iterate_in_threadpool

from portfolio_api.core.cache import Cache, get_cache
from portfolio_api.core.config import get_settings
from portfolio_api.core.ratelimit import RateLimiter, get_limiter
from portfolio_api.core.security import require_origin, require_token, visitor_key
from portfolio_api.services.cv import CvSource, CvUnavailable, get_cv_source
from portfolio_api.services.mizan import MizanClient, MizanError, get_mizan

log = logging.getLogger("portfolio.fit")
router = APIRouter(tags=["fit"])

CANDIDATE_REF = "Mohamed Ibrahim"
# The warm-up is one health call to Mizan; the cap only stops it being used as a relay.
WARM_PER_VISITOR_PER_DAY = 40
WARM_GLOBAL_PER_DAY = 4000
UNAVAILABLE = (
    "Mizan is not available right now, so there is no result to show. "
    "Please download the CV or email me instead."
)


class FitIn(BaseModel):
    jd_text: str = Field(min_length=30, max_length=10_000)
    token: str = Field(max_length=200)


class Evidence(BaseModel):
    quote: str


class Requirement(BaseModel):
    name: str
    type: str  # must_have | nice_to_have
    verdict: str  # met | partial | not_met | no_evidence
    evidence: list[Evidence] = Field(default_factory=list)
    reasoning: str = ""


class FitResult(BaseModel):
    """Evidence first: what is met (with the quoted CV line), then the gaps, then the score."""

    job_title: str
    language: str
    met: list[Requirement]
    gaps: list[Requirement]
    summary: str
    score: int
    must_haves_met: bool
    quotes_checked: int
    quotes_verified: int
    duration_ms: int
    cached: bool = False


def normalize_jd(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().lower()


def jd_key(text: str) -> str:
    return "fit:v1:" + hashlib.sha256(normalize_jd(text).encode("utf-8")).hexdigest()


def to_fit_result(rubric: dict[str, Any], result: dict[str, Any]) -> FitResult:
    met: list[Requirement] = []
    gaps: list[Requirement] = []
    for j in result.get("judgments", []):
        req = Requirement(
            name=j.get("criterion_name", ""),
            type=j.get("criterion_type", "nice_to_have"),
            verdict=j.get("verdict", "no_evidence"),
            evidence=[Evidence(quote=e["quote"]) for e in j.get("evidence", []) if e.get("quote")],
            reasoning=j.get("reasoning", ""),
        )
        (met if req.verdict in ("met", "partial") else gaps).append(req)
    # must-haves first inside each group
    met.sort(key=lambda r: r.type != "must_have")
    gaps.sort(key=lambda r: r.type != "must_have")
    verify = result.get("verify", {})
    return FitResult(
        job_title=rubric.get("job_title", ""),
        language=result.get("language", rubric.get("language", "en")),
        met=met,
        gaps=gaps,
        summary=result.get("summary", ""),
        score=int(result.get("score", 0)),
        must_haves_met=bool(result.get("must_haves_met", False)),
        quotes_checked=int(verify.get("quotes_checked", 0)),
        quotes_verified=int(verify.get("quotes_verified", 0)),
        duration_ms=int(result.get("duration_ms", 0)),
    )


def sse(event: str, payload: BaseModel | dict[str, Any]) -> str:
    data = payload.model_dump_json() if isinstance(payload, BaseModel) else json.dumps(payload)
    return f"event: {event}\ndata: {data}\n\n"


def run_fit(
    jd_text: str, mizan: MizanClient, cv: CvSource, cache: Cache, ttl_s: int
) -> Iterator[str]:
    key = jd_key(jd_text)
    hit = cache.get(key)
    if hit:
        hit["cached"] = True
        yield sse("result", hit)
        return
    try:
        yield sse("stage", {"stage": "rubric", "status": "running"})
        rubric = mizan.rubric(jd_text)
        criteria = rubric.get("criteria", [])
        yield sse(
            "stage",
            {
                "stage": "rubric",
                "status": "done",
                "job_title": rubric.get("job_title", ""),
                "criteria": len(criteria),
                # The requirements are shown at once as the skeleton of the report.
                "requirements": [
                    {"name": c.get("name", ""), "type": c.get("type", "nice_to_have")}
                    for c in criteria
                ],
            },
        )
        # Announce the next step before doing it: fetching the CV and opening the screening
        # in Mizan takes a couple of seconds and must not look like a stall.
        yield sse("stage", {"stage": "screening", "status": "running"})
        cv_text = cv.text()
        screening_id = mizan.create_screening(rubric)
        yield sse("stage", {"stage": "screening", "status": "done"})
        for event, payload in mizan.screen(screening_id, cv_text, CANDIDATE_REF):
            if event == "progress":
                # Mizan echoes the numbered CV lines in the parse event;
                # the panel does not need them.
                yield sse(
                    "progress", {"node": payload.get("node"), "status": payload.get("status")}
                )
            elif event == "result":
                fit = to_fit_result(rubric, payload)
                cache.set(key, fit.model_dump(), ttl_s)
                yield sse("result", fit)
                return
            elif event == "error":
                log.warning("mizan error event: %s", payload.get("detail"))
                yield sse("error", {"detail": UNAVAILABLE})
                return
        yield sse("error", {"detail": UNAVAILABLE})  # stream ended without a result
    except MizanError as exc:
        log.warning("mizan failed status=%s: %s", exc.status, exc.detail)
        # 4xx about the JD itself (too short, unusable rubric) is worth showing; the rest is "down".
        detail = exc.detail if exc.status in (400, 422, 502) else UNAVAILABLE
        yield sse("error", {"detail": detail})
    except CvUnavailable as exc:
        log.error("cv unavailable: %s", exc)
        yield sse("error", {"detail": UNAVAILABLE})
    except Exception:
        log.exception("fit crashed")
        yield sse("error", {"detail": UNAVAILABLE})


@router.get("/fit/warm")
def warm(
    request: Request,
    mizan: Annotated[MizanClient, Depends(get_mizan)],
    limiter: Annotated[RateLimiter, Depends(get_limiter)],
) -> dict[str, bool]:
    """Wake Mizan before the visitor submits (called when the form is first touched).

    Serverless cold starts on both sides add seconds to the first step; one cheap
    health call removes most of that. Never fails the page: over the (generous) limit
    or with Mizan down it answers {"warm": false}.
    """
    require_origin(request)
    try:
        limiter.hit("warm", visitor_key(request), WARM_PER_VISITOR_PER_DAY, WARM_GLOBAL_PER_DAY)
    except HTTPException:
        return {"warm": False}
    return {"warm": mizan.wake()}


@router.post("/fit")
def fit(
    body: FitIn,
    request: Request,
    mizan: Annotated[MizanClient, Depends(get_mizan)],
    cv: Annotated[CvSource, Depends(get_cv_source)],
    cache: Annotated[Cache, Depends(get_cache)],
    limiter: Annotated[RateLimiter, Depends(get_limiter)],
) -> StreamingResponse:
    require_origin(request)
    require_token(body.token)
    s = get_settings()
    limiter.hit("fit", visitor_key(request), s.fit_limit_per_visitor_per_day, s.fit_global_per_day)
    return StreamingResponse(
        iterate_in_threadpool(run_fit(body.jd_text, mizan, cv, cache, s.fit_cache_ttl_s)),
        media_type="text/event-stream",
        # no-transform: a proxy that compresses the stream would buffer it and the visitor
        # would see every step at once at the end (Next.js does this without it).
        headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"},
    )
