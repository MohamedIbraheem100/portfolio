"""FastAPI entrypoint. Run locally with: uvicorn portfolio_api.main:app --reload --port 8000"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from portfolio_api import __version__
from portfolio_api.core.config import get_settings
from portfolio_api.core.logging import configure_logging
from portfolio_api.routes import contact, fit, health, session

configure_logging(get_settings().log_level)

app = FastAPI(
    title="Portfolio API",
    description="Portfolio backend: AI twin, recruiter mode (via Mizan), contact form.",
    version=__version__,
)

# The Next.js app proxies /api/* to this project (same origin for the browser), so CORS
# is normally not exercised. It stays configured as the fallback path (D5) and because
# ALLOWED_ORIGINS also feeds the Origin check on the write endpoints (D10).
_settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.allowed_origin_list,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(session.router)
app.include_router(contact.router)
app.include_router(fit.router)
