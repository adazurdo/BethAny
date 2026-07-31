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


def match_probabilities(match_id: str) -> tuple[float, float, float]:
    """Derive stable (home, draw, away) win probabilities purely from `match_id`.

    Shared by `generate_match_odds` (below) and `match_results.generate_match_result`,
    so the simulated result of a match is always consistent with the favorite implied
    by its own odds (see `specs/006-elo/research.md` Decision 8).
    """
    rng = random.Random(seed_for(match_id))

    # A mild home-advantage skew, like a real 1X2 market, before normalizing to probabilities.
    home_strength = rng.uniform(0.30, 0.55)
    draw_strength = rng.uniform(0.20, 0.28)
    away_strength = max(0.15, 1.0 - home_strength - draw_strength)
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
        draw_odds=to_odds(draw_p),
        away_odds=to_odds(away_p),
    )


def is_open_for_betting(status: str) -> bool:
    return status.lower() in OPEN_FOR_BETTING_STATUSES
