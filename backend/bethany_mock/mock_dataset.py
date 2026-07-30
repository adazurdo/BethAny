from __future__ import annotations

from datetime import datetime
from typing import Any

from .models import MockMatch, TeamSnapshot

DEFAULT_VENUE = "Estadio por confirmar"
DEFAULT_CREST = ""
TBD_TEAM_NAME = "Por determinar"

# Statuses football-data.org uses for matches that have not been played yet.
REMAINING_MATCH_STATUSES = {"SCHEDULED", "TIMED", "IN_PLAY", "PAUSED", "SUSPENDED", "POSTPONED"}


def normalize_teams(raw_teams: list[dict[str, Any]], standings: list[dict[str, Any]] | None = None) -> list[TeamSnapshot]:
    positions_by_team_id = _positions_by_team_id(standings or [])

    teams: list[TeamSnapshot] = []
    for item in raw_teams:
        team_id = str(item.get("id", "")).strip()
        if not team_id:
            continue
        name = str(item.get("name") or item.get("shortName") or item.get("tla") or "Equipo sin nombre")
        squad_payload = item.get("squad")
        squad = [str(player.get("name")) for player in squad_payload if isinstance(player, dict) and player.get("name")] if isinstance(squad_payload, list) else []
        teams.append(
            TeamSnapshot(
                id=team_id,
                name=name,
                short_name=str(item.get("shortName") or item.get("tla") or name),
                crest_url=str(item.get("crest") or DEFAULT_CREST),
                venue=str(item.get("venue") or DEFAULT_VENUE),
                squad=squad,
                standing_position=positions_by_team_id.get(team_id),
            )
        )
    return teams


def _positions_by_team_id(standings: list[dict[str, Any]]) -> dict[str, int]:
    positions: dict[str, int] = {}
    for table in standings:
        for row in table.get("table", []) if isinstance(table, dict) else []:
            team = row.get("team") if isinstance(row, dict) else None
            position = row.get("position") if isinstance(row, dict) else None
            if isinstance(team, dict) and team.get("id") is not None and isinstance(position, int):
                positions[str(team["id"])] = position
    return positions


def normalize_matches(competition_code: str, raw_matches: list[dict[str, Any]], limit: int = 12) -> list[MockMatch]:
    """Keep only the real fixtures that are still left to be played, soonest first.

    A full season can have hundreds of scheduled fixtures (e.g. LaLiga returns all 380
    once the calendar is published); `limit` keeps the UI to a realistic "what's next" list.
    """
    remaining = [item for item in raw_matches if str(item.get("status", "")).upper() in REMAINING_MATCH_STATUSES]
    remaining.sort(key=lambda item: str(item.get("utcDate", "")))
    remaining = remaining[: max(0, limit)]

    matches: list[MockMatch] = []
    for item in remaining:
        match_id = item.get("id")
        if match_id is None:
            continue
        home = item.get("homeTeam") or {}
        away = item.get("awayTeam") or {}
        matches.append(
            MockMatch(
                id=f"match-{match_id}",
                competition_code=competition_code,
                home_team_id=str(home.get("id")) if home.get("id") is not None else "",
                home_team_name=str(home.get("name") or TBD_TEAM_NAME),
                away_team_id=str(away.get("id")) if away.get("id") is not None else "",
                away_team_name=str(away.get("name") or TBD_TEAM_NAME),
                kickoff_label=_format_kickoff(str(item.get("utcDate", ""))),
                status=str(item.get("status", "scheduled")).lower(),
            )
        )
    return matches


def _format_kickoff(utc_date: str) -> str:
    if not utc_date:
        return "Fecha por confirmar"
    try:
        dt = datetime.fromisoformat(utc_date.replace("Z", "+00:00"))
    except ValueError:
        return "Fecha por confirmar"
    return dt.strftime("%a %d %b %H:%M")
