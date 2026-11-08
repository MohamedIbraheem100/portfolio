"""Outbound email through Resend's REST API (free tier). One function, easy to mock in tests.

Without a verified domain, Resend only allows the `onboarding@resend.dev` sender and only
delivers to the account owner's address, which is exactly the contact-form case.
"""

import httpx

from portfolio_api.core.config import get_settings

RESEND_URL = "https://api.resend.com/emails"
SENDER = "Portfolio contact <onboarding@resend.dev>"


class EmailNotConfigured(RuntimeError):
    """RESEND_API_KEY or CONTACT_TO_EMAIL is missing."""


def send_contact_email(name: str, email: str, message: str) -> str:
    """Send the visitor's message to the owner; returns Resend's message id."""
    s = get_settings()
    if not s.resend_api_key or not s.contact_to_email:
        raise EmailNotConfigured
    body = {
        "from": SENDER,
        "to": [s.contact_to_email],
        "reply_to": email,
        "subject": f"Portfolio contact from {name}",
        "text": f"From: {name} <{email}>\n\n{message}\n",
    }
    resp = httpx.post(
        RESEND_URL,
        headers={"Authorization": f"Bearer {s.resend_api_key}"},
        json=body,
        timeout=10.0,
    )
    resp.raise_for_status()
    return str(resp.json().get("id", ""))
