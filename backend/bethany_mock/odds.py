from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass

# The football-data.org ("scheduled", "timed") and PandaScore ("not_started") statuses
# that mean "not yet played" — the same boundary `mock_dataset.py`'s REMAINING_*_STATUSES
# sets use to decide whether a fixture is still upcoming, reused here so "can I bet on it"
# never diverges from "is it still listed as upcoming".
OPEN_FOR_BETTING_STATUSES = {"scheduled", "timed", "not_started"}


@dataclass
class MatchOdds:
    match_id: str
    home_odds: float
    draw_odds: float
    away_odds: float

    def to_dict(self) -> dict[str, float]:
        return {
            "home_odds": self.home_odds,
            "draw_odds": self.draw_odds,
            "away_odds": self.away_odds,
        }


def seed_for(match_id: str, salt: str = "") -> int:
    digest = hashlib.sha256(f"{match_id}{salt}".encode("utf-8")).hexdigest()
    return int(digest[:16], 16)


def can_draw(match_id: str) -> bool:
    """Whether a draw is a possible outcome for this match at all.

    Esports matches (`mock_dataset.normalize_esports_matches` always ids them
    "esports-match-{id}") are best-of series - they always produce a winner, never a draw.
    Football matches ("match-{id}") can.
    """
    return not match_id.startswith("esports-match-")


def match_probabilities(match_id: str) -> tuple[float, float, float]:
    """Derive stable (home, draw, away) win probabilities purely from `match_id`.

    Used by `generate_match_odds` (below) to derive its 1X2 market. Bet settlement no
    longer simulates a result from these probabilities - see `match_results.resolve_match_result`,
    which checks the real result from the match's own provider instead
    (see `specs/006-elo/research.md` Decision 8, superseded).
    """
    rng = random.Random(seed_for(match_id))

    # A mild home-advantage skew, like a real 1X2 market, before normalizing to probabilities.
    home_strength = rng.uniform(0.30, 0.55)
    draw_strength = rng.uniform(0.20, 0.28)
    away_strength = max(0.15, 1.0 - home_strength - draw_strength)

    if not can_draw(match_id):
        # Redistribute the draw weight into home/away (keeping their relative ratio) instead of
        # just zeroing it out unnormalized, so the two remaining probabilities still sum to 1.
        total = home_strength + away_strength
        return home_strength / total, 0.0, away_strength / total

    total = home_strength + draw_strength + away_strength
    return home_strength / total, draw_strength / total, away_strength / total


def generate_match_odds(match_id: str) -> MatchOdds:
    """Derive a stable 1X2 market purely from `match_id`.

    Never persisted: the same id always yields the same three odds, so adding
    this market required zero schema changes and can never drift out of sync
    with itself (see `research.md` Decision 1).
    """
    home_p, draw_p, away_p = match_probabilities(match_id)

    overround = 1.08  # a small bookmaker margin, so the three odds don't imply exactly 100%

    def to_odds(probability: float) -> float:
        return round(max(1.10, overround / probability), 2)

    return MatchOdds(
        match_id=match_id,
        home_odds=to_odds(home_p),
        # 0 (never a real odds value) signals "not offered" for matches that can't draw,
        # instead of dividing by the zero probability from match_probabilities above.
        draw_odds=to_odds(draw_p) if draw_p > 0 else 0.0,
        away_odds=to_odds(away_p),
    )


def is_open_for_betting(status: str) -> bool:
    return status.lower() in OPEN_FOR_BETTING_STATUSES
