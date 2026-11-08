"""GET /session: hands the page a short-lived token to attach to write requests (D10)."""

from fastapi import APIRouter, Request

from portfolio_api.core.security import issue_token, require_origin

router = APIRouter(tags=["session"])


@router.get("/session")
def session(request: Request) -> dict[str, str | int]:
    require_origin(request)
    token, expires = issue_token()
    return {"token": token, "expires": expires}
