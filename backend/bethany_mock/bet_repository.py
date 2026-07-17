from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from . import elo
from .account_repository import get_account_by_id, save_account_state
from .database import dumps, get_connection, initialize_database, loads
from .match_results import generate_match_result
from .mock_dataset_repository import find_match_by_id
from .models import MockMatch, PlacedBet, PlacedBetSelection
from .odds import generate_match_odds, is_open_for_betting
from .social_repository import ConflictError, award_elo_milestone

OUTCOMES = {"local", "empate", "visitante"}
SETTLEMENT_DELAY_MINUTES = 90


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_timestamp(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _debit_beths(account_id: str, amount: float) -> None:
    account = get_account_by_id(account_id)
    if account is None:
        raise LookupError("account not found")
    # beths is a whole-number game currency; stakes (inherited from 005-combinada) may carry
    # decimals, so the debited/credited amount is rounded to the nearest beth at this boundary.
    rounded_amount = round(amount)
    if account.profile.beths < rounded_amount:
        raise ValueError("insufficient beths balance")
    account.profile.beths -= rounded_amount
    save_account_state(account)


def _credit_beths(account_id: str, amount: float) -> None:
    account = get_account_by_id(account_id)
    if account is None:
        return
    account.profile.beths += round(amount)
    save_account_state(account)


def _apply_elo_for_settlement(account_id: str, combined_odds: float, stake: float, won: bool) -> None:
    """Move `account_id`'s Elo from one settled bet's outcome (cuota=difficulty,
    stake=confidence, won=result), unless today's daily Elo-counted cap is already
    spent (see specs/006-elo/research.md Decision 2-bis) — the bet's Beths payout still
    applies either way, only the Elo effect is capped.
    """
    account = get_account_by_id(account_id)
    if account is None:
        return
    profile = account.profile
    today = datetime.now(timezone.utc).date().isoformat()
    if profile.elo_bets_counted_date != today:
        profile.elo_bets_counted_date = today
        profile.elo_bets_counted_today = 0
    if profile.elo_bets_counted_today >= elo.DAILY_ELO_COUNTED_BETS:
        return

    capped_stake = min(stake, elo.MAX_ELO_STAKE)
    result = 1.0 if won else 0.0
    new_elo, _delta = elo.update_elo_from_bet(profile.elo, combined_odds, result, profile.elo_bets_settled, capped_stake)

    if profile.highest_elo_milestone < 0:
        profile.highest_elo_milestone = elo.milestone_tier(profile.elo)

    profile.elo = new_elo
    profile.elo_bets_settled += 1
    profile.elo_bets_counted_today += 1

    new_tier = elo.milestone_tier(new_elo)
    tier = profile.highest_elo_milestone + elo.ELO_TIER_SIZE
    while tier <= new_tier:
        profile.beths += elo.BETHS_PER_ELO_TIER
        award_elo_milestone(account.id, tier, elo.BETHS_PER_ELO_TIER)
        tier += elo.ELO_TIER_SIZE
    profile.highest_elo_milestone = max(profile.highest_elo_milestone, new_tier)

    save_account_state(account)


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
    if stake > elo.MAX_ELO_STAKE:
        raise ValueError(f"stake cannot exceed {elo.MAX_ELO_STAKE} beths")
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
        "settledAt": bet.settled_at,
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
        _debit_beths(account_id, shared_stake)
        bet = _persist(account_id, "combinada", shared_stake, combined_odds, placed_selections)
        return [serialize_placed_bet(bet)]

    # simple: one independent PlacedBet per selection, each with its own stake.
    # The total debit is checked and applied once, before any selection is persisted, so a
    # multi-selection "simple" batch can never leave the account partially charged.
    selection_stakes = [
        _coerce_stake(selections_payload[index].get("stake", stake)) for index in range(len(resolved))
    ]
    _debit_beths(account_id, sum(selection_stakes))

    placed: list[dict[str, Any]] = []
    for index, (match, outcome, odds, label) in enumerate(resolved):
        selection = PlacedBetSelection(match_id=match.id, match_label=label, outcome=outcome, odds=odds)
        bet = _persist(account_id, "simple", selection_stakes[index], odds, [selection])
        placed.append(serialize_placed_bet(bet))
    return placed


def _settle_due_bets(account_id: str) -> None:
    """Lazily settle every pending bet of this account whose match is old enough to be
    considered finished (`created_at + SETTLEMENT_DELAY_MINUTES`), against a deterministic
    simulated result — no real match result exists anywhere in this prototype (see
    `specs/006-elo/research.md` Decisions 8 and 9).
    """
    now = datetime.now(timezone.utc)
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM placed_bets WHERE account_id = ? AND status = 'realizada'",
            (account_id,),
        ).fetchall()

    for row in rows:
        if now < _parse_timestamp(row["created_at"]) + timedelta(minutes=SETTLEMENT_DELAY_MINUTES):
            continue

        selections = loads(row["selections_json"])
        won = all(generate_match_result(selection["match_id"]) == selection["outcome"] for selection in selections)
        settled_at = now.isoformat()
        new_status = "ganada" if won else "perdida"

        with get_connection() as connection:
            connection.execute(
                "UPDATE placed_bets SET status = ?, settled_at = ? WHERE id = ?",
                (new_status, settled_at, row["id"]),
            )
            connection.commit()

        if won:
            _credit_beths(account_id, row["potential_winnings"])
        _apply_elo_for_settlement(account_id, row["combined_odds"], row["stake"], won)


def list_placed_bets(account_id: str) -> list[dict[str, Any]]:
    initialize_repository()
    _settle_due_bets(account_id)
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
            status=row["status"],
            settled_at=row["settled_at"],
        )
        bets.append(serialize_placed_bet(bet))
    return bets
