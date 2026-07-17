from __future__ import annotations

import math

K_FACTOR_NEW = 32
K_FACTOR_ESTABLISHED = 16
K_FACTOR_VETERAN = 8
K_FACTOR_THRESHOLD_ESTABLISHED = 30
K_FACTOR_THRESHOLD_VETERAN = 200

ELO_FLOOR = 100
ELO_TIER_SIZE = 100
BETHS_PER_ELO_TIER = 50

P_IMPLIED_MIN = 0.05
P_IMPLIED_MAX = 0.95

STAKE_MULT_MIN = 0.8
STAKE_MULT_MAX = 1.5

MAX_ELO_STAKE = 1000
DAILY_ELO_COUNTED_BETS = 5
PROVISIONAL_COUNTED_BETS = 20


def k_factor(games_played: int) -> int:
    """Tiered like FIDE/chess.com: volatile while new, stable once established, and
    even less volatile once veteran — so a lucky streak of settled bets can't keep
    swinging a long-lived account's Elo as hard as a newcomer's (see
    specs/006-elo/research.md Decision 3)."""
    if games_played < K_FACTOR_THRESHOLD_ESTABLISHED:
        return K_FACTOR_NEW
    if games_played < K_FACTOR_THRESHOLD_VETERAN:
        return K_FACTOR_ESTABLISHED
    return K_FACTOR_VETERAN


def implied_probability(odds: float) -> float:
    """Market-implied win probability of a bet's decimal odds (the "difficulty" of
    the pick), clamped so a single bet on extreme odds can never swing Elo by an
    unbounded amount."""
    raw = 1.0 / odds if odds > 0 else 0.5
    return max(P_IMPLIED_MIN, min(P_IMPLIED_MAX, raw))


def stake_multiplier(stake: float) -> float:
    """Diminishing-returns confidence multiplier on the Beths staked: each extra Beth
    moves Elo less than the last, and the multiplier is hard-capped at
    STAKE_MULT_MAX (reached at MAX_ELO_STAKE) so saving up for one giant bet never
    pays off beyond that point."""
    if stake <= 0:
        return STAKE_MULT_MIN
    raw = 0.45 + 0.35 * math.log10(stake)
    return max(STAKE_MULT_MIN, min(STAKE_MULT_MAX, raw))


def update_elo_from_bet(rating: float, odds: float, result: float, games_played: int, stake: float) -> tuple[int, float]:
    """Apply one Elo update from a settled match bet.

    `result` is 1.0 if the bet won, 0.0 if it lost. `odds` are the bet's combined
    decimal odds (difficulty of the pick); `stake` is the Beths risked (confidence).
    Returns `(new_rating, delta_applied)`.
    """
    p = implied_probability(odds)
    delta = k_factor(games_played) * stake_multiplier(stake) * (result - p)
    new_rating = max(ELO_FLOOR, round(rating + delta))
    return new_rating, delta


def milestone_tier(elo_value: int, tier_size: int = ELO_TIER_SIZE) -> int:
    """Round `elo_value` down to the nearest multiple of `tier_size` (e.g. 1810 -> 1800)."""
    return (elo_value // tier_size) * tier_size
