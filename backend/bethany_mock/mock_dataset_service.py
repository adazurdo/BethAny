from __future__ import annotations

from typing import Any

from .football_data_client import (
    FootballDataError,
    fetch_competition_info,
    fetch_competition_matches,
    fetch_competition_standings,
    fetch_competition_teams,
)
from .mock_dataset import normalize_esports_matches, normalize_esports_teams, normalize_matches, normalize_teams
from .mock_dataset_repository import get_competition_source, get_snapshot, mark_sync_failure, save_snapshot, update_competition_icon
from .models import TeamSnapshot, MockMatch
from .pandascore_client import PandaScoreError, fetch_running_matches, fetch_teams, fetch_upcoming_matches


def _fetch_football(code: str, external_code: str) -> tuple[list[TeamSnapshot], list[MockMatch]]:
    raw_teams = fetch_competition_teams(external_code)
    if not raw_teams:
        raise FootballDataError("la fuente no devolvio equipos para esta competicion")
    try:
        standings = fetch_competition_standings(external_code)
    except FootballDataError:
        standings = []
    teams = normalize_teams(raw_teams, standings)

    try:
        raw_matches = fetch_competition_matches(external_code)
        matches = normalize_matches(code, raw_matches)
    except FootballDataError:
        matches = []

    # Best-effort: the real competition emblem is a nice-to-have, not worth failing the whole
    # sync over if this one extra call errors out.
    try:
        info = fetch_competition_info(external_code)
        emblem = info.get("emblem")
        if emblem:
            update_competition_icon(code, str(emblem))
    except FootballDataError:
        pass

    return teams, matches


def _fetch_esports(code: str, external_code: str) -> tuple[list[TeamSnapshot], list[MockMatch]]:
    raw_teams = fetch_teams(external_code)
    if not raw_teams:
        raise PandaScoreError("la fuente no devolvio equipos para este videojuego")

    # `/matches/upcoming` only ever returns "not_started"/"canceled" matches - a match that
    # has actually started moves to `/matches/running` and would otherwise vanish entirely
    # instead of showing as in progress.
    try:
        raw_matches = fetch_upcoming_matches(external_code)
    except PandaScoreError:
        raw_matches = []
    try:
        raw_matches = fetch_running_matches(external_code) + raw_matches
    except PandaScoreError:
        pass

    matches = normalize_esports_matches(code, raw_matches)
    teams = normalize_esports_teams(raw_teams, raw_matches)
    return teams, matches


def sync_competition(code: str) -> dict[str, Any]:
    source = get_competition_source(code)
    if source is None:
        raise LookupError(f"competicion no soportada: {code}")

    try:
        if source.provider == "pandascore":
            teams, matches = _fetch_esports(code, source.external_code)
        else:
            teams, matches = _fetch_football(code, source.external_code)

        # No synthetic fallback: if the external source has no fixtures yet, the snapshot
        # simply has no matches rather than showing invented pairings as if real.
        snapshot = save_snapshot(code, teams, matches)
        refreshed_source = get_competition_source(code)
        return {"ok": True, "source": refreshed_source, "snapshot": snapshot}
    except (FootballDataError, PandaScoreError) as exc:
        updated_source = mark_sync_failure(code, str(exc))
        fallback_snapshot = get_snapshot(code)
        return {"ok": False, "error": str(exc), "source": updated_source, "snapshot": fallback_snapshot}
