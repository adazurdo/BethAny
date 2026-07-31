from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

API_BASE_URL = "https://api.pandascore.co"
REQUEST_TIMEOUT_SECONDS = 10


class PandaScoreError(RuntimeError):
    """Raised when PandaScore cannot fulfil a request."""


def _get_token() -> str:
    token = os.getenv("PANDASCORE_API_KEY", "").strip()
    if not token:
        raise PandaScoreError(
            "PANDASCORE_API_KEY no esta configurado; define la variable de entorno con tu token gratuito (plan Fixtures Only) de app.pandascore.co"
        )
    return token


def _request(path: str, params: dict[str, Any] | None = None) -> Any:
    token = _get_token()
    query = {**(params or {}), "token": token}
    url = f"{API_BASE_URL}{path}?{urllib.parse.urlencode(query)}"
    request = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        raise PandaScoreError(f"PandaScore respondio {exc.code} para {path}") from exc
    except urllib.error.URLError as exc:
        raise PandaScoreError(f"No se pudo contactar PandaScore: {exc.reason}") from exc

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise PandaScoreError(f"Respuesta invalida de PandaScore para {path}") from exc


def fetch_upcoming_matches(videogame_slug: str, per_page: int = 25) -> list[dict[str, Any]]:
    payload = _request(f"/{videogame_slug}/matches/upcoming", {"per_page": per_page, "sort": "begin_at"})
    return payload if isinstance(payload, list) else []


def fetch_teams(videogame_slug: str, per_page: int = 100) -> list[dict[str, Any]]:
    payload = _request(f"/{videogame_slug}/teams", {"per_page": per_page})
    return payload if isinstance(payload, list) else []
