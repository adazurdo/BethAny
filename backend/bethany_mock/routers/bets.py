from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends

from ..bet_repository import list_placed_bets, place_bet
from ..session import require_session, require_verified_session

router = APIRouter()


@router.get("/bets/mine")
def get_my_bets(account_id: str = Depends(require_session)) -> dict[str, Any]:
    return {"bets": list_placed_bets(account_id)}


@router.post("/bets/place", status_code=201)
def place_bet_route(
    payload: dict[str, Any] = Body(default={}),
    account_id: str = Depends(require_verified_session),
) -> dict[str, Any]:
    selections = payload.get("selections", [])
    placed_bets = place_bet(
        account_id,
        str(payload.get("betType", "")),
        selections if isinstance(selections, list) else [],
        payload.get("stake"),
    )
    return {"placedBets": placed_bets}
