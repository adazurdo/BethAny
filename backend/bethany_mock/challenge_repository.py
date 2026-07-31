from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from .account_repository import get_account_by_id
from .bet_repository import OUTCOMES, SETTLEMENT_DELAY_MINUTES
from .database import dumps, get_connection, initialize_database, loads
from .match_results import generate_match_result
from .mock_dataset_repository import find_match_by_id
from .models import FriendChallenge, MockMatch
from .odds import can_draw, is_open_for_betting
from .social_repository import ConflictError, is_friend


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_timestamp(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _match_kickoff(match_id: str) -> datetime | None:
    """The real scheduled kickoff of `match_id`, if the source provided one and the match is
    still present in its competition's current snapshot (it drops out once actually played)."""
    found = find_match_by_id(match_id)
    if found is None:
        return None
    _source, match = found
    if not match.kickoff_at:
        return None
    try:
        return _parse_timestamp(match.kickoff_at)
    except ValueError:
        return None


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def initialize_repository() -> None:
    initialize_database()


def _match_label(match: MockMatch) -> str:
    return f"{match.home_team_name} vs {match.away_team_name}"


def _row_to_challenge(row) -> FriendChallenge:
    return FriendChallenge(
        id=row["id"],
        challenger_account_id=row["challenger_account_id"],
        opponent_account_id=row["opponent_account_id"],
        match_id=row["match_id"],
        match_label=row["match_label"],
        outcome=row["outcome"],
        status=row["status"],
        created_at=row["created_at"],
        responded_at=row["responded_at"],
        settled_at=row["settled_at"],
        result=row["result"],
        winner_account_id=row["winner_account_id"],
        challenge_type=row["challenge_type"],
        title=row["title"],
        options=loads(row["options_json"]) if row["options_json"] else [],
    )


def _serialize_challenge(challenge: FriendChallenge) -> dict[str, Any]:
    challenger = get_account_by_id(challenge.challenger_account_id)
    opponent = get_account_by_id(challenge.opponent_account_id)
    return {
        "id": challenge.id,
        "challengerAccountId": challenge.challenger_account_id,
        "challengerDisplayName": challenger.profile.display_name if challenger else "",
        "opponentAccountId": challenge.opponent_account_id,
        "opponentDisplayName": opponent.profile.display_name if opponent else "",
        "challengeType": challenge.challenge_type,
        "matchId": challenge.match_id or None,
        "matchLabel": challenge.match_label or None,
        "title": challenge.title,
        "options": challenge.options,
        "outcome": challenge.outcome,
        "status": challenge.status,
        "createdAt": challenge.created_at,
        "respondedAt": challenge.responded_at,
        "settledAt": challenge.settled_at,
        "result": challenge.result,
        "winnerAccountId": challenge.winner_account_id,
    }


def _get_challenge(challenge_id: str) -> FriendChallenge | None:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM friend_challenges WHERE id = ?", (challenge_id,)
        ).fetchone()
    return _row_to_challenge(row) if row else None


def _validate_common(challenger_account_id: str, opponent_account_id: str) -> None:
    if not opponent_account_id:
        raise ValueError("opponentAccountId is required")
    if opponent_account_id == challenger_account_id:
        raise ValueError("cannot challenge yourself")
    if not is_friend(challenger_account_id, opponent_account_id):
        raise PermissionError("you can only challenge an accepted friend")


