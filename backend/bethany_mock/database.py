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
                friends_json TEXT NOT NULL,
                updated_at TEXT NOT NULL,
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