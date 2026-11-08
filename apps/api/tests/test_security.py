from fastapi.testclient import TestClient

from portfolio_api.core.security import issue_token, verify_token
from portfolio_api.main import app

client = TestClient(app)
SITE = {"Origin": "http://localhost:3000"}


def test_token_roundtrip_and_expiry():
    token, exp = issue_token(now=1_000_000)
    assert verify_token(token, now=1_000_100)
    assert not verify_token(token, now=exp + 1), "expired tokens must fail"
    tampered = token[:-1] + ("0" if token[-1] != "0" else "1")
    assert not verify_token(tampered, now=1_000_100), "tampered token must fail"
    assert not verify_token("garbage")


def test_session_requires_origin():
    assert client.get("/session").status_code == 403
    assert client.get("/session", headers={"Origin": "https://evil.example"}).status_code == 403
    resp = client.get("/session", headers=SITE)
    assert resp.status_code == 200
    assert verify_token(resp.json()["token"])


def test_referer_is_accepted_when_origin_missing():
    resp = client.get("/session", headers={"Referer": "http://localhost:3000/#contact"})
    assert resp.status_code == 200
