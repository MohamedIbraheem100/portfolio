"""Provider-agnostic LLM gateway (same idea as Mizan's): a ladder of models tried in order.

The AI twin must never hang or fail because one free tier ran out. So every model has its own
cooldown: a model that answers 429 (or breaks) is skipped until its wait is over and the request
goes to the next one. Only when every model is unavailable does the caller get `AllProvidersBusy`,
which the chat route turns into an honest "busy" reply.

Plain HTTP with httpx, no SDKs: the Vercel bundle stays small and the three APIs are simple.
Calls are not streamed on purpose. Replies are short (about a second) and the route checks the
whole answer in code before a visitor sees any of it.
"""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

import httpx

from portfolio_api.core.config import get_settings

log = logging.getLogger("portfolio.llm")

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
OPENAI_STYLE_URLS = {
    "groq": "https://api.groq.com/openai/v1/chat/completions",
    "openai": "https://api.openai.com/v1/chat/completions",
}
DEFAULT_MODELS = {"groq": "openai/gpt-oss-120b", "openai": "gpt-4.1-mini"}

RATE_LIMIT_COOLDOWN_S = 30.0  # when a 429 carries no retry-after
BROKEN_COOLDOWN_S = 20.0  # 5xx, timeout, empty answer: try again soon
CONFIG_COOLDOWN_S = 600.0  # 400/401/403/404: a key or model name is wrong; do not hammer it
MAX_COOLDOWN_S = 120.0


class AllProvidersBusy(RuntimeError):
    """Every model in the ladder is cooling down or failed for this request."""


class ProviderFailed(RuntimeError):
    def __init__(self, reason: str, cooldown_s: float) -> None:
        super().__init__(reason)
        self.cooldown_s = cooldown_s


@dataclass(frozen=True)
class ProviderSpec:
    provider: str  # gemini | groq | openai
    model: str

    @property
    def name(self) -> str:
        return f"{self.provider}:{self.model}"


@dataclass(frozen=True)
class Turn:
    role: str  # "user" | "assistant"
    text: str


@dataclass(frozen=True)
class LLMReply:
    text: str
    provider: str
    model: str


def parse_providers(chain: str, gemini_model: str) -> list[ProviderSpec]:
    """ "gemini,groq:qwen/qwen3.8-27b" -> specs. Unknown providers are dropped with a warning."""
    specs: list[ProviderSpec] = []
    for item in (part.strip() for part in chain.split(",")):
        if not item:
            continue
        provider, _, model = item.partition(":")
        provider = provider.strip().lower()
        if provider == "gemini":
            specs.append(ProviderSpec("gemini", model.strip() or gemini_model))
        elif provider in OPENAI_STYLE_URLS:
            specs.append(ProviderSpec(provider, model.strip() or DEFAULT_MODELS[provider]))
        else:
            log.warning("unknown LLM provider in LLM_PROVIDERS: %s", provider)
    return specs


def _retry_after(response: httpx.Response) -> float:
    try:
        return min(max(float(response.headers.get("retry-after", "")), 1.0), MAX_COOLDOWN_S)
    except ValueError:
        return RATE_LIMIT_COOLDOWN_S


def _failure(response: httpx.Response) -> ProviderFailed:
    status = response.status_code
    if status == 429:
        return ProviderFailed("rate limited", _retry_after(response))
    if status >= 500:
        return ProviderFailed(f"upstream {status}", BROKEN_COOLDOWN_S)
    return ProviderFailed(f"rejected {status}", CONFIG_COOLDOWN_S)


