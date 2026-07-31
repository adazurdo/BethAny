from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Header, HTTPException

from ..account_repository import authenticate_account, register_account
from ..session import SESSIONS, _new_session_token, _serialize_account, extract_bearer_token

router = APIRouter()


@router.post("/auth/register", status_code=201)
def register(payload: dict[str, Any] = Body(default={})) -> dict[str, Any]:
    try:
        account = register_account(
            str(payload.get("identifier", "")),
            str(payload.get("password", "")),
            str(payload.get("displayName", payload.get("display_name", ""))) or None,
        )
    except ValueError as exc:
        message = str(exc)
        status_code = 409 if "exists" in message else 400
        raise HTTPException(status_code=status_code, detail=message) from exc
    token = _new_session_token()
    SESSIONS[token] = account.id
    return {**_serialize_account(account), "sessionToken": token}


@router.post("/auth/login")
def login(payload: dict[str, Any] = Body(default={})) -> dict[str, Any]:
    try:
        account = authenticate_account(str(payload.get("identifier", "")), str(payload.get("password", "")))
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        # Wrong password on login is a 401 ("come back with the right credentials"), unlike
        # the 403 ("you're logged in but not allowed") used for PermissionError elsewhere.
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    token = _new_session_token()
    SESSIONS[token] = account.id
    return {**_serialize_account(account), "sessionToken": token}


@router.post("/auth/logout")
def logout(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    token = extract_bearer_token(authorization)
    if token:
        SESSIONS.pop(token, None)
    return {"ok": True}
