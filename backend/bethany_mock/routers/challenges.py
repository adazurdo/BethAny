from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends

from ..challenge_repository import (
    cancel_challenge,
    create_custom_challenge,
    create_match_challenge,
    list_challenges_for_account,
    resolve_custom_challenge,
    respond_challenge,
)
from ..session import require_session, require_verified_session

router = APIRouter()


@router.get("/challenges/mine")
def get_my_challenges(account_id: str = Depends(require_session)) -> dict[str, Any]:
    return list_challenges_for_account(account_id)


@router.post("/challenges", status_code=201)
def create_challenge(
    payload: dict[str, Any] = Body(default={}),
    account_id: str = Depends(require_verified_session),
) -> dict[str, Any]:
    challenge_type = str(payload.get("challengeType", "match"))
    if challenge_type == "custom":
        options = payload.get("options", [])
        return create_custom_challenge(
            account_id,
            str(payload.get("opponentAccountId", "")),
            str(payload.get("title", "")),
            [str(option) for option in options] if isinstance(options, list) else [],
            str(payload.get("outcome", "")),
        )
    return create_match_challenge(
        account_id,
        str(payload.get("opponentAccountId", "")),
        str(payload.get("matchId", "")),
        str(payload.get("outcome", "")),
    )


@router.post("/challenges/{challenge_id}/accept")
def accept_challenge(challenge_id: str, account_id: str = Depends(require_verified_session)) -> dict[str, Any]:
    return respond_challenge(account_id, challenge_id, accept=True)


@router.post("/challenges/{challenge_id}/decline")
def decline_challenge(challenge_id: str, account_id: str = Depends(require_session)) -> dict[str, Any]:
    return respond_challenge(account_id, challenge_id, accept=False)


@router.post("/challenges/{challenge_id}/cancel")
def cancel_challenge_route(challenge_id: str, account_id: str = Depends(require_session)) -> dict[str, Any]:
    return cancel_challenge(account_id, challenge_id)


@router.post("/challenges/{challenge_id}/resolve")
def resolve_challenge_route(
    challenge_id: str,
    payload: dict[str, Any] = Body(default={}),
    account_id: str = Depends(require_session),
) -> dict[str, Any]:
    return resolve_custom_challenge(account_id, challenge_id, str(payload.get("result", "")))
