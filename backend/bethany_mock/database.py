from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Iterable


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data"
DATABASE_PATH = DATA_DIR / "bethany.sqlite3"


def get_connection() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database() -> None:
    with get_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS accounts (
                id TEXT PRIMARY KEY,
                identifier TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_login_at TEXT NOT NULL,
                status TEXT NOT NULL
            )
        """)
        connection.execute("""
            CREATE TABLE IF NOT EXISTS account_state (
                account_id TEXT PRIMARY KEY,
                profile_json TEXT NOT NULL,
                bets_json TEXT NOT NULL,
                friends_json TEXT NOT NULL DEFAULT '[]',
                updated_at TEXT NOT NULL,
                FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
            )
        """)
        connection.execute("""
            CREATE TABLE IF NOT EXISTS friend_requests (
                id TEXT PRIMARY KEY,
                requester_account_id TEXT NOT NULL,
                target_account_id TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL,
                responded_at TEXT,
                FOREIGN KEY(requester_account_id) REFERENCES accounts(id) ON DELETE CASCADE,
                FOREIGN KEY(target_account_id) REFERENCES accounts(id) ON DELETE CASCADE
            )
        """)
        connection.execute("""
            CREATE TABLE IF NOT EXISTS competition_sources (
                code TEXT PRIMARY KEY,
                external_code TEXT NOT NULL,
                display_name TEXT NOT NULL,
                sport TEXT NOT NULL,
                provider TEXT NOT NULL DEFAULT 'football-data',
                sync_status TEXT NOT NULL DEFAULT 'never_synced',
                last_synced_at TEXT,
                last_error TEXT
            )
        """)
        connection.execute("""
            CREATE TABLE IF NOT EXISTS mock_dataset_snapshots (
                competition_code TEXT PRIMARY KEY,
                version INTEGER NOT NULL,
                generated_at TEXT NOT NULL,
                teams_json TEXT NOT NULL,
                matches_json TEXT NOT NULL,
                FOREIGN KEY(competition_code) REFERENCES competition_sources(code) ON DELETE CASCADE
            )
        """)
        connection.execute("""
            CREATE TABLE IF NOT EXISTS prediction_groups (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                owner_account_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(owner_account_id) REFERENCES accounts(id) ON DELETE CASCADE
            )
        """)
        connection.execute("""
            CREATE TABLE IF NOT EXISTS group_memberships (
                id TEXT PRIMARY KEY,
                group_id TEXT NOT NULL,
                account_id TEXT NOT NULL,
                joined_at TEXT NOT NULL,
                UNIQUE(group_id, account_id),
                FOREIGN KEY(group_id) REFERENCES prediction_groups(id) ON DELETE CASCADE,
                FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
            )
        """)
        connection.execute("""
            CREATE TABLE IF NOT EXISTS group_invites (
                id TEXT PRIMARY KEY,
                group_id TEXT NOT NULL,
                inviter_account_id TEXT NOT NULL,
                invitee_account_id TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL,
                responded_at TEXT,
                FOREIGN KEY(group_id) REFERENCES prediction_groups(id) ON DELETE CASCADE,
                FOREIGN KEY(inviter_account_id) REFERENCES accounts(id) ON DELETE CASCADE,
                FOREIGN KEY(invitee_account_id) REFERENCES accounts(id) ON DELETE CASCADE
            )
        """)
        connection.execute("""
            CREATE TABLE IF NOT EXISTS custom_predictions (
                id TEXT PRIMARY KEY,
                group_id TEXT NOT NULL,
                created_by_account_id TEXT NOT NULL,
                question TEXT NOT NULL,
                options_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                closes_at TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'open',
                resolved_option TEXT,
                resolved_at TEXT,
                FOREIGN KEY(group_id) REFERENCES prediction_groups(id) ON DELETE CASCADE,
                FOREIGN KEY(created_by_account_id) REFERENCES accounts(id) ON DELETE CASCADE
            )
        """)
        connection.execute("""
            CREATE TABLE IF NOT EXISTS notification_seen (
                account_id TEXT NOT NULL,
                mark_key TEXT NOT NULL,
                seen_at TEXT NOT NULL,
                PRIMARY KEY (account_id, mark_key),
                FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
            )
        """)
        connection.execute("""
            CREATE TABLE IF NOT EXISTS placed_bets (
                id TEXT PRIMARY KEY,
                account_id TEXT NOT NULL,
                bet_type TEXT NOT NULL,
                stake REAL NOT NULL,
                combined_odds REAL NOT NULL,
                potential_winnings REAL NOT NULL,
                selections_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
            )
        """)
        connection.execute("""
            CREATE TABLE IF NOT EXISTS prediction_votes (
                id TEXT PRIMARY KEY,
                prediction_id TEXT NOT NULL,
                account_id TEXT NOT NULL,
                option TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(prediction_id, account_id),
                FOREIGN KEY(prediction_id) REFERENCES custom_predictions(id) ON DELETE CASCADE,
                FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
            )
        """)
        connection.execute("""
            CREATE TABLE IF NOT EXISTS friend_challenges (
                id TEXT PRIMARY KEY,
                challenger_account_id TEXT NOT NULL,
                opponent_account_id TEXT NOT NULL,
                challenge_type TEXT NOT NULL DEFAULT 'match',
                match_id TEXT NOT NULL,
                match_label TEXT NOT NULL,
                title TEXT,
                options_json TEXT NOT NULL DEFAULT '[]',
                outcome TEXT NOT NULL,
                stake INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL,
                responded_at TEXT,
                settled_at TEXT,
                result TEXT,
                winner_account_id TEXT,
                FOREIGN KEY(challenger_account_id) REFERENCES accounts(id) ON DELETE CASCADE,
                FOREIGN KEY(opponent_account_id) REFERENCES accounts(id) ON DELETE CASCADE
            )
        """)
        connection.execute("""
            CREATE TABLE IF NOT EXISTS match_results (
                match_id TEXT PRIMARY KEY,
                outcome TEXT NOT NULL,
                resolved_at TEXT NOT NULL
            )
        """)
        connection.execute("""
            CREATE TABLE IF NOT EXISTS elo_milestone_awards (
                id TEXT PRIMARY KEY,
                account_id TEXT NOT NULL,
                tier INTEGER NOT NULL,
                bonus_beths INTEGER NOT NULL,
                awarded_at TEXT NOT NULL,
                FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
            )
        """)
        # `placed_bets` was created above without `status`/`settled_at` columns (005-combinada
        # only ever relied on the `PlacedBet` dataclass's in-memory default for status, never
        # persisting or querying it) — both are added here for the settlement work in 006-elo.
        _ensure_column(connection, "placed_bets", "status", "TEXT NOT NULL DEFAULT 'realizada'")
        _ensure_column(connection, "placed_bets", "settled_at", "TEXT")
        # NULL while pending; once settled, the exact Elo change this bet applied to the
        # account (can be 0/None even when settled if the daily Elo-counted cap was already
        # spent - see bet_repository._apply_elo_for_settlement).
        _ensure_column(connection, "placed_bets", "elo_delta", "INTEGER")
        # "Elo boost" bonus (2-20%) rolled for combinadas with 3+ distinct match selections -
        # NULL when not applicable. See bet_repository.place_bet / combinada_boost.py.
        _ensure_column(connection, "placed_bets", "elo_boost_percent", "REAL")
        _ensure_column(connection, "placed_bets", "boosted_odds", "REAL")
        _ensure_column(connection, "account_state", "friends_json", "TEXT NOT NULL DEFAULT '[]'")
        _rename_column(connection, "elo_milestone_awards", "bonus_coins", "bonus_beths")
        # `friend_challenges` originally only supported match challenges (007-retos-entre-amigos);
        # these three columns add the "custom" (title + options, manually resolved) variant.
        _ensure_column(connection, "friend_challenges", "challenge_type", "TEXT NOT NULL DEFAULT 'match'")
        _ensure_column(connection, "friend_challenges", "title", "TEXT")
        _ensure_column(connection, "friend_challenges", "options_json", "TEXT NOT NULL DEFAULT '[]'")
        # `competition_sources` originally only ever synced from football-data.org; PandaScore
        # (esports) is a second provider added later, so existing rows default to the original one.
        _ensure_column(connection, "competition_sources", "provider", "TEXT NOT NULL DEFAULT 'football-data'")
        # Real per-competition emblem (football-data.org only for now; esports game icons are
        # static assets handled entirely in the frontend, no per-competition source data for them).
        _ensure_column(connection, "competition_sources", "icon_url", "TEXT")
        connection.commit()


def _ensure_column(connection: sqlite3.Connection, table: str, column: str, column_type: str) -> None:
    """Add `column` to `table` if it doesn't exist yet.

    sqlite has no `ADD COLUMN IF NOT EXISTS`, and `CREATE TABLE IF NOT EXISTS`
    (used everywhere else in this file) never alters an already-existing table —
    so a real schema change here needs this explicit, idempotent migration.
    """
    existing_columns = {row["name"] for row in connection.execute(f"PRAGMA table_info({table})")}
    if column not in existing_columns:
        connection.execute(f"ALTER TABLE {table} ADD COLUMN {column} {column_type}")


def _rename_column(connection: sqlite3.Connection, table: str, old_name: str, new_name: str) -> None:
    """Rename `old_name` to `new_name` in `table` if the old column still exists."""
    existing_columns = {row["name"] for row in connection.execute(f"PRAGMA table_info({table})")}
    if old_name in existing_columns and new_name not in existing_columns:
        connection.execute(f"ALTER TABLE {table} RENAME COLUMN {old_name} TO {new_name}")


def dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def loads(value: str) -> Any:
    return json.loads(value)


def fetch_one(connection: sqlite3.Connection, query: str, parameters: Iterable[Any]) -> sqlite3.Row | None:
    cursor = connection.execute(query, tuple(parameters))
    return cursor.fetchone()