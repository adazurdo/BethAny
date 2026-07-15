from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from .database import dumps, get_connection, initialize_database, loads
from .mock_dataset_repository import find_match_by_id
from .models import MockMatch, PlacedBet, PlacedBetSelection
from .odds import generate_match_odds, is_open_for_betting
from .social_repository import ConflictError

OUTCOMES = {"local", "empate", "visitante"}


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def initialize_repository() -> None:
    initialize_database()


def _match_label(match: MockMatch) -> str:
    return f"{match.home_team_name} vs {match.away_team_name}"


def _coerce_stake(value: Any) -> float:
    try:
        stake = float(value)
    except (TypeError, ValueError):
        raise ValueError("stake must be a number") from None
    if stake <= 0:
        raise ValueError("stake must be greater than zero")
    return round(stake, 2)


def _resolve_selection(raw: dict[str, Any]) -> tuple[MockMatch, str, float, str]:
    match_id = str(raw.get("matchId", "") or "")
    outcome = str(raw.get("outcome", "") or "")
    if not match_id or outcome not in OUTCOMES:
        raise ValueError("each selection needs a valid matchId and outcome")

    found = find_match_by_id(match_id)
    if found is None:
        raise LookupError(f"match not found: {match_id}")
    _source, match = found

    if not is_open_for_betting(match.status):
        raise ConflictError(f"match is no longer open for betting: {match_id}")

    odds = generate_match_odds(match_id)
    outcome_odds = {
        "local": odds.home_odds,
        "empate": odds.draw_odds,
        "visitante": odds.away_odds,
    }[outcome]
    return match, outcome, outcome_odds, _match_label(match)


def _serialize_selection(selection: PlacedBetSelection) -> dict[str, Any]:
    return {
        "matchId": selection.match_id,
        "matchLabel": selection.match_label,
        "outcome": selection.outcome,
        "odds": selection.odds,
    }


def serialize_placed_bet(bet: PlacedBet) -> dict[str, Any]:
    return {
        "id": bet.id,
        "betType": bet.bet_type,
        "stake": bet.stake,
        "combinedOdds": bet.combined_odds,
        "potentialWinnings": bet.potential_winnings,
        "status": bet.status,
        "createdAt": bet.created_at,
        "selections": [_serialize_selection(selection) for selection in bet.selections],
    }


def _persist(
    account_id: str,
    bet_type: str,
    stake: float,
    combined_odds: float,
    selections: list[PlacedBetSelection],
) -> PlacedBet:
    bet = PlacedBet(
        id=_new_id("bet"),
        account_id=account_id,
        bet_type=bet_type,
        stake=stake,
        combined_odds=round(combined_odds, 2),
        potential_winnings=round(stake * combined_odds, 2),
        created_at=_utcnow(),
        selections=selections,
    )
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO placed_bets (id, account_id, bet_type, stake, combined_odds, potential_winnings, selections_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                bet.id,
                bet.account_id,
                bet.bet_type,
                bet.stake,
                bet.combined_odds,
                bet.potential_winnings,
                dumps([selection.to_dict() for selection in bet.selections]),
                bet.created_at,
            ),
        )
        connection.commit()
    return bet


def place_bet(
    account_id: str,
    bet_type: str,
    selections_payload: list[dict[str, Any]],
    stake: Any = None,
) -> list[dict[str, Any]]:
    """Validate and persist a bet placement request.

    Every selection's odds and open-for-betting status are recomputed here from
    the match's current data, never trusted from the client (`research.md`
    Decision 5). Returns the newly created `PlacedBet`s, serialized for the API.
    """
    initialize_repository()
    if bet_type not in ("simple", "combinada"):
        raise ValueError("betType must be 'simple' or 'combinada'")
    if not isinstance(selections_payload, list) or not selections_payload:
        raise ValueError("at least one selection is required")

    resolved = [_resolve_selection(raw) for raw in selections_payload]

    match_ids = [match.id for match, _outcome, _odds, _label in resolved]
    if len(set(match_ids)) != len(match_ids):
        raise ValueError("a bet cannot include two selections of the same match")

    if bet_type == "combinada":
        if len(resolved) < 2:
            raise ValueError("a combinada requires at least two selections from different matches")
        shared_stake = _coerce_stake(stake)
        # Combined odds are the sum of every leg's odds (not the product), per product decision.
        combined_odds = 0.0
        placed_selections: list[PlacedBetSelection] = []
        for match, outcome, odds, label in resolved:
            combined_odds += odds
            placed_selections.append(
                PlacedBetSelection(match_id=match.id, match_label=label, outcome=outcome, odds=odds)
            )
        bet = _persist(account_id, "combinada", shared_stake, combined_odds, placed_selections)
        return [serialize_placed_bet(bet)]

    # simple: one independent PlacedBet per selection, each with its own stake
    placed: list[dict[str, Any]] = []
    for index, (match, outcome, odds, label) in enumerate(resolved):
        raw_stake = selections_payload[index].get("stake", stake)
        selection_stake = _coerce_stake(raw_stake)
        selection = PlacedBetSelection(match_id=match.id, match_label=label, outcome=outcome, odds=odds)
        bet = _persist(account_id, "simple", selection_stake, odds, [selection])
        placed.append(serialize_placed_bet(bet))
    return placed


def list_placed_bets(account_id: str) -> list[dict[str, Any]]:
    initialize_repository()
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM placed_bets WHERE account_id = ? ORDER BY created_at DESC",
            (account_id,),
        ).fetchall()

    bets: list[dict[str, Any]] = []
    for row in rows:
        selections = [PlacedBetSelection(**selection) for selection in loads(row["selections_json"])]
        bet = PlacedBet(
            id=row["id"],
            account_id=row["account_id"],
            bet_type=row["bet_type"],
            stake=row["stake"],
            combined_odds=row["combined_odds"],
            potential_winnings=row["potential_winnings"],
            created_at=row["created_at"],
            selections=selections,
        )
        bets.append(serialize_placed_bet(bet))
    return bets
