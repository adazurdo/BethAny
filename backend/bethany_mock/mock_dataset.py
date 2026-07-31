from __future__ import annotations

from datetime import datetime
from typing import Any

from .models import MockMatch, TeamSnapshot

DEFAULT_VENUE = "Estadio por confirmar"
DEFAULT_CREST = ""
TBD_TEAM_NAME = "TBD"

# Statuses football-data.org uses for matches that have not been played yet.
REMAINING_MATCH_STATUSES = {"SCHEDULED", "TIMED", "IN_PLAY", "PAUSED", "SUSPENDED", "POSTPONED"}

# football-data.org `stage` values that represent a knockout/elimination round, mapped to a
# human label. Anything else (REGULAR_SEASON, LEAGUE_STAGE, GROUP_STAGE, missing) is treated
# as a regular fixture with no special "important match" callout.
KNOCKOUT_STAGE_LABELS = {
    "PLAYOFFS": "Playoffs",
    "LAST_16": "Octavos de final",
    "QUARTER_FINALS": "Cuartos de final",
    "SEMI_FINALS": "Semifinal",
    "FINAL": "Final",
    "THIRD_PLACE": "Tercer puesto",
}


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
                kickoff_at=str(item.get("utcDate", "")),
                stage_label=KNOCKOUT_STAGE_LABELS.get(str(item.get("stage", "")).upper()),
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


# PandaScore statuses for matches that are not yet finished - "running" (currently live,
# from fetch_running_matches) is included alongside "not_started"/"postponed" so a match that
# has actually started still shows up (as in progress), instead of disappearing entirely.
REMAINING_ESPORTS_MATCH_STATUSES = {"not_started", "postponed", "running"}


def normalize_esports_teams(
    raw_teams: list[dict[str, Any]], raw_matches: list[dict[str, Any]] | None = None
) -> list[TeamSnapshot]:
    # `/teams` returns an arbitrary page of ~100 teams for the whole videogame, which rarely
    # overlaps with the handful of teams actually playing in `/matches/upcoming`. Each match's
    # `opponents` entries already embed the full team object (including `image_url`), so merge
    # those in - keyed by id, opponents last so they win when a team appears in both sources.
    merged_by_id: dict[str, dict[str, Any]] = {}
    for item in raw_teams:
        team_id = str(item.get("id", "")).strip()
        if team_id:
            merged_by_id[team_id] = item
    for opponent in _match_opponents(raw_matches or []):
        team_id = str(opponent.get("id", "")).strip()
        if team_id:
            merged_by_id[team_id] = opponent

    teams: list[TeamSnapshot] = []
    for item in merged_by_id.values():
        team_id = str(item.get("id", "")).strip()
        if not team_id:
            continue
        name = str(item.get("name") or item.get("acronym") or "Equipo sin nombre")
        players_payload = item.get("players")
        squad = (
            [str(player.get("name")) for player in players_payload if isinstance(player, dict) and player.get("name")]
            if isinstance(players_payload, list)
            else []
        )
        teams.append(
            TeamSnapshot(
                id=team_id,
                name=name,
                short_name=str(item.get("acronym") or name),
                crest_url=str(item.get("image_url") or DEFAULT_CREST),
                venue=str(item.get("location") or "Online"),
                squad=squad,
                standing_position=None,
            )
        )
    return teams


def normalize_esports_matches(competition_code: str, raw_matches: list[dict[str, Any]], limit: int = 12) -> list[MockMatch]:
    """Keep only the real upcoming fixtures PandaScore has scheduled, soonest first.

    Mirrors `normalize_matches` (football-data.org) but reads PandaScore's shape:
    matches carry an `opponents` list instead of top-level `homeTeam`/`awayTeam`.
    """
    remaining = [item for item in raw_matches if str(item.get("status", "")).lower() in REMAINING_ESPORTS_MATCH_STATUSES]
    remaining.sort(key=lambda item: str(item.get("begin_at") or item.get("scheduled_at") or ""))
    remaining = remaining[: max(0, limit)]

    matches: list[MockMatch] = []
    for item in remaining:
        match_id = item.get("id")
        if match_id is None:
            continue
        opponents = item.get("opponents") or []
        home = _esports_opponent(opponents, 0)
        away = _esports_opponent(opponents, 1)
        league = item.get("league") if isinstance(item.get("league"), dict) else {}
        matches.append(
            MockMatch(
                id=f"esports-match-{match_id}",
                competition_code=competition_code,
                home_team_id=str(home.get("id")) if home.get("id") is not None else "",
                home_team_name=str(home.get("name") or TBD_TEAM_NAME),
                away_team_id=str(away.get("id")) if away.get("id") is not None else "",
                away_team_name=str(away.get("name") or TBD_TEAM_NAME),
                kickoff_label=_format_kickoff(str(item.get("begin_at") or item.get("scheduled_at") or "")),
                status=str(item.get("status", "scheduled")).lower(),
                kickoff_at=str(item.get("begin_at") or item.get("scheduled_at") or ""),
                stage_label=_esports_stage_label(item),
                league_name=str(league.get("name")) if league.get("name") else None,
                league_image_url=str(league.get("image_url")) if league.get("image_url") else None,
            )
        )
    return matches


# PandaScore's match `name` spells out the bracket round in free text (e.g. "Lower bracket
# quarterfinal 1: VTC vs DOH", "Upper bracket final: FNL vs NM", "Round of 16 match 4: ...").
# Longer/more specific keywords are checked first since "quarterfinal"/"semifinal" both contain
# the substring "final".
ESPORTS_ROUND_KEYWORDS = [
    ("quarterfinal", "Cuartos de final"),
    ("semifinal", "Semifinal"),
    ("round of 16", "Octavos de final"),
    ("3rd place", "Tercer puesto"),
    ("third place", "Tercer puesto"),
    ("final", "Final"),
]


def _esports_stage_label(match: dict[str, Any]) -> str | None:
    """PandaScore has no fixed stage enum; `tournament.name` is free text (e.g. "Playoffs",
    "Grand Final", "Group A"). `has_bracket` is true for group stages too, so it alone can't
    signal "important" - only the name mentioning playoffs/finals does. When it does, the
    match's own `name` usually pinpoints the round (cuartos/semis/final); fall back to the
    tournament name itself (e.g. "Playoffs") when it doesn't parse."""
    tournament = match.get("tournament")
    tournament_name = str(tournament.get("name") or "").strip() if isinstance(tournament, dict) else ""
    if not tournament_name:
        return None
    lowered_tournament = tournament_name.lower()
    if "playoff" not in lowered_tournament and "final" not in lowered_tournament:
        return None

    match_name = str(match.get("name") or "").lower()
    for keyword, label in ESPORTS_ROUND_KEYWORDS:
        if keyword in match_name:
            return label
    return tournament_name


def _esports_opponent(opponents: list[dict[str, Any]], index: int) -> dict[str, Any]:
    if index >= len(opponents) or not isinstance(opponents[index], dict):
        return {}
    opponent = opponents[index].get("opponent")
    return opponent if isinstance(opponent, dict) else {}


def _match_opponents(raw_matches: list[dict[str, Any]]) -> list[dict[str, Any]]:
    opponents: list[dict[str, Any]] = []
    for match in raw_matches:
        for entry in match.get("opponents") or []:
            opponent = entry.get("opponent") if isinstance(entry, dict) else None
            if isinstance(opponent, dict):
                opponents.append(opponent)
    return opponents
