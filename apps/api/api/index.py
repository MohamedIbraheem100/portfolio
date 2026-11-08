"""Vercel entrypoint.

Vercel's Python runtime detects the FastAPI app named `app` under api/ and routes
every path to it, so FastAPI keeps its own routing (/health, /chat, /fit, /contact).
Do NOT add a rewrite to /api/index in vercel.json: the app would then receive
"/api/index" as the path for every request and answer 404 (learned in W0).

Locally you never use this file: `uvicorn portfolio_api.main:app` runs the same app.
"""

from portfolio_api.main import app  # noqa: F401
