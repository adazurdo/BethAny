from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from ..mock_dataset_repository import get_competition_source, get_snapshot, list_competition_sources
from ..mock_dataset_service import sync_competition
from ..odds import generate_match_odds

router = APIRouter()


def _serialize_match(match) -> dict[str, Any]:
    return {**match.to_dict(), **generate_match_odds(match.id).to_dict()}


def _serialize_competition_source(source, snapshot=None) -> dict[str, Any]:
    """Adds `has_real_fixtures` so clients (the home screen) can prefer a competition that
    already has fixtures from football-data.org over one that doesn't have any published
    yet (e.g. a tournament whose fixtures aren't scheduled yet) — there is no synthetic
    fallback, so an empty snapshot just means "nothing to show yet"."""
    resolved_snapshot = snapshot if snapshot is not None else get_snapshot(source.code)
    has_real_fixtures = bool(resolved_snapshot and resolved_snapshot.matches)
    return {**source.to_dict(), "has_real_fixtures": has_real_fixtures}


@router.get("/mock/competitions")
def list_competitions() -> dict[str, Any]:
    competitions = [_serialize_competition_source(source) for source in list_competition_sources()]
    return {"competitions": competitions}


@router.get("/mock/competitions/{code}")
def get_competition(code: str) -> dict[str, Any]:
    source = get_competition_source(code)
    if source is None:
        raise HTTPException(status_code=404, detail="competicion no soportada")
    snapshot = get_snapshot(code)
    snapshot_payload = None
    if snapshot:
        snapshot_payload = {
            **snapshot.to_dict(),
            "matches": [_serialize_match(match) for match in snapshot.matches],
        }
    return {"source": _serialize_competition_source(source, snapshot), "snapshot": snapshot_payload}


@router.get("/mock/competitions/{code}/matches")
def get_competition_matches(code: str) -> dict[str, Any]:
    source = get_competition_source(code)
    if source is None:
        raise HTTPException(status_code=404, detail="competicion no soportada")
    snapshot = get_snapshot(code)
    return {
        "source": _serialize_competition_source(source, snapshot),
        "teams": [team.to_dict() for team in snapshot.teams] if snapshot else [],
        "matches": [_serialize_match(match) for match in snapshot.matches] if snapshot else [],
    }


@router.post("/mock/competitions/{code}/sync")
def sync_competition_route(code: str) -> dict[str, Any]:
    result = sync_competition(code)

    synced_snapshot = result.get("snapshot")
    snapshot_payload = None
    if synced_snapshot:
        snapshot_payload = {
            **synced_snapshot.to_dict(),
            "matches": [_serialize_match(match) for match in synced_snapshot.matches],
        }
    payload: dict[str, Any] = {
        "ok": result["ok"],
        "source": _serialize_competition_source(result["source"], synced_snapshot) if result.get("source") else None,
        "snapshot": snapshot_payload,
    }
    if not result["ok"]:
        payload["error"] = result["error"]
    # A failed external sync is an expected, handled outcome (fallback to last snapshot),
    # not a server error, so it is still reported with 200 and an "ok" flag in the body.
    return payload