def _persist_challenge(challenge: FriendChallenge) -> None:
    # `stake` is a leftover NOT NULL column from before challenges dropped Beths staking
    # entirely (see the "no currency" product decision) — always written as 0 and never
    # read back into `FriendChallenge`, so it can't resurface anywhere in the API.
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO friend_challenges
                (id, challenger_account_id, opponent_account_id, challenge_type, match_id, match_label,
                 title, options_json, outcome, stake, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending', ?)
            """,
            (
                challenge.id,
                challenge.challenger_account_id,
                challenge.opponent_account_id,
                challenge.challenge_type,
                challenge.match_id,
                challenge.match_label,
                challenge.title,
                dumps(challenge.options),
                challenge.outcome,
                challenge.created_at,
            ),
        )
        connection.commit()


def create_match_challenge(
    challenger_account_id: str,
    opponent_account_id: str,
    match_id: str,
    outcome: str,
) -> dict[str, Any]:
    """A challenge tied to an official mock match, resolved automatically once its
    match is old enough to be considered finished — see `_settle_due_challenges`.
    Purely a bragging-rights head-to-head record (see `head_to_head_counts`); no
    currency changes hands."""
    initialize_repository()
    _validate_common(challenger_account_id, opponent_account_id)
    if outcome not in OUTCOMES:
        raise ValueError("outcome must be one of: local, empate, visitante")

    found = find_match_by_id(match_id)
    if found is None:
        raise LookupError(f"match not found: {match_id}")
    _source, match = found
    if not is_open_for_betting(match.status):
        raise ConflictError(f"match is no longer open for betting: {match_id}")
    if outcome == "empate" and not can_draw(match_id):
        raise ValueError(f"this match cannot end in a draw: {match_id}")

    challenge = FriendChallenge(
        id=_new_id("challenge"),
        challenger_account_id=challenger_account_id,
        opponent_account_id=opponent_account_id,
        match_id=match.id,
        match_label=_match_label(match),
        outcome=outcome,
        created_at=_utcnow(),
        challenge_type="match",
    )
    _persist_challenge(challenge)
    return _serialize_challenge(challenge)


def create_custom_challenge(
    challenger_account_id: str,
    opponent_account_id: str,
    title: str,
    options: list[str],
    outcome: str,
) -> dict[str, Any]:
    """A free-form challenge with no official data source behind it — the challenger
    sets the title and every possible option, picks the one they think will happen, and
    either participant later reports the real outcome via `resolve_custom_challenge`
    (no automatic settlement is possible without a match to check against). Purely a
    bragging-rights head-to-head record; no currency changes hands."""
    initialize_repository()
    _validate_common(challenger_account_id, opponent_account_id)

    cleaned_title = title.strip()
    cleaned_options = [option.strip() for option in options if option.strip()]
    if not cleaned_title:
        raise ValueError("title is required")
    if len(cleaned_options) < 2:
        raise ValueError("at least two options are required")
    if len(set(cleaned_options)) != len(cleaned_options):
        raise ValueError("options must be unique")
    if outcome not in cleaned_options:
        raise ValueError("outcome must be one of the provided options")

    challenge = FriendChallenge(
        id=_new_id("challenge"),
        challenger_account_id=challenger_account_id,
        opponent_account_id=opponent_account_id,
        match_id="",
        match_label="",
        outcome=outcome,
        created_at=_utcnow(),
        challenge_type="custom",
        title=cleaned_title,
        options=cleaned_options,
    )
    _persist_challenge(challenge)
    return _serialize_challenge(challenge)


def respond_challenge(account_id: str, challenge_id: str, accept: bool) -> dict[str, Any]:
    initialize_repository()
    challenge = _get_challenge(challenge_id)
    if challenge is None:
        raise LookupError("challenge not found")
    if challenge.opponent_account_id != account_id:
        raise PermissionError("this challenge is not addressed to you")
    if challenge.status != "pending":
        raise ConflictError("this challenge is no longer pending")

    new_status = "accepted" if accept else "declined"
    responded_at = _utcnow()
    with get_connection() as connection:
        connection.execute(
            "UPDATE friend_challenges SET status = ?, responded_at = ? WHERE id = ?",
            (new_status, responded_at, challenge.id),
        )
        connection.commit()

    challenge.status = new_status
    challenge.responded_at = responded_at
    return _serialize_challenge(challenge)


def cancel_challenge(account_id: str, challenge_id: str) -> dict[str, Any]:
    initialize_repository()
    challenge = _get_challenge(challenge_id)
    if challenge is None:
        raise LookupError("challenge not found")
    if challenge.challenger_account_id != account_id:
        raise PermissionError("only the account that created this challenge can cancel it")
    if challenge.status != "pending":
        raise ConflictError("this challenge is no longer pending")

    responded_at = _utcnow()
    with get_connection() as connection:
        connection.execute(
            "UPDATE friend_challenges SET status = 'cancelled', responded_at = ? WHERE id = ?",
            (responded_at, challenge.id),
        )
        connection.commit()

    challenge.status = "cancelled"
    challenge.responded_at = responded_at
    return _serialize_challenge(challenge)


def resolve_custom_challenge(account_id: str, challenge_id: str, result_option: str) -> dict[str, Any]:
    """Either participant can report the real-world outcome of a custom challenge — unlike
    a match challenge there is no official data source to check it against automatically,
    so this is an honor-system report between two friends (consistent with the deferred
    security scope of this mock stage; see specs/007-retos-entre-amigos)."""
    initialize_repository()
    challenge = _get_challenge(challenge_id)
    if challenge is None:
        raise LookupError("challenge not found")
    if challenge.challenge_type != "custom":
        raise ValueError("only custom challenges can be resolved manually")
    if account_id not in (challenge.challenger_account_id, challenge.opponent_account_id):
        raise PermissionError("only the two participants can resolve this challenge")
    if challenge.status != "accepted":
        raise ConflictError("this challenge is not awaiting resolution")
    if result_option not in challenge.options:
        raise ValueError("result is not one of this challenge's options")

    winner_id = (
        challenge.challenger_account_id
        if result_option == challenge.outcome
        else challenge.opponent_account_id
    )
    settled_at = _utcnow()
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE friend_challenges
            SET status = 'settled', settled_at = ?, result = ?, winner_account_id = ?
            WHERE id = ?
            """,
            (settled_at, result_option, winner_id, challenge.id),
        )
        connection.commit()

    challenge.status = "settled"
    challenge.settled_at = settled_at
    challenge.result = result_option
    challenge.winner_account_id = winner_id
    return _serialize_challenge(challenge)


