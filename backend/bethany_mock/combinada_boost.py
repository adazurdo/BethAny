from __future__ import annotations

import random

# A combinada needs at least this many distinct-match selections to qualify for the boost -
# stricter than the plain "combinada" minimum of 2 (see bet_repository.place_bet).
MIN_SELECTIONS = 3

MIN_PERCENT = 2.0
MAX_PERCENT = 20.0


def is_eligible(distinct_selection_count: int) -> bool:
    return distinct_selection_count >= MIN_SELECTIONS


def roll_boost_percent() -> float:
    """Random combinada bonus in [MIN_PERCENT, MAX_PERCENT], weighted toward the low end via a
    triangular distribution peaking at MIN_PERCENT - so a roll near MAX_PERCENT stays rare and
    feels special rather than a coinflip."""
    return round(random.triangular(MIN_PERCENT, MAX_PERCENT, MIN_PERCENT), 1)
