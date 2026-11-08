"""Vercel entrypoint.

Vercel's Python runtime looks for an ASGI app named `app` under api/. vercel.json
rewrites every path here, so FastAPI keeps its own routing (/health, /chat, /fit,
/contact). Locally you never use this file: `uvicorn portfolio_api.main:app` runs
the same app.
"""

from portfolio_api.main import app  # noqa: F401
