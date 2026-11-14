"""POST /chat: the AI twin. A visitor's question in, one checked answer out (SSE).

Same protection as the other write endpoints (D10): Origin check, short-lived session token,
per-visitor daily and per-minute limits, a global daily cap. The answer is produced whole,
checked in code (services/twin.py), and only then sent, so nothing unchecked ever reaches the page.
Questions are not stored and not logged. A first question (no history) is answered from a
24-hour cache keyed by the hash of the question, so repeated and starter questions cost no
model quota; only the checked answer text is kept there.

Stream:
    event: status  {"state": "thinking"}
    event: answer  {"text": "...", "lang": "ar" | "en", "source": "model" | "fallback" | "busy"}
    event: done    {}
"""

import hashlib
import json
import logging
import re
from collections.abc import Iterator
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator
from starlette.concurrency import iterate_in_threadpool

from portfolio_api.core.cache import Cache, get_cache
from portfolio_api.core.config import get_settings
from portfolio_api.core.ratelimit import RateLimiter, get_limiter, hit_burst
from portfolio_api.core.security import require_origin, require_token, visitor_key
from portfolio_api.services import twin
from portfolio_api.services.llm import LLMGateway, get_llm

log = logging.getLogger("portfolio.chat")
router = APIRouter(tags=["chat"])


class HistoryTurn(BaseModel):
    role: Literal["user", "assistant"]
    text: str = Field(max_length=4000)


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=twin.MAX_MESSAGE_CHARS)
    # Sent back by the browser each time, so it is untrusted; twin.clean_history trims it.
    history: list[HistoryTurn] = Field(default_factory=list, max_length=40)
    token: str = Field(max_length=200)

    @field_validator("message")
    @classmethod
    def not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("message is empty")
        return value


def sse(event: str, payload: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


def question_key(message: str) -> str:
    """Cache key: the normalised question plus the prompt it was answered with, hashed.
    A change to the rules or the knowledge base therefore empties the cache by itself."""
    normal = re.sub(r"[\s?!.،؟]+", " ", message.lower()).strip()
    digest = hashlib.sha256(f"{twin.system_prompt()}|{normal}".encode()).hexdigest()
    return f"chat:{digest}"


def run_chat(
    message: str, history: list[dict], llm: LLMGateway, cache: Cache, ttl_s: int
) -> Iterator[str]:
    yield sse("status", {"state": "thinking"})
    key = None if history else question_key(message)
    hit = cache.get(key) if key else None
    if hit:
        yield sse("answer", {"text": hit["text"], "lang": hit["lang"], "source": "model"})
        yield sse("done", {})
        return
    try:
        result = twin.answer(message, history, llm)
        if key and result.source == "model":
            cache.set(key, {"text": result.text, "lang": result.lang}, ttl_s)
    except Exception:
        # Never an error page and never a hang: the visitor gets the busy reply.
        log.exception("chat crashed")
        lang = twin.language_of(message)
        result = twin.TwinAnswer(twin.BUSY[lang], lang, "busy")
    yield sse("answer", {"text": result.text, "lang": result.lang, "source": result.source})
    yield sse("done", {})


@router.get("/chat/status")
def status(llm: Annotated[LLMGateway, Depends(get_llm)]) -> dict[str, int]:
    """Deployment check, no secrets: is the knowledge base in the bundle and how many models
    have a key? A deploy without the files or the keys would answer every question with "busy"."""
    files = sum((twin.KNOWLEDGE_DIR / name).is_file() for name in twin.KNOWLEDGE_ORDER)
    return {"knowledge_files": files, "models": len(llm.specs)}


@router.post("/chat")
def chat(
    body: ChatIn,
    request: Request,
    llm: Annotated[LLMGateway, Depends(get_llm)],
    limiter: Annotated[RateLimiter, Depends(get_limiter)],
    cache: Annotated[Cache, Depends(get_cache)],
) -> StreamingResponse:
    require_origin(request)
    require_token(body.token)
    s = get_settings()
    visitor = visitor_key(request)
    hit_burst(limiter, "chat", visitor, s.chat_burst_per_minute)
    limiter.hit("chat", visitor, s.chat_limit_per_visitor_per_day, s.chat_global_per_day)
    history = [turn.model_dump() for turn in body.history]
    return StreamingResponse(
        iterate_in_threadpool(run_chat(body.message, history, llm, cache, s.chat_cache_ttl_s)),
        media_type="text/event-stream",
        # no-transform: a compressing proxy would buffer the stream (see routes/fit.py).
        headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"},
    )
