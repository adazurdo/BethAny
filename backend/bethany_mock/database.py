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
        connection.commit()


def dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def loads(value: str) -> Any:
    return json.loads(value)


def fetch_one(connection: sqlite3.Connection, query: str, parameters: Iterable[Any]) -> sqlite3.Row | None:
    cursor = connection.execute(query, tuple(parameters))
    return cursor.fetchone()