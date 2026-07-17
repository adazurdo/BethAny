from __future__ import annotations

K_FACTOR_NEW = 32
K_FACTOR_ESTABLISHED = 16
K_FACTOR_THRESHOLD_GAMES = 30

ELO_FLOOR = 100
ELO_TIER_SIZE = 100
COINS_PER_ELO_TIER = 50


def expected_score(rating: float, opponent_rating: float) -> float:
    """Chess-style win expectation of `rating` against `opponent_rating`, in [0, 1]."""
    return 1.0 / (1.0 + 10 ** ((opponent_rating - rating) / 400))


def k_factor(games_played: int) -> int:
    return K_FACTOR_NEW if games_played < K_FACTOR_THRESHOLD_GAMES else K_FACTOR_ESTABLISHED


def update_elo(rating: int, opponent_rating: float, result: float, games_played: int) -> int:
    """Apply one chess-style 1v1 Elo update, clamped to `ELO_FLOOR`.

    `result` is 1.0 for a win, 0.0 for a loss, 0.5 for a draw.
    """
    expected = expected_score(rating, opponent_rating)
    new_rating = rating + k_factor(games_played) * (result - expected)
    return max(ELO_FLOOR, round(new_rating))


def resolve_group_update(rating: int, pairwise_results: list[tuple[float, float]], games_played: int) -> int:
    """Update `rating` from a round-robin of virtual pairwise duels against every other
    voter of a resolved prediction: 1.0 (win) against each voter who got it wrong while
    you got it right, 0.0 (loss) the other way round, 0.5 (draw) if you both matched
    (both correct or both incorrect) — see `specs/006-elo/research.md` Decision 2.

    Averaging (not summing) the pairwise deltas keeps a single resolution's swing
    comparable to one ordinary 1v1 update regardless of how many people voted, while
    still making a correct minority pick worth more than a correct majority pick: a
    minority-correct voter "beats" more of the (mostly wrong) field than a
    majority-correct voter does.
    """
    if not pairwise_results:
        return rating
    k = k_factor(games_played)
    total_delta = sum(k * (result - expected_score(rating, opponent_rating)) for opponent_rating, result in pairwise_results)
    return max(ELO_FLOOR, round(rating + total_delta / len(pairwise_results)))


def milestone_tier(elo: int, tier_size: int = ELO_TIER_SIZE) -> int:
    """Round `elo` down to the nearest multiple of `tier_size` (e.g. 1810 -> 1800)."""
    return (elo // tier_size) * tier_size
