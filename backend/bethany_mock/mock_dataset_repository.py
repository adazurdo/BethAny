from __future__ import annotations

from datetime import datetime, timezone

from .database import dumps, fetch_one, get_connection, initialize_database, loads
from .models import CompetitionSource, MockDatasetSnapshot, MockMatch, TeamSnapshot

# Football competitions are sourced from football-data.org; esports ones from PandaScore
# (external_code holds each provider's own identifier: a football-data.org competition code,
# or a PandaScore videogame slug). Other sports keep their existing static mocks for now.
CONFIGURED_COMPETITIONS: list[CompetitionSource] = [
    CompetitionSource(code="mundial-2026", external_code="WC", display_name="Mundial 2026", sport="Football", provider="football-data"),
    CompetitionSource(code="laliga", external_code="PD", display_name="LaLiga", sport="Football", provider="football-data"),
    CompetitionSource(code="champions", external_code="CL", display_name="Champions", sport="Football", provider="football-data"),
    CompetitionSource(code="cs2", external_code="csgo", display_name="Counter-Strike 2", sport="Esports", provider="pandascore"),
    CompetitionSource(code="lol", external_code="lol", display_name="League of Legends", sport="Esports", provider="pandascore"),
    CompetitionSource(code="dota2", external_code="dota2", display_name="Dota 2", sport="Esports", provider="pandascore"),
    CompetitionSource(code="valorant", external_code="valorant", display_name="Valorant", sport="Esports", provider="pandascore"),
]


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def initialize_repository() -> None:
    initialize_database()
    with get_connection() as connection:
        for source in CONFIGURED_COMPETITIONS:
            connection.execute(
                """
                INSERT INTO competition_sources (code, external_code, display_name, sport, provider, sync_status)
                VALUES (?, ?, ?, ?, ?, 'never_synced')
                ON CONFLICT(code) DO NOTHING
                """,
                (source.code, source.external_code, source.display_name, source.sport, source.provider),
            )
        connection.commit()


def _row_to_source(row) -> CompetitionSource:
    return CompetitionSource(
        code=row["code"],
        external_code=row["external_code"],
        display_name=row["display_name"],
        sport=row["sport"],
        provider=row["provider"],
        sync_status=row["sync_status"],
        last_synced_at=row["last_synced_at"],
        last_error=row["last_error"],
    )


def list_competition_sources() -> list[CompetitionSource]:
    initialize_repository()
    with get_connection() as connection:
        rows = connection.execute("SELECT * FROM competition_sources ORDER BY display_name").fetchall()
    return [_row_to_source(row) for row in rows]


def get_competition_source(code: str) -> CompetitionSource | None:
    initialize_repository()
    with get_connection() as connection:
        row = fetch_one(connection, "SELECT * FROM competition_sources WHERE code = ?", (code,))
    return _row_to_source(row) if row else None


def get_snapshot(code: str) -> MockDatasetSnapshot | None:
    initialize_repository()
    with get_connection() as connection:
        row = fetch_one(connection, "SELECT * FROM mock_dataset_snapshots WHERE competition_code = ?", (code,))
    if row is None:
        return None
    teams = [TeamSnapshot(**team) for team in loads(row["teams_json"])]
    matches = [MockMatch(**match) for match in loads(row["matches_json"])]
    return MockDatasetSnapshot(
        competition_code=code,
        version=row["version"],
        generated_at=row["generated_at"],
        teams=teams,
        matches=matches,
    )


def save_snapshot(code: str, teams: list[TeamSnapshot], matches: list[MockMatch]) -> MockDatasetSnapshot:
    initialize_repository()
    existing = get_snapshot(code)
    next_version = existing.version + 1 if existing else 1
    generated_at = _utcnow()

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO mock_dataset_snapshots (competition_code, version, generated_at, teams_json, matches_json)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(competition_code) DO UPDATE SET
                version = excluded.version,
                generated_at = excluded.generated_at,
                teams_json = excluded.teams_json,
                matches_json = excluded.matches_json
            """,
            (code, next_version, generated_at, dumps([team.to_dict() for team in teams]), dumps([match.to_dict() for match in matches])),
        )
        connection.execute(
            "UPDATE competition_sources SET sync_status = 'synced', last_synced_at = ?, last_error = NULL WHERE code = ?",
            (generated_at, code),
        )
        connection.commit()

    return MockDatasetSnapshot(competition_code=code, version=next_version, generated_at=generated_at, teams=teams, matches=matches)


def find_match_by_id(match_id: str) -> tuple[CompetitionSource, MockMatch] | None:
    """Scan every configured competition's snapshot for a match id.

    Only a handful of competitions are configured (see `CONFIGURED_COMPETITIONS`),
    so a linear scan is simple and fast enough for this mock stage.
    """
    for source in list_competition_sources():
        snapshot = get_snapshot(source.code)
        if snapshot is None:
            continue
        for match in snapshot.matches:
            if match.id == match_id:
                return source, match
    return None


def mark_sync_failure(code: str, error: str) -> CompetitionSource:
    initialize_repository()
    status = "stale" if get_snapshot(code) is not None else "error"
    with get_connection() as connection:
        connection.execute(
            "UPDATE competition_sources SET sync_status = ?, last_error = ? WHERE code = ?",
            (status, error, code),
        )
        connection.commit()

    source = get_competition_source(code)
    assert source is not None
    return source
