"""Liveness endpoint. Used by Vercel, uptime monitors and the CI smoke test."""

from fastapi import APIRouter

from portfolio_api import __version__
from portfolio_api.core.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    settings = get_settings()
    return {
        "status": "ok",
        "service": "portfolio-api",
        "version": __version__,
        "env": settings.app_env,
    }
