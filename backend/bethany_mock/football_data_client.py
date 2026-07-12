from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any

API_BASE_URL = "https://api.football-data.org/v4"
REQUEST_TIMEOUT_SECONDS = 10


class FootballDataError(RuntimeError):
    """Raised when football-data.org cannot fulfil a request."""


def _get_token() -> str:
    token = os.getenv("FOOTBALL_DATA_API_TOKEN", "").strip()
    if not token:
        raise FootballDataError(
            "FOOTBALL_DATA_API_TOKEN no esta configurado; define la variable de entorno con tu API key gratuita de football-data.org"
        )
    return token


def _request(path: str) -> dict[str, Any]:
    token = _get_token()
    request = urllib.request.Request(f"{API_BASE_URL}{path}", headers={"X-Auth-Token": token})
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        raise FootballDataError(f"football-data.org respondio {exc.code} para {path}") from exc
    except urllib.error.URLError as exc:
        raise FootballDataError(f"No se pudo contactar football-data.org: {exc.reason}") from exc

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise FootballDataError(f"Respuesta invalida de football-data.org para {path}") from exc


def fetch_competition_teams(external_code: str) -> list[dict[str, Any]]:
    payload = _request(f"/competitions/{external_code}/teams")
    teams = payload.get("teams")
    return teams if isinstance(teams, list) else []


def fetch_competition_standings(external_code: str) -> list[dict[str, Any]]:
    payload = _request(f"/competitions/{external_code}/standings")
    standings = payload.get("standings")
    return standings if isinstance(standings, list) else []


def fetch_competition_matches(external_code: str) -> list[dict[str, Any]]:
    payload = _request(f"/competitions/{external_code}/matches")
    matches = payload.get("matches")
    return matches if isinstance(matches, list) else []
