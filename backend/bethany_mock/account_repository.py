from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid
from dataclasses import asdict, fields
from datetime import datetime, timedelta, timezone

from .database import dumps, fetch_one, initialize_database, loads, get_connection
from .models import AccountProfile, BetRecord, UserAccount, create_default_bets, create_default_profile

INCOME_AMOUNT_BETHS = 1
INCOME_INTERVAL_SECONDS = 300  # 1 Beth every 5 minutes

# Legacy AccountProfile JSON keys (from before the coins->Beths rename) mapped to their
# current field name, applied when reconstructing a profile from a persisted blob. Any
# other unrecognized legacy key (e.g. the old, since-removed `predictions_resolved`) is
# dropped silently and falls back to its current dataclass default.
_PROFILE_KEY_ALIASES = {
    "coins": "beths",
    "coins_last_grant_at": "beths_last_grant_at",
}


def _migrate_profile_payload(payload: dict) -> dict:
    migrated = dict(payload)
    for old_key, new_key in _PROFILE_KEY_ALIASES.items():
        if old_key in migrated:
            migrated.setdefault(new_key, migrated.pop(old_key))
    valid_fields = {f.name for f in fields(AccountProfile)}
    return {key: value for key, value in migrated.items() if key in valid_fields}


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def _grant_periodic_income(account: UserAccount) -> bool:
    """Lazily grant 1 Beth per full `INCOME_INTERVAL_SECONDS` elapsed since the last
    grant (see `specs/006-elo/research.md` Decision 7 — updated 2026-07-17 from a
    weekly lump sum to a continuous 5-minute drip, so the client can show a live
    countdown to the next Beth). Returns True if any Beths were granted.

    A brand-new account (empty `beths_last_grant_at`) just gets its baseline set to
    now, without an extra grant — the starter balance already covers it.
    """
    profile = account.profile
    now = datetime.now(timezone.utc)
    if not profile.beths_last_grant_at:
        profile.beths_last_grant_at = now.isoformat()
        return False

    try:
        last_grant = datetime.fromisoformat(profile.beths_last_grant_at)
    except ValueError:
        profile.beths_last_grant_at = now.isoformat()
        return False
    if last_grant.tzinfo is None:
        last_grant = last_grant.replace(tzinfo=timezone.utc)

    elapsed_seconds = (now - last_grant).total_seconds()
    intervals = int(elapsed_seconds // INCOME_INTERVAL_SECONDS)
    if intervals <= 0:
        return False

    profile.beths += intervals * INCOME_AMOUNT_BETHS
    # Advance by exactly the credited intervals (not to `now`), so leftover progress
    # toward the *next* Beth isn't discarded and the countdown stays accurate.
    profile.beths_last_grant_at = (last_grant + timedelta(seconds=intervals * INCOME_INTERVAL_SECONDS)).isoformat()
    return True


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
            INSERT INTO account_state (account_id, profile_json, bets_json, friends_json, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(account_id) DO UPDATE SET
                profile_json = excluded.profile_json,
                bets_json = excluded.bets_json,
                updated_at = excluded.updated_at
            """,
            (
                account.id,
                dumps(asdict(account.profile)),
                dumps([bet.to_dict() for bet in account.bets]),
                dumps([]),
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
        profile = AccountProfile(**_migrate_profile_payload(profile_payload))
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
    if row is None:
        return None
    account = _row_to_account(row)
    if _grant_periodic_income(account):
        _serialize_account(account)
    return account


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
    _grant_periodic_income(account)
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
