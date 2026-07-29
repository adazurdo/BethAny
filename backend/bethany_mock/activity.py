from __future__ import annotations

from typing import Any

from .account_repository import get_account_by_id
from .database import get_connection, loads
from .social_repository import get_group, list_friends

DEFAULT_LIMIT = 30


def _account_summary(account_id: str) -> dict[str, Any] | None:
    account = get_account_by_id(account_id)
    if account is None:
        return None
    return {
        "accountId": account.id,
        "displayName": account.profile.display_name,
        "avatarUrl": account.profile.avatar_url,
    }


def build_activity_feed(account_id: str, limit: int = DEFAULT_LIMIT) -> list[dict[str, Any]]:
    """A feed of recent notable events involving `account_id` or their friends: Elo
    milestones, challenge wins, won bets, and resolved predictions in groups the requester
    belongs to. Deliberately has no dedicated storage of its own — every event is derived on
    read from tables that already exist (elo_milestone_awards, friend_challenges,
    placed_bets, custom_predictions), the same way `head_to_head_counts` and
    `build_global_ranking` are computed on read rather than maintained as a running log.
    That avoids every mutation site in the app having to remember to also write an activity
    row — the tradeoff is this does a handful of extra reads per call, which is fine at this
    prototype's scale.
    """
    scope_ids = [account_id] + [friend["accountId"] for friend in list_friends(account_id)]
    placeholders = ",".join("?" for _ in scope_ids)

    events: list[dict[str, Any]] = []

    with get_connection() as connection:
        milestone_rows = connection.execute(
            f"SELECT * FROM elo_milestone_awards WHERE account_id IN ({placeholders}) "
            "ORDER BY awarded_at DESC LIMIT ?",
            (*scope_ids, limit),
        ).fetchall()
    for row in milestone_rows:
        who = _account_summary(row["account_id"])
        if who is None:
            continue
        events.append(
            {
                "id": f"milestone:{row['id']}",
                "kind": "milestone",
                "isSelf": row["account_id"] == account_id,
                "title": f"Alcanzó el hito de {row['tier']} de Elo",
                "detail": f"+{row['bonus_beths']} Beths",
                "occurredAt": row["awarded_at"],
                **who,
            }
        )

    with get_connection() as connection:
        challenge_rows = connection.execute(
            f"SELECT * FROM friend_challenges WHERE status = 'settled' "
            f"AND winner_account_id IN ({placeholders}) ORDER BY settled_at DESC LIMIT ?",
            (*scope_ids, limit),
        ).fetchall()
    for row in challenge_rows:
        winner = _account_summary(row["winner_account_id"])
        if winner is None:
            continue
        loser_id = (
            row["opponent_account_id"]
            if row["challenger_account_id"] == row["winner_account_id"]
            else row["challenger_account_id"]
        )
        loser = get_account_by_id(loser_id)
        loser_name = loser.profile.display_name if loser else "otro jugador"
        events.append(
            {
                "id": f"challenge:{row['id']}",
                "kind": "challenge_won",
                "isSelf": row["winner_account_id"] == account_id,
                "title": f"Ganó un reto contra {loser_name}",
                "detail": row["match_label"] if row["challenge_type"] == "match" else row["title"],
                "occurredAt": row["settled_at"],
                **winner,
            }
        )

    with get_connection() as connection:
        bet_rows = connection.execute(
            f"SELECT * FROM placed_bets WHERE status = 'ganada' AND account_id IN ({placeholders}) "
            "ORDER BY settled_at DESC LIMIT ?",
            (*scope_ids, limit),
        ).fetchall()
    for row in bet_rows:
        who = _account_summary(row["account_id"])
        if who is None:
            continue
        selections = loads(row["selections_json"])
        if row["bet_type"] == "combinada":
            detail = f"Combinada de {len(selections)} selecciones"
        else:
            detail = selections[0]["match_label"] if selections else None
        events.append(
            {
                "id": f"bet:{row['id']}",
                "kind": "bet_won",
                "isSelf": row["account_id"] == account_id,
                "title": f"Ganó {round(row['potential_winnings'])} Beths en una apuesta",
                "detail": detail,
                "occurredAt": row["settled_at"],
                **who,
            }
        )

    with get_connection() as connection:
        prediction_rows = connection.execute(
            """
            SELECT * FROM custom_predictions
            WHERE status = 'resolved'
              AND group_id IN (SELECT group_id FROM group_memberships WHERE account_id = ?)
            ORDER BY resolved_at DESC LIMIT ?
            """,
            (account_id, limit),
        ).fetchall()
    for row in prediction_rows:
        creator = _account_summary(row["created_by_account_id"])
        if creator is None:
            continue
        group = get_group(row["group_id"])
        events.append(
            {
                "id": f"prediction:{row['id']}",
                "kind": "prediction_resolved",
                "isSelf": row["created_by_account_id"] == account_id,
                "title": f'Se resolvió "{row["question"]}" en {group.name if group else "un grupo"}',
                "detail": f"Ganó: {row['resolved_option']}",
                "occurredAt": row["resolved_at"],
                **creator,
            }
        )

    events.sort(key=lambda event: event["occurredAt"], reverse=True)
    return events[:limit]
