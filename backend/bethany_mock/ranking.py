from __future__ import annotations

from .fixtures import get_mock_ranking


def build_global_ranking_summary(limit: int = 3) -> list[dict[str, object]]:
    ranking = get_mock_ranking()
    return ranking[: max(0, limit)]
