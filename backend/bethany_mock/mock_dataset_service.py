from __future__ import annotations

from typing import Any

from .football_data_client import (
    FootballDataError,
    fetch_competition_matches,
    fetch_competition_standings,
    fetch_competition_teams,
)
from .mock_dataset import normalize_matches, normalize_teams
from .mock_dataset_repository import get_competition_source, get_snapshot, mark_sync_failure, save_snapshot


def sync_competition(code: str) -> dict[str, Any]:
    source = get_competition_source(code)
    if source is None:
        raise LookupError(f"competicion no soportada: {code}")

    try:
        raw_teams = fetch_competition_teams(source.external_code)
        if not raw_teams:
            raise FootballDataError("la fuente no devolvio equipos para esta competicion")
        try:
            standings = fetch_competition_standings(source.external_code)
        except FootballDataError:
            standings = []

        teams = normalize_teams(raw_teams, standings)

        try:
            raw_matches = fetch_competition_matches(source.external_code)
            matches = normalize_matches(code, raw_matches)
        except FootballDataError:
            matches = []

        # No synthetic fallback: if football-data.org has no fixtures yet, the snapshot
        # simply has no matches rather than showing invented pairings as if real.
        snapshot = save_snapshot(code, teams, matches)
        refreshed_source = get_competition_source(code)
        return {"ok": True, "source": refreshed_source, "snapshot": snapshot}
    except FootballDataError as exc:
        updated_source = mark_sync_failure(code, str(exc))
        fallback_snapshot = get_snapshot(code)
        return {"ok": False, "error": str(exc), "source": updated_source, "snapshot": fallback_snapshot}
