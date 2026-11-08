"""POST /contact: the contact form.

Protected by D10 (origin check, session token, rate limit) plus a honeypot field.
"""

import logging
import re

import httpx
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field

from portfolio_api.core.config import get_settings
from portfolio_api.core.ratelimit import get_limiter
from portfolio_api.core.security import require_origin, require_token, visitor_key
from portfolio_api.services import email as email_service

log = logging.getLogger("portfolio.contact")
router = APIRouter(tags=["contact"])

_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")


class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: str = Field(min_length=3, max_length=254, pattern=_EMAIL.pattern)
    message: str = Field(min_length=10, max_length=2000)
    token: str = Field(max_length=200)
    # Honeypot: real visitors never see this field; anything in it is a bot.
    website: str = ""


class ContactOut(BaseModel):
    status: str


@router.post("/contact", response_model=ContactOut, status_code=status.HTTP_202_ACCEPTED)
def contact(body: ContactIn, request: Request) -> ContactOut:
    require_origin(request)
    if body.website:
        # Pretend success so the bot learns nothing. Nothing is sent.
        return ContactOut(status="accepted")
    require_token(body.token)
    s = get_settings()
    get_limiter().hit(
        "contact",
        visitor_key(request),
        s.contact_limit_per_visitor_per_day,
        s.contact_global_per_day,
    )
    try:
        message_id = email_service.send_contact_email(
            body.name.strip(), body.email.strip(), body.message.strip()
        )
    except email_service.EmailNotConfigured as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "The contact form is not configured yet. Please email me.",
        ) from exc
    except httpx.HTTPError as exc:
        log.warning("resend failed: %s", exc)
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, "Could not send right now. Please email me directly."
        ) from exc
    log.info("contact sent id=%s", message_id)
    return ContactOut(status="sent")
