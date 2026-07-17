from __future__ import annotations

import json
import os
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import urlsplit

from .account_repository import (
    authenticate_account,
    get_account_by_id,
    initialize_repository,
    register_account,
    replace_account_state,
)
from .bet_repository import (
    initialize_repository as initialize_bet_repository,
    list_placed_bets,
    place_bet,
)
from .mock_dataset_repository import (
    get_competition_source,
    get_snapshot,
    initialize_repository as initialize_mock_dataset_repository,
    list_competition_sources,
)
from .mock_dataset_service import sync_competition
from .models import AccountProfile, BetRecord, SessionState
from .odds import generate_match_odds
from .social_repository import (
    ConflictError,
    abort_prediction,
    ack_elo_milestones,
    add_prediction,
    cast_vote,
    create_group,
    friend_state,
    get_group,
    initialize_repository as initialize_social_repository,
    invite_member,
    list_groups_for_account,
    list_incoming_group_invites,
    list_unseen_elo_milestones,
    mark_group_seen,
    remove_friend,
    resolve_prediction,
    respond_friend_request,
    respond_group_invite,
    send_friend_request,
    serialize_group_detail,
)

SESSION = SessionState()


def _json_response(handler: BaseHTTPRequestHandler, status: HTTPStatus, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.send_header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
    handler.end_headers()
    handler.wfile.write(body)


def _read_json(handler: BaseHTTPRequestHandler) -> dict[str, Any]:
    length = int(handler.headers.get("Content-Length", "0"))
    if length <= 0:
        return {}
    raw = handler.rfile.read(length).decode("utf-8")
    return json.loads(raw or "{}")


def _serialize_account(account) -> dict[str, Any]:
    return {**account.to_dict(), "unseenEloMilestones": list_unseen_elo_milestones(account.id)}


def _split_path(path: str) -> list[str]:
    return [segment for segment in urlsplit(path).path.split("/") if segment]


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


def _serialize_match(match) -> dict[str, Any]:
    return {**match.to_dict(), **generate_match_odds(match.id).to_dict()}


def _coerce_bets(payload: list[dict[str, Any]]) -> list[BetRecord]:
    bets: list[BetRecord] = []
    for item in payload:
        bets.append(
            BetRecord(
                id=str(item.get("id", "")),
                title=str(item.get("title", "")),
                meta=item.get("meta"),
                status=str(item.get("status", "open")),
                match_id=item.get("matchId"),
                outcome=item.get("outcome"),
                odds=item.get("odds"),
                stake=item.get("stake"),
            )
        )
    return bets


class BethanyRequestHandler(BaseHTTPRequestHandler):
    def _require_session(self) -> str | None:
        if SESSION.active_account_id is None:
            _json_response(self, HTTPStatus.UNAUTHORIZED, {"error": "no active session"})
            return None
        return SESSION.active_account_id

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

        segments = _split_path(self.path)

        if segments == ["social", "friends"]:
            account_id = self._require_session()
            if account_id is None:
                return
            _json_response(self, HTTPStatus.OK, friend_state(account_id))
            return

        if segments == ["social", "groups", "invites"]:
            account_id = self._require_session()
            if account_id is None:
                return
            _json_response(self, HTTPStatus.OK, {"invites": list_incoming_group_invites(account_id)})
            return

        if segments[:2] == ["social", "groups"]:
            account_id = self._require_session()
            if account_id is None:
                return

            if len(segments) == 2:
                _json_response(self, HTTPStatus.OK, {"groups": list_groups_for_account(account_id)})
                return

            if len(segments) == 3:
                group_id = segments[2]
                group = get_group(group_id)
                if group is None:
                    _json_response(self, HTTPStatus.NOT_FOUND, {"error": "group not found"})
                    return
                detail = serialize_group_detail(group, account_id)
                if not any(member["accountId"] == account_id for member in detail["members"]):
                    _json_response(self, HTTPStatus.FORBIDDEN, {"error": "requester is not a member of this group"})
                    return
                mark_group_seen(account_id, group_id)
                _json_response(self, HTTPStatus.OK, detail)
                return

        if segments[:2] == ["mock", "competitions"]:
            if len(segments) == 2:
                competitions = [source.to_dict() for source in list_competition_sources()]
                _json_response(self, HTTPStatus.OK, {"competitions": competitions})
                return

            code = segments[2]
            source = get_competition_source(code)
            if source is None:
                _json_response(self, HTTPStatus.NOT_FOUND, {"error": "competicion no soportada"})
                return
            snapshot = get_snapshot(code)

            if len(segments) == 3:
                snapshot_payload = None
                if snapshot:
                    snapshot_payload = {
                        **snapshot.to_dict(),
                        "matches": [_serialize_match(match) for match in snapshot.matches],
                    }
                _json_response(self, HTTPStatus.OK, {"source": source.to_dict(), "snapshot": snapshot_payload})
                return

            if len(segments) == 4 and segments[3] == "matches":
                _json_response(
                    self,
                    HTTPStatus.OK,
                    {
                        "source": source.to_dict(),
                        "teams": [team.to_dict() for team in snapshot.teams] if snapshot else [],
                        "matches": [_serialize_match(match) for match in snapshot.matches] if snapshot else [],
                    },
                )
                return

        if segments == ["bets", "mine"]:
            account_id = self._require_session()
            if account_id is None:
                return
            _json_response(self, HTTPStatus.OK, {"bets": list_placed_bets(account_id)})
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

        segments = _split_path(self.path)

        if segments == ["account", "me", "milestones", "ack"]:
            account_id = self._require_session()
            if account_id is None:
                return
            ack_elo_milestones(account_id)
            _json_response(self, HTTPStatus.OK, {"ok": True})
            return

        if segments == ["social", "friends"]:
            account_id = self._require_session()
            if account_id is None:
                return
            payload = _read_json(self)
            try:
                send_friend_request(account_id, str(payload.get("identifier", "")))
            except ValueError as exc:
                _json_response(self, HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                return
            except ConflictError as exc:
                _json_response(self, HTTPStatus.CONFLICT, {"error": str(exc)})
                return
            except LookupError as exc:
                _json_response(self, HTTPStatus.NOT_FOUND, {"error": str(exc)})
                return
            _json_response(self, HTTPStatus.OK, friend_state(account_id))
            return

        if segments[:3] == ["social", "friends", "requests"] and len(segments) == 5 and segments[4] in ("accept", "reject"):
            account_id = self._require_session()
            if account_id is None:
                return
            request_id = segments[3]
            try:
                respond_friend_request(account_id, request_id, accept=segments[4] == "accept")
            except PermissionError as exc:
                _json_response(self, HTTPStatus.FORBIDDEN, {"error": str(exc)})
                return
            except ConflictError as exc:
                _json_response(self, HTTPStatus.CONFLICT, {"error": str(exc)})
                return
            except LookupError as exc:
                _json_response(self, HTTPStatus.NOT_FOUND, {"error": str(exc)})
                return
            _json_response(self, HTTPStatus.OK, friend_state(account_id))
            return

        if segments == ["social", "groups"]:
            account_id = self._require_session()
            if account_id is None:
                return
            payload = _read_json(self)
            try:
                group = create_group(account_id, str(payload.get("name", "")))
            except ValueError as exc:
                _json_response(self, HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                return
            _json_response(self, HTTPStatus.CREATED, serialize_group_detail(group, account_id))
            return

        if segments[:2] == ["social", "groups"] and len(segments) == 4 and segments[3] == "members":
            account_id = self._require_session()
            if account_id is None:
                return
            group_id = segments[2]
            payload = _read_json(self)
            try:
                group = invite_member(group_id, account_id, str(payload.get("friendAccountId", "")))
            except ValueError as exc:
                _json_response(self, HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                return
            except PermissionError as exc:
                _json_response(self, HTTPStatus.FORBIDDEN, {"error": str(exc)})
                return
            except ConflictError as exc:
                _json_response(self, HTTPStatus.CONFLICT, {"error": str(exc)})
                return
            except LookupError as exc:
                _json_response(self, HTTPStatus.NOT_FOUND, {"error": str(exc)})
                return
            _json_response(self, HTTPStatus.OK, serialize_group_detail(group, account_id))
            return

        if segments[:3] == ["social", "groups", "invites"] and len(segments) == 5 and segments[4] in ("accept", "reject"):
            account_id = self._require_session()
            if account_id is None:
                return
            invite_id = segments[3]
            accept = segments[4] == "accept"
            try:
                invite = respond_group_invite(account_id, invite_id, accept=accept)
            except PermissionError as exc:
                _json_response(self, HTTPStatus.FORBIDDEN, {"error": str(exc)})
                return
            except ConflictError as exc:
                _json_response(self, HTTPStatus.CONFLICT, {"error": str(exc)})
                return
            except LookupError as exc:
                _json_response(self, HTTPStatus.NOT_FOUND, {"error": str(exc)})
                return
            if not accept:
                _json_response(self, HTTPStatus.OK, {"ok": True})
                return
            group = get_group(invite.group_id)
            _json_response(self, HTTPStatus.OK, serialize_group_detail(group, account_id))
            return

        if segments[:2] == ["social", "groups"] and len(segments) == 4 and segments[3] == "predictions":
            account_id = self._require_session()
            if account_id is None:
                return
            group_id = segments[2]
            payload = _read_json(self)
            options = payload.get("options", [])
            try:
                add_prediction(
                    group_id,
                    account_id,
                    str(payload.get("question", "")),
                    [str(option) for option in options] if isinstance(options, list) else [],
                    str(payload.get("closesAt", "")),
                )
            except ValueError as exc:
                _json_response(self, HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                return
            except PermissionError as exc:
                _json_response(self, HTTPStatus.FORBIDDEN, {"error": str(exc)})
                return
            except LookupError as exc:
                _json_response(self, HTTPStatus.NOT_FOUND, {"error": str(exc)})
                return
            group = get_group(group_id)
            _json_response(self, HTTPStatus.CREATED, serialize_group_detail(group, account_id))
            return

        if segments[:2] == ["social", "groups"] and len(segments) == 6 and segments[3] == "predictions" and segments[5] == "votes":
            account_id = self._require_session()
            if account_id is None:
                return
            group_id = segments[2]
            prediction_id = segments[4]
            payload = _read_json(self)
            try:
                cast_vote(group_id, prediction_id, account_id, str(payload.get("option", "")))
            except ValueError as exc:
                _json_response(self, HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                return
            except PermissionError as exc:
                _json_response(self, HTTPStatus.FORBIDDEN, {"error": str(exc)})
                return
            except ConflictError as exc:
                _json_response(self, HTTPStatus.CONFLICT, {"error": str(exc)})
                return
            except LookupError as exc:
                _json_response(self, HTTPStatus.NOT_FOUND, {"error": str(exc)})
                return
            group = get_group(group_id)
            _json_response(self, HTTPStatus.OK, serialize_group_detail(group, account_id))
            return

        if (
            segments[:2] == ["social", "groups"]
            and len(segments) == 6
            and segments[3] == "predictions"
            and segments[5] in ("resolve", "abort")
        ):
            account_id = self._require_session()
            if account_id is None:
                return
            group_id = segments[2]
            prediction_id = segments[4]
            payload = _read_json(self)
            try:
                if segments[5] == "resolve":
                    resolve_prediction(group_id, prediction_id, account_id, str(payload.get("option", "")))
                else:
                    abort_prediction(group_id, prediction_id, account_id)
            except ValueError as exc:
                _json_response(self, HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                return
            except PermissionError as exc:
                _json_response(self, HTTPStatus.FORBIDDEN, {"error": str(exc)})
                return
            except ConflictError as exc:
                _json_response(self, HTTPStatus.CONFLICT, {"error": str(exc)})
                return
            except LookupError as exc:
                _json_response(self, HTTPStatus.NOT_FOUND, {"error": str(exc)})
                return
            group = get_group(group_id)
            _json_response(self, HTTPStatus.OK, serialize_group_detail(group, account_id))
            return

        if segments[:2] == ["mock", "competitions"] and len(segments) == 4 and segments[3] == "sync":
            code = segments[2]
            try:
                result = sync_competition(code)
            except LookupError as exc:
                _json_response(self, HTTPStatus.NOT_FOUND, {"error": str(exc)})
                return

            synced_snapshot = result.get("snapshot")
            snapshot_payload = None
            if synced_snapshot:
                snapshot_payload = {
                    **synced_snapshot.to_dict(),
                    "matches": [_serialize_match(match) for match in synced_snapshot.matches],
                }
            payload: dict[str, Any] = {
                "ok": result["ok"],
                "source": result["source"].to_dict() if result.get("source") else None,
                "snapshot": snapshot_payload,
            }
            if not result["ok"]:
                payload["error"] = result["error"]
            # A failed external sync is an expected, handled outcome (fallback to last snapshot),
            # not a server error, so it is still reported with 200 and an "ok" flag in the body.
            _json_response(self, HTTPStatus.OK, payload)
            return

        if segments == ["bets", "place"]:
            account_id = self._require_session()
            if account_id is None:
                return
            payload = _read_json(self)
            selections = payload.get("selections", [])
            try:
                placed_bets = place_bet(
                    account_id,
                    str(payload.get("betType", "")),
                    selections if isinstance(selections, list) else [],
                    payload.get("stake"),
                )
            except ValueError as exc:
                _json_response(self, HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                return
            except ConflictError as exc:
                _json_response(self, HTTPStatus.CONFLICT, {"error": str(exc)})
                return
            except LookupError as exc:
                _json_response(self, HTTPStatus.NOT_FOUND, {"error": str(exc)})
                return
            _json_response(self, HTTPStatus.CREATED, {"placedBets": placed_bets})
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
            server_profile = account.profile
            new_profile = _coerce_profile(payload["profile"])
            # elo, beths, and the other economy fields are server-computed only (FR-014):
            # whatever the client sends for them is ignored, the previously persisted
            # values always win.
            new_profile.elo = server_profile.elo
            new_profile.beths = server_profile.beths
            new_profile.beths_last_grant_at = server_profile.beths_last_grant_at
            new_profile.highest_elo_milestone = server_profile.highest_elo_milestone
            new_profile.elo_bets_settled = server_profile.elo_bets_settled
            new_profile.elo_bets_counted_today = server_profile.elo_bets_counted_today
            new_profile.elo_bets_counted_date = server_profile.elo_bets_counted_date
            account.profile = new_profile
        if "bets" in payload and isinstance(payload["bets"], list):
            account.bets = _coerce_bets(payload["bets"])

        updated = replace_account_state(account.id, profile=account.profile, bets=account.bets)
        _json_response(self, HTTPStatus.OK, _serialize_account(updated))

    def do_DELETE(self) -> None:  # noqa: N802
        segments = _split_path(self.path)
        account_id = self._require_session()
        if account_id is None:
            return

        if segments[:2] == ["social", "friends"] and len(segments) == 3:
            friend_account_id = segments[2]
            try:
                remove_friend(account_id, friend_account_id)
            except LookupError as exc:
                _json_response(self, HTTPStatus.NOT_FOUND, {"error": str(exc)})
                return
            _json_response(self, HTTPStatus.OK, friend_state(account_id))
            return

        _json_response(self, HTTPStatus.NOT_FOUND, {"error": "not found"})


def create_app(host: str = "127.0.0.1", port: int = 8000) -> ThreadingHTTPServer:
    initialize_repository()
    initialize_mock_dataset_repository()
    initialize_social_repository()
    initialize_bet_repository()
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
