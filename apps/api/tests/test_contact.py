import httpx
import pytest
from fastapi.testclient import TestClient

from portfolio_api.core import ratelimit
from portfolio_api.core.config import get_settings
from portfolio_api.core.security import issue_token
from portfolio_api.main import app
from portfolio_api.routes import contact as contact_route

client = TestClient(app)
SITE = {"Origin": "http://localhost:3000"}


def _body(**over):
    base = {
        "name": "Recruiter",
        "email": "recruiter@example.com",
        "message": "Hello Mohamed, we would like to talk about a role.",
        "token": issue_token()[0],
        "website": "",
    }
    base.update(over)
    return base


@pytest.fixture(autouse=True)
def fresh_limiter(monkeypatch):
    ratelimit.get_limiter.cache_clear()
    yield
    ratelimit.get_limiter.cache_clear()


@pytest.fixture
def sent(monkeypatch):
    calls: list[tuple[str, str, str]] = []

    def fake(name, email, message):
        calls.append((name, email, message))
        return "msg_1"

    monkeypatch.setattr(contact_route.email_service, "send_contact_email", fake)
    return calls


def test_contact_sends_email(sent):
    resp = client.post("/contact", json=_body(), headers=SITE)
    assert resp.status_code == 202, resp.text
    assert resp.json()["status"] == "sent"
    assert sent == [
        ("Recruiter", "recruiter@example.com", "Hello Mohamed, we would like to talk about a role.")
    ]


def test_honeypot_is_swallowed_silently(sent):
    resp = client.post("/contact", json=_body(website="http://spam.example"), headers=SITE)
    assert resp.status_code == 202
    assert resp.json()["status"] == "accepted"
    assert sent == [], "nothing must be sent for a honeypot hit"


def test_contact_requires_origin_and_token(sent):
    assert client.post("/contact", json=_body()).status_code == 403
    assert client.post("/contact", json=_body(token="bad"), headers=SITE).status_code == 403
    assert sent == []


def test_contact_validates_fields(sent):
    bad_email = client.post("/contact", json=_body(email="not-an-email"), headers=SITE)
    assert bad_email.status_code == 422
    assert client.post("/contact", json=_body(message="short"), headers=SITE).status_code == 422
    assert sent == []


def test_contact_rate_limit_per_visitor(sent, monkeypatch):
    monkeypatch.setenv("CONTACT_LIMIT_PER_VISITOR_PER_DAY", "2")
    get_settings.cache_clear()
    try:
        assert client.post("/contact", json=_body(), headers=SITE).status_code == 202
        assert client.post("/contact", json=_body(), headers=SITE).status_code == 202
        assert client.post("/contact", json=_body(), headers=SITE).status_code == 429
        assert len(sent) == 2
    finally:
        get_settings.cache_clear()


def test_contact_reports_missing_configuration(monkeypatch):
    def not_configured(*_):
        raise contact_route.email_service.EmailNotConfigured

    monkeypatch.setattr(contact_route.email_service, "send_contact_email", not_configured)
    assert client.post("/contact", json=_body(), headers=SITE).status_code == 503


def test_contact_reports_provider_failure(monkeypatch):
    def boom(*_):
        raise httpx.ConnectError("down")

    monkeypatch.setattr(contact_route.email_service, "send_contact_email", boom)
    assert client.post("/contact", json=_body(), headers=SITE).status_code == 502