class LLMGateway:
    def __init__(
        self,
        specs: list[ProviderSpec],
        keys: dict[str, str],
        client: httpx.Client | None = None,
        timeout_s: float = 20.0,
        clock: Any = time.monotonic,
    ) -> None:
        # A provider without a key is not part of the ladder (OpenAI is optional).
        self.specs = [s for s in specs if keys.get(s.provider)]
        self._keys = keys
        self._client = client or httpx.Client(timeout=timeout_s)
        self._clock = clock
        self._cooldown_until: dict[str, float] = {}
        self._lock = threading.Lock()

    # -- cooldown bookkeeping (per process; a serverless instance keeps its own view)
    def _available(self, spec: ProviderSpec) -> bool:
        with self._lock:
            return self._clock() >= self._cooldown_until.get(spec.name, 0.0)

    def _cool(self, spec: ProviderSpec, seconds: float) -> None:
        with self._lock:
            self._cooldown_until[spec.name] = self._clock() + seconds

    def complete(self, system: str, turns: list[Turn], max_tokens: int = 500) -> LLMReply:
        """Ask the first available model. Raises AllProvidersBusy when none can answer."""
        for spec in self.specs:
            if not self._available(spec):
                continue
            try:
                text = self._call(spec, system, turns, max_tokens)
            except ProviderFailed as exc:
                log.warning("llm %s failed: %s (cooldown %.0fs)", spec.name, exc, exc.cooldown_s)
                self._cool(spec, exc.cooldown_s)
                continue
            except httpx.HTTPError as exc:
                log.warning("llm %s unreachable: %s", spec.name, type(exc).__name__)
                self._cool(spec, BROKEN_COOLDOWN_S)
                continue
            return LLMReply(text=text, provider=spec.provider, model=spec.model)
        raise AllProvidersBusy("no model available")

    def _call(self, spec: ProviderSpec, system: str, turns: list[Turn], max_tokens: int) -> str:
        if spec.provider == "gemini":
            return self._gemini(spec, system, turns, max_tokens)
        return self._openai_style(spec, system, turns, max_tokens)

    def _gemini(self, spec: ProviderSpec, system: str, turns: list[Turn], max_tokens: int) -> str:
        body = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [
                {"role": "model" if t.role == "assistant" else "user", "parts": [{"text": t.text}]}
                for t in turns
            ],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": max_tokens},
        }
        response = self._client.post(
            GEMINI_URL.format(model=spec.model),
            # The key goes in a header, never in the URL (URLs end up in logs).
            headers={"x-goog-api-key": self._keys["gemini"]},
            json=body,
        )
        if response.status_code != 200:
            raise _failure(response)
        candidates = response.json().get("candidates") or [{}]
        candidate = candidates[0]
        if candidate.get("finishReason") not in (None, "STOP"):
            # MAX_TOKENS, SAFETY, ...: a cut or blocked answer is not shown; the next model tries.
            raise ProviderFailed(f"finish {candidate.get('finishReason')}", BROKEN_COOLDOWN_S)
        parts = candidate.get("content", {}).get("parts", [])
        text = "".join(p.get("text", "") for p in parts).strip()
        if not text:
            raise ProviderFailed("empty answer", BROKEN_COOLDOWN_S)
        return text

    def _openai_style(
        self, spec: ProviderSpec, system: str, turns: list[Turn], max_tokens: int
    ) -> str:
        body: dict[str, Any] = {
            "model": spec.model,
            "messages": [
                {"role": "system", "content": system},
                *({"role": t.role, "content": t.text} for t in turns),
            ],
            "temperature": 0.2,
            "max_completion_tokens": max_tokens,
        }
        if spec.provider == "groq" and "gpt-oss" in spec.model:
            # Reasoning models: keep the hidden reasoning short so the answer fits the budget.
            body["reasoning_effort"] = "low"
            body["max_completion_tokens"] = max_tokens + 300
        response = self._client.post(
            OPENAI_STYLE_URLS[spec.provider],
            headers={"Authorization": f"Bearer {self._keys[spec.provider]}"},
            json=body,
        )
        if response.status_code != 200:
            raise _failure(response)
        choice = (response.json().get("choices") or [{}])[0]
        if choice.get("finish_reason") not in (None, "stop"):
            raise ProviderFailed(f"finish {choice.get('finish_reason')}", BROKEN_COOLDOWN_S)
        text = (choice.get("message", {}).get("content") or "").strip()
        if not text:
            raise ProviderFailed("empty answer", BROKEN_COOLDOWN_S)
        return text


@lru_cache
def get_llm() -> LLMGateway:
    """One gateway per process, so cooldowns are remembered between requests."""
    s = get_settings()
    return LLMGateway(
        parse_providers(s.llm_providers, s.gemini_model),
        {"gemini": s.gemini_api_key, "groq": s.groq_api_key, "openai": s.openai_api_key},
    )
