"""Application settings, read from environment variables (12-factor).

Locally the values come from `.env`; in production from Vercel env vars.
Never hard-code a key here. Every field here has a line in /.env.example.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Look for a .env in this file's ancestors (apps/api/.env, repo-root/.env, ...), so
# `uvicorn`/`pytest` find it no matter which folder you run from. Missing files are
# skipped. Real env vars (Vercel, CI) always win over any file.
_ENV_FILES = tuple(parent / ".env" for parent in Path(__file__).resolve().parents[:5])


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_FILES, env_file_encoding="utf-8", extra="ignore"
    )

    app_env: str = "development"
    log_level: str = "INFO"

    # LLM gateway (W2). Comma-separated chain, each item "name" or "name:model".
    llm_providers: str = "gemini,groq:openai/gpt-oss-120b"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    groq_api_key: str = ""
    openai_api_key: str = ""

    # Rate limit (Upstash REST). Empty URL = in-memory backend (local dev, tests).
    upstash_redis_rest_url: str = ""
    upstash_redis_rest_token: str = ""
    chat_limit_per_visitor_per_day: int = 30
    chat_global_per_day: int = 500
    fit_limit_per_visitor_per_day: int = 5
    fit_global_per_day: int = 100
    contact_limit_per_visitor_per_day: int = 5
    contact_global_per_day: int = 100

    # Abuse protection (D10)
    allowed_origins: str = "http://localhost:3000"
    session_token_secret: str = ""
    session_token_ttl_s: int = 3600

    # Recruiter Mode -> Mizan (W3)
    mizan_api_url: str = "https://mizan-hr-api.vercel.app"
    mizan_internal_key: str = ""

    # Contact form (W1/W2)
    resend_api_key: str = ""
    contact_to_email: str = ""

    @property
    def allowed_origin_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Cached so the .env file is parsed once per process."""
    return Settings()
