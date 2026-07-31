from __future__ import annotations

from datetime import datetime, timezone

from .database import get_connection, initialize_database
from .football_data_client import FootballDataError, fetch_match as fetch_football_match
from .pandascore_client import PandaScoreError, fetch_match as fetch_esports_match

OUTCOMES = ("local", "empate", "visitante")

# football-data.org statuses that mean the match has a final result. AWARDED covers matches
# decided off the pitch (e.g. forfeit) but still carrying a winner in `score.winner`.
FOOTBALL_FINISHED_STATUSES = {"FINISHED", "AWARDED"}
FOOTBALL_WINNER_TO_OUTCOME = {"HOME_TEAM": "local", "AWAY_TEAM": "visitante", "DRAW": "empate"}

ESPORTS_FINISHED_STATUSES = {"finished"}


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def _cached_outcome(match_id: str) -> str | None:
    initialize_database()
    with get_connection() as connection:
        row = connection.execute(
            "SELECT outcome FROM match_results WHERE match_id = ?", (match_id,)
        ).fetchone()
    return row["outcome"] if row else None


def _cache_outcome(match_id: str, outcome: str) -> None:
    with get_connection() as connection:
        connection.execute(
            "INSERT INTO match_results (match_id, outcome, resolved_at) VALUES (?, ?, ?) "
            "ON CONFLICT(match_id) DO NOTHING",
            (match_id, outcome, _utcnow()),
        )
        connection.commit()


def _resolve_football_result(match_id: str) -> str | None:
    numeric_id = match_id.removeprefix("match-")
    try:
        payload = fetch_football_match(numeric_id)
    except FootballDataError:
        return None
    if str(payload.get("status", "")).upper() not in FOOTBALL_FINISHED_STATUSES:
        return None
    winner = str((payload.get("score") or {}).get("winner") or "").upper()
    return FOOTBALL_WINNER_TO_OUTCOME.get(winner)


def _resolve_esports_result(match_id: str) -> str | None:
    numeric_id = match_id.removeprefix("esports-match-")
    try:
        payload = fetch_esports_match(numeric_id)
    except PandaScoreError:
        return None
    if str(payload.get("status", "")).lower() not in ESPORTS_FINISHED_STATUSES:
        return None
    winner_id = payload.get("winner_id")
    if winner_id is None:
        return None
    opponents = payload.get("opponents") or []
    if not opponents or not isinstance(opponents[0], dict):
        return None
    home = opponents[0].get("opponent")
    if not isinstance(home, dict) or home.get("id") is None:
        return None
    return "local" if home["id"] == winner_id else "visitante"


def resolve_match_result(match_id: str) -> str | None:
    """The real, final outcome of `match_id` ("local"|"empate"|"visitante"), fetched from the
    same provider (football-data.org or PandaScore) the match itself came from - or `None`
    if the match hasn't finished yet, or its result couldn't be determined (provider error,
    missing API token, unrecognized match id).

    A resolved result is cached in `match_results` and never refetched afterwards (a finished
    match's outcome never changes), so repeatedly checking a still-pending bet against its
    match doesn't hit the provider API more than once per match.
    """
    cached = _cached_outcome(match_id)
    if cached is not None:
        return cached

    if match_id.startswith("esports-match-"):
        outcome = _resolve_esports_result(match_id)
    elif match_id.startswith("match-"):
        outcome = _resolve_football_result(match_id)
    else:
        return None

    if outcome is not None:
        _cache_outcome(match_id, outcome)
    return outcome
