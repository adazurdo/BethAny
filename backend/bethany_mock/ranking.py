from __future__ import annotations

from .account_repository import list_all_accounts
from .elo import PROVISIONAL_COUNTED_BETS
from .fixtures import get_mock_ranking


def build_global_ranking_summary(limit: int = 3) -> list[dict[str, object]]:
    ranking = get_mock_ranking()
    return ranking[: max(0, limit)]


def build_global_ranking() -> list[dict[str, object]]:
    """Real global ranking across every account, sorted by Elo — the backend-driven
    replacement for the static `globalRanking` mock the frontend used to show
    (see `specs/006-elo/spec.md` Assumptions: this was deliberately left out of that
    spec, keeping only `elo_bets_settled` as the data point a future ranking would need).

    An account is `provisional` while it hasn't settled enough Elo-counted bets yet
    (`elo.PROVISIONAL_COUNTED_BETS`) — its Elo is still volatile, so the ranking marks
    it as such instead of quietly ranking it against established accounts.
    """
    accounts = list_all_accounts()
    ranked = sorted(accounts, key=lambda account: account.profile.elo, reverse=True)
    return [
        {
            "accountId": account.id,
            "position": position,
            "displayName": account.profile.display_name,
            "avatarUrl": account.profile.avatar_url,
            "elo": account.profile.elo,
            "rankLabel": account.profile.rank_label,
            "provisional": account.profile.elo_bets_settled < PROVISIONAL_COUNTED_BETS,
        }
        for position, account in enumerate(ranked, start=1)
    ]