def _settle_due_challenges(account_id: str) -> None:
    """Lazily settle every accepted MATCH challenge involving this account whose match is
    old enough to be considered finished, reusing the exact same simulated result and
    settlement window as `bet_repository._settle_due_bets` (see
    `specs/007-retos-entre-amigos/research.md` Decision 3) — no Elo effect (Decision 2) and,
    since the "no currency" revision, no Beths effect either: settlement only decides the
    head-to-head winner (see `head_to_head_counts`).
    Custom challenges never settle automatically (see `resolve_custom_challenge`).
    """
    now = datetime.now(timezone.utc)
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT * FROM friend_challenges
            WHERE status = 'accepted' AND challenge_type = 'match'
              AND (challenger_account_id = ? OR opponent_account_id = ?)
            """,
            (account_id, account_id),
        ).fetchall()

    for row in rows:
        challenge = _row_to_challenge(row)
        kickoff = _match_kickoff(challenge.match_id)
        reference = kickoff if kickoff is not None else _parse_timestamp(challenge.created_at)
        if now < reference + timedelta(minutes=SETTLEMENT_DELAY_MINUTES):
            continue

        result = generate_match_result(challenge.match_id)
        winner_id = challenge.challenger_account_id if result == challenge.outcome else challenge.opponent_account_id
        settled_at = now.isoformat()

        with get_connection() as connection:
            connection.execute(
                """
                UPDATE friend_challenges
                SET status = 'settled', settled_at = ?, result = ?, winner_account_id = ?
                WHERE id = ?
                """,
                (settled_at, result, winner_id, challenge.id),
            )
            connection.commit()


def list_challenges_for_account(account_id: str) -> dict[str, list[dict[str, Any]]]:
    initialize_repository()
    _settle_due_challenges(account_id)

    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT * FROM friend_challenges
            WHERE challenger_account_id = ? OR opponent_account_id = ?
            ORDER BY created_at DESC
            """,
            (account_id, account_id),
        ).fetchall()

    incoming: list[dict[str, Any]] = []
    outgoing: list[dict[str, Any]] = []
    active: list[dict[str, Any]] = []
    resolved: list[dict[str, Any]] = []

    for row in rows:
        challenge = _row_to_challenge(row)
        serialized = _serialize_challenge(challenge)
        if challenge.status == "pending":
            if challenge.opponent_account_id == account_id:
                incoming.append(serialized)
            else:
                outgoing.append(serialized)
        elif challenge.status == "accepted":
            active.append(serialized)
        else:
            resolved.append(serialized)

    def _resolved_sort_key(item: dict[str, Any]) -> str:
        return item["settledAt"] or item["respondedAt"] or item["createdAt"]

    resolved.sort(key=_resolved_sort_key, reverse=True)

    return {"incoming": incoming, "outgoing": outgoing, "active": active, "resolved": resolved}


def head_to_head_counts(account_id: str) -> dict[str, dict[str, int]]:
    """How many settled challenges `account_id` has won/lost against each individual
    friend, keyed by that friend's account id — the bragging-rights record the "no
    currency" revision replaced Beths staking with. Computed on read from already-settled
    `friend_challenges` rows rather than a maintained counter column, since at this
    prototype's scale a live SUM/COUNT is simpler than keeping a running tally in sync
    across accept/decline/cancel/settle (Simplicity Is Mandatory)."""
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT challenger_account_id, opponent_account_id, winner_account_id
            FROM friend_challenges
            WHERE status = 'settled' AND (challenger_account_id = ? OR opponent_account_id = ?)
            """,
            (account_id, account_id),
        ).fetchall()

    counts: dict[str, dict[str, int]] = {}
    for row in rows:
        other_id = (
            row["opponent_account_id"]
            if row["challenger_account_id"] == account_id
            else row["challenger_account_id"]
        )
        bucket = counts.setdefault(other_id, {"wins": 0, "losses": 0})
        if row["winner_account_id"] == account_id:
            bucket["wins"] += 1
        elif row["winner_account_id"] == other_id:
            bucket["losses"] += 1
    return counts
