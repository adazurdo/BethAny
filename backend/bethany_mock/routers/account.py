from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends, Header, HTTPException

from ..account_repository import delete_own_account, get_account_by_id, replace_account_state
from ..models import AccountProfile, BetRecord
from ..profile import build_account_profile
from ..session import SESSIONS, _serialize_account, extract_bearer_token, require_session
from ..social_repository import ack_elo_milestones

router = APIRouter()


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


def _get_account_or_404(account_id: str, authorization: str | None):
    account = get_account_by_id(account_id)
    if account is None:
        token = extract_bearer_token(authorization)
        if token:
            SESSIONS.pop(token, None)
        raise HTTPException(status_code=404, detail="account not found")
    return account


@router.get("/account/me")
def get_me(
    account_id: str = Depends(require_session),
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    account = _get_account_or_404(account_id, authorization)
    return _serialize_account(account)


@router.put("/account/me")
def update_me(
    payload: dict[str, Any] = Body(default={}),
    account_id: str = Depends(require_session),
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    account = _get_account_or_404(account_id, authorization)

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
    return _serialize_account(updated)


@router.delete("/account/me")
def delete_me(
    payload: dict[str, Any] = Body(default={}),
    account_id: str = Depends(require_session),
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    try:
        delete_own_account(account_id, str(payload.get("password", "")))
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    token = extract_bearer_token(authorization)
    if token:
        SESSIONS.pop(token, None)
    return {"ok": True}


@router.post("/account/me/milestones/ack")
def ack_milestones(account_id: str = Depends(require_session)) -> dict[str, Any]:
    ack_elo_milestones(account_id)
    return {"ok": True}


@router.get("/accounts/{target_account_id}/profile")
def get_profile(
    target_account_id: str,
    account_id: str = Depends(require_session),
) -> dict[str, Any]:
    profile = build_account_profile(account_id, target_account_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="account not found")
    return profile
