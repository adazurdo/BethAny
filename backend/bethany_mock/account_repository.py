from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid
from dataclasses import asdict
from datetime import datetime, timezone

from .database import dumps, fetch_one, initialize_database, loads, get_connection
from .models import AccountProfile, BetRecord, UserAccount, create_default_bets, create_default_profile


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def _hash_password(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), 120_000).hex()


def _verify_password(password: str, salt: str, password_hash: str) -> bool:
    candidate = _hash_password(password, salt)
    return hmac.compare_digest(candidate, password_hash)


def _serialize_account(account: UserAccount) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE accounts
            SET identifier = ?, password_hash = ?, salt = ?, last_login_at = ?, status = ?
            WHERE id = ?
            """,
            (account.identifier, account.password_hash, account.salt, account.last_login_at, account.status, account.id),
        )
        connection.execute(
            """
            INSERT INTO account_state (account_id, profile_json, bets_json, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(account_id) DO UPDATE SET
                profile_json = excluded.profile_json,
                bets_json = excluded.bets_json,
                updated_at = excluded.updated_at
            """,
            (
                account.id,
                dumps(asdict(account.profile)),
                dumps([bet.to_dict() for bet in account.bets]),
                _utcnow(),
            ),
        )
        connection.commit()


def _row_to_account(row) -> UserAccount:
    with get_connection() as connection:
        state = fetch_one(connection, "SELECT * FROM account_state WHERE account_id = ?", (row["id"],))
    profile = create_default_profile(row["identifier"])
    bets = create_default_bets()
    if state:
        profile_payload = loads(state["profile_json"])
        bets_payload = loads(state["bets_json"])
        profile = AccountProfile(**profile_payload)
        bets = [BetRecord(**bet) for bet in bets_payload]
    return UserAccount(
        id=row["id"],
        identifier=row["identifier"],
        password_hash=row["password_hash"],
        salt=row["salt"],
        created_at=row["created_at"],
        last_login_at=row["last_login_at"],
        status=row["status"],
        profile=profile,
        bets=bets,
    )


def initialize_repository() -> None:
    initialize_database()


def get_account_by_id(account_id: str) -> UserAccount | None:
    with get_connection() as connection:
        row = fetch_one(connection, "SELECT * FROM accounts WHERE id = ?", (account_id,))
    return _row_to_account(row) if row else None


def get_account_by_identifier(identifier: str) -> UserAccount | None:
    with get_connection() as connection:
        row = fetch_one(connection, "SELECT * FROM accounts WHERE identifier = ?", (identifier.lower(),))
    return _row_to_account(row) if row else None


def register_account(identifier: str, password: str, display_name: str | None = None) -> UserAccount:
    initialize_repository()
    cleaned_identifier = identifier.strip().lower()
    if not cleaned_identifier:
        raise ValueError("identifier is required")
    if len(password) < 4:
        raise ValueError("password is too short")
    if get_account_by_identifier(cleaned_identifier) is not None:
        raise ValueError("identifier already exists")

    salt = secrets.token_hex(16)
    now = _utcnow()
    account_id = _new_id("acct")
    account = UserAccount(
        id=account_id,
        identifier=cleaned_identifier,
        password_hash=_hash_password(password, salt),
        salt=salt,
        created_at=now,
        last_login_at=now,
        profile=create_default_profile(display_name or cleaned_identifier),
        bets=create_default_bets(),
    )

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO accounts (id, identifier, password_hash, salt, created_at, last_login_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (account.id, account.identifier, account.password_hash, account.salt, account.created_at, account.last_login_at, account.status),
        )
        connection.commit()

    _serialize_account(account)
    return account


def authenticate_account(identifier: str, password: str) -> UserAccount:
    initialize_repository()
    account = get_account_by_identifier(identifier.strip().lower())
    if account is None:
        raise LookupError("account not found")
    if not _verify_password(password, account.salt, account.password_hash):
        raise PermissionError("invalid credentials")

    account.last_login_at = _utcnow()
    _serialize_account(account)
    return account


def save_account_state(account: UserAccount) -> UserAccount:
    initialize_repository()
    _serialize_account(account)
    return account


def replace_account_state(account_id: str, *, profile: AccountProfile | None = None, bets: list[BetRecord] | None = None) -> UserAccount:
    account = get_account_by_id(account_id)
    if account is None:
        raise LookupError("account not found")
    if profile is not None:
        account.profile = profile
    if bets is not None:
        account.bets = bets
    return save_account_state(account)
