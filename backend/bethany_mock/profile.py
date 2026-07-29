from __future__ import annotations

from typing import Any

from .account_repository import get_account_by_id
from .challenge_repository import head_to_head_counts
from .social_repository import get_relationship


def build_account_profile(requester_account_id: str, target_account_id: str) -> dict[str, Any] | None:
    """Public-facing view of `target_account_id` for `requester_account_id` to look at —
    the drill-down destination when tapping a name in the ranking, social lists, or the
    activity feed. Deliberately omits `beths`: bragging rights here are Elo and the
    head-to-head record, not wealth (see `head_to_head_counts`, which replaced Beths
    staking on challenges)."""
    account = get_account_by_id(target_account_id)
    if account is None:
        return None

    is_self = target_account_id == requester_account_id
    relationship = "self" if is_self else get_relationship(requester_account_id, target_account_id)

    record = {"wins": 0, "losses": 0}
    if is_self or relationship == "friend":
        record = head_to_head_counts(requester_account_id).get(target_account_id, record)

    return {
        "accountId": account.id,
        "identifier": account.identifier,
        "displayName": account.profile.display_name,
        "avatarUrl": account.profile.avatar_url,
        "bio": account.profile.bio,
        "elo": account.profile.elo,
        "rankLabel": account.profile.rank_label,
        "winRate": account.profile.win_rate,
        "streak": account.profile.streak,
        "relationship": relationship,
        "headToHead": record,
    }
