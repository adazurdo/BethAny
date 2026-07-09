from __future__ import annotations

import json
import os
from dataclasses import asdict
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from .account_repository import (
    authenticate_account,
    get_account_by_id,
    initialize_repository,
    register_account,
    replace_account_state,
)
from .models import AccountProfile, BetRecord, FriendshipData, SessionState

SESSION = SessionState()


def _json_response(handler: BaseHTTPRequestHandler, status: HTTPStatus, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.send_header("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS")
    handler.end_headers()
    handler.wfile.write(body)


def _read_json(handler: BaseHTTPRequestHandler) -> dict[str, Any]:
    length = int(handler.headers.get("Content-Length", "0"))
    if length <= 0:
        return {}
    raw = handler.rfile.read(length).decode("utf-8")
    return json.loads(raw or "{}")


def _serialize_account(account) -> dict[str, Any]:
    return account.to_dict()


def _coerce_profile(payload: dict[str, Any]) -> AccountProfile:
    return AccountProfile(
        display_name=str(payload.get("displayName", payload.get("display_name", ""))),
        avatar_url=str(payload.get("avatarUrl", payload.get("avatar_url", ""))),
        elo=int(payload.get("elo", 0)),
        rank_label=str(payload.get("rankLabel", payload.get("rank_label", ""))),
        win_rate=str(payload.get("winRate", payload.get("win_rate", ""))),
        streak=str(payload.get("streak", "")),
        bio=str(payload.get("bio", "")),
    )


def _coerce_bets(payload: list[dict[str, Any]]) -> list[BetRecord]:
    bets: list[BetRecord] = []
    for item in payload:
        bets.append(BetRecord(id=str(item.get("id", "")), title=str(item.get("title", "")), meta=item.get("meta"), status=str(item.get("status", "open"))))
    return bets


def _coerce_friends(payload: list[dict[str, Any]]) -> list[FriendshipData]:
    friends: list[FriendshipData] = []
    for item in payload:
        friends.append(
            FriendshipData(
                id=str(item.get("id", "")),
                name=str(item.get("name", "")),
                avatar_url=str(item.get("avatarUrl", item.get("avatar_url", ""))),
                sport_focus=str(item.get("sportFocus", item.get("sport_focus", ""))),
                status=str(item.get("status", "")),
                is_selected=bool(item.get("isSelected", item.get("is_selected", False))),
            )
        )
    return friends


class BethanyRequestHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self) -> None:  # noqa: N802
        _json_response(self, HTTPStatus.NO_CONTENT, {})

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            _json_response(self, HTTPStatus.OK, {"ok": True})
            return

        if self.path == "/account/me":
            if SESSION.active_account_id is None:
                _json_response(self, HTTPStatus.UNAUTHORIZED, {"error": "no active session"})
                return
            account = get_account_by_id(SESSION.active_account_id)
            if account is None:
                SESSION.active_account_id = None
                _json_response(self, HTTPStatus.NOT_FOUND, {"error": "account not found"})
                return
            _json_response(self, HTTPStatus.OK, _serialize_account(account))
            return

        _json_response(self, HTTPStatus.NOT_FOUND, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path == "/auth/register":
            payload = _read_json(self)
            try:
                account = register_account(
                    str(payload.get("identifier", "")),
                    str(payload.get("password", "")),
                    str(payload.get("displayName", payload.get("display_name", ""))) or None,
                )
            except ValueError as exc:
                message = str(exc)
                status = HTTPStatus.CONFLICT if "exists" in message else HTTPStatus.BAD_REQUEST
                _json_response(self, status, {"error": message})
                return
            SESSION.active_account_id = account.id
            _json_response(self, HTTPStatus.CREATED, _serialize_account(account))
            return

        if self.path == "/auth/login":
            payload = _read_json(self)
            try:
                account = authenticate_account(str(payload.get("identifier", "")), str(payload.get("password", "")))
            except LookupError as exc:
                _json_response(self, HTTPStatus.NOT_FOUND, {"error": str(exc)})
                return
            except PermissionError as exc:
                _json_response(self, HTTPStatus.UNAUTHORIZED, {"error": str(exc)})
                return
            SESSION.active_account_id = account.id
            _json_response(self, HTTPStatus.OK, _serialize_account(account))
            return

        if self.path == "/auth/logout":
            SESSION.active_account_id = None
            _json_response(self, HTTPStatus.OK, {"ok": True})
            return

        _json_response(self, HTTPStatus.NOT_FOUND, {"error": "not found"})

    def do_PUT(self) -> None:  # noqa: N802
        if self.path != "/account/me":
            _json_response(self, HTTPStatus.NOT_FOUND, {"error": "not found"})
            return
        if SESSION.active_account_id is None:
            _json_response(self, HTTPStatus.UNAUTHORIZED, {"error": "no active session"})
            return

        payload = _read_json(self)
        account = get_account_by_id(SESSION.active_account_id)
        if account is None:
            SESSION.active_account_id = None
            _json_response(self, HTTPStatus.NOT_FOUND, {"error": "account not found"})
            return

        if "profile" in payload and isinstance(payload["profile"], dict):
            account.profile = _coerce_profile(payload["profile"])
        if "bets" in payload and isinstance(payload["bets"], list):
            account.bets = _coerce_bets(payload["bets"])
        if "friends" in payload and isinstance(payload["friends"], list):
            account.friends = _coerce_friends(payload["friends"])

        updated = replace_account_state(account.id, profile=account.profile, bets=account.bets, friends=account.friends)
        _json_response(self, HTTPStatus.OK, _serialize_account(updated))


def create_app(host: str = "127.0.0.1", port: int = 8000) -> ThreadingHTTPServer:
    initialize_repository()
    return ThreadingHTTPServer((host, port), BethanyRequestHandler)


def serve() -> None:
    host = os.getenv("BETHANY_API_HOST", "127.0.0.1")
    port = int(os.getenv("BETHANY_API_PORT", "8000"))
    server = create_app(host=host, port=port)
    print(f"BethAny API listening on http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
