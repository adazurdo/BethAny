from __future__ import annotations

import random

from .odds import match_probabilities, seed_for

OUTCOMES = ("local", "empate", "visitante")


def generate_match_result(match_id: str) -> str:
    """Derive a stable, deterministic simulated result ("local"|"empate"|"visitante")
    purely from `match_id`, weighted by the same probabilities used for its odds.

    No real match result exists anywhere in this prototype (see
    `specs/006-elo/spec.md` Clarifications) — this is an explicit mock-stage
    simplification, never persisted, always recomputed the same way for a given
    `match_id` (see `specs/006-elo/research.md` Decision 8).
    """
    home_p, draw_p, away_p = match_probabilities(match_id)
    rng = random.Random(seed_for(match_id, salt=":result"))
    return rng.choices(OUTCOMES, weights=[home_p, draw_p, away_p], k=1)[0]
