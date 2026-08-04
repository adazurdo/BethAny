from __future__ import annotations

import hashlib
import hmac
import re
import secrets
import uuid
from dataclasses import asdict, fields
from datetime import datetime, timedelta, timezone

from .database import dumps, fetch_one, initialize_database, loads, get_connection
from .email_sender import send_verification_email
from .models import AccountProfile, BetRecord, UserAccount, create_default_bets, create_default_profile

INCOME_AMOUNT_BETHS = 5
INCOME_INTERVAL_SECONDS = 300  # 5 Beths every 5 minutes

# 009-verificacion-correo constants
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
VERIFICATION_CODE_EXPIRY_HOURS = 24
VERIFICATION_RESEND_COOLDOWN_SECONDS = 60
MAX_VERIFICATION_ATTEMPTS = 5


class ConflictError(RuntimeError):
    """Raised when an operation would create/require a state conflicting with the current one.

    Defined here (rather than in social_repository, which already depends on this module)
    so account_repository itself can raise it for email-verification conflicts without a
    circular import; social_repository imports and re-exports the same class below.
    """

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
    """Lazily grant `INCOME_AMOUNT_BETHS` per full `INCOME_INTERVAL_SECONDS` elapsed since the
    last grant (see `specs/006-elo/research.md` Decision 7 — updated 2026-07-17 from a weekly
    lump sum to a continuous 5-minute drip, so the client can show a live countdown to the next
    grant; the per-grant amount was later raised from 1 to 5 once bets stopped paying out any
    beths profit, so passive income is the only way a spent-down balance recovers). Returns
    True if any Beths were granted.

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


def _generate_verification_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _hash_verification_code(code: str, salt: str) -> str:
    # Same pbkdf2+salt mechanism as _hash_password (Decision 3) — never store the code in
    # the clear, reusing the account's existing salt instead of adding a 4th column for it.
    return _hash_password(code, salt)


def _verify_verification_code(code: str, salt: str, code_hash: str) -> bool:
    return hmac.compare_digest(_hash_verification_code(code, salt), code_hash)


def _verification_code_expired(account: UserAccount) -> bool:
    if not account.verification_code_sent_at:
        return True
    sent_at = datetime.fromisoformat(account.verification_code_sent_at)
    if sent_at.tzinfo is None:
        sent_at = sent_at.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - sent_at > timedelta(hours=VERIFICATION_CODE_EXPIRY_HOURS)


def _delete_account(account_id: str) -> None:
    """Delete an abandoned, never-verified account so its `identifier` can be reclaimed
    (FR-012). Relies on the `ON DELETE CASCADE` foreign keys already declared in
    database.py (account_state, friend_requests, group_memberships, etc.) — safe now that
    `get_connection()` turns on `PRAGMA foreign_keys`.
    """
    with get_connection() as connection:
        connection.execute("DELETE FROM accounts WHERE id = ?", (account_id,))
        connection.commit()


def _serialize_account(account: UserAccount) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE accounts
            SET identifier = ?, password_hash = ?, salt = ?, last_login_at = ?, status = ?,
                verification_code_hash = ?, verification_code_sent_at = ?, verification_attempts_remaining = ?
            WHERE id = ?
            """,
            (
                account.identifier,
                account.password_hash,
                account.salt,
                account.last_login_at,
                account.status,
                account.verification_code_hash,
                account.verification_code_sent_at,
                account.verification_attempts_remaining,
                account.id,
            ),
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
        verification_code_hash=row["verification_code_hash"],
        verification_code_sent_at=row["verification_code_sent_at"],
        verification_attempts_remaining=row["verification_attempts_remaining"],
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


def list_all_accounts() -> list[UserAccount]:
    initialize_repository()
    with get_connection() as connection:
        rows = connection.execute("SELECT * FROM accounts WHERE status = 'active'").fetchall()
    return [_row_to_account(row) for row in rows]


def register_account(identifier: str, password: str, display_name: str | None = None) -> UserAccount:
    initialize_repository()
    cleaned_identifier = identifier.strip().lower()
    if not cleaned_identifier:
        raise ValueError("identifier is required")
    if not _EMAIL_RE.match(cleaned_identifier):
        raise ValueError("identifier must be a valid email address")
    if len(password) < 4:
        raise ValueError("password is too short")

    existing = get_account_by_identifier(cleaned_identifier)
    if existing is not None:
        # FR-012: an abandoned, never-verified registration doesn't permanently squat the
        # identifier — once its code has expired, a new registration reclaims it.
        if existing.status == "pending_verification" and _verification_code_expired(existing):
            _delete_account(existing.id)
        else:
            raise ValueError("identifier already exists")

    salt = secrets.token_hex(16)
    now = _utcnow()
    account_id = _new_id("acct")
    verification_code = _generate_verification_code()
    account = UserAccount(
        id=account_id,
        identifier=cleaned_identifier,
        password_hash=_hash_password(password, salt),
        salt=salt,
        created_at=now,
        last_login_at=now,
        status="pending_verification",
        verification_code_hash=_hash_verification_code(verification_code, salt),
        verification_code_sent_at=now,
        verification_attempts_remaining=MAX_VERIFICATION_ATTEMPTS,
        profile=create_default_profile(display_name or cleaned_identifier),
        bets=create_default_bets(),
    )

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO accounts (
                id, identifier, password_hash, salt, created_at, last_login_at, status,
                verification_code_hash, verification_code_sent_at, verification_attempts_remaining
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                account.id,
                account.identifier,
                account.password_hash,
                account.salt,
                account.created_at,
                account.last_login_at,
                account.status,
                account.verification_code_hash,
                account.verification_code_sent_at,
                account.verification_attempts_remaining,
            ),
        )
        connection.commit()

    _serialize_account(account)
    send_verification_email(cleaned_identifier, verification_code)
    return account


def delete_own_account(account_id: str, password: str) -> None:
    """Permanently delete `account_id` after confirming `password` (a valid session alone
    isn't enough for an irreversible action — this guards against e.g. a shared/unlocked
    device). Cascades through every related table via `_delete_account`."""
    account = get_account_by_id(account_id)
    if account is None:
        raise LookupError("account not found")
    if not _verify_password(password, account.salt, account.password_hash):
        raise PermissionError("invalid credentials")
    _delete_account(account_id)


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


def verify_email_code(account_id: str, code: str) -> UserAccount:
    account = get_account_by_id(account_id)
    if account is None:
        raise LookupError("account not found")
    if account.status != "pending_verification":
        raise ConflictError("account already verified")
    if account.verification_attempts_remaining <= 0:
        raise ConflictError("too many attempts, request a resend")
    if _verification_code_expired(account):
        raise ValueError("verification code expired, request a new one")
    if not account.verification_code_hash or not _verify_verification_code(code, account.salt, account.verification_code_hash):
        account.verification_attempts_remaining -= 1
        _serialize_account(account)
        raise ValueError("invalid verification code")

    account.status = "active"
    account.verification_code_hash = None
    account.verification_code_sent_at = None
    account.verification_attempts_remaining = MAX_VERIFICATION_ATTEMPTS
    _serialize_account(account)
    return account


def resend_verification_code(account_id: str) -> UserAccount:
    account = get_account_by_id(account_id)
    if account is None:
        raise LookupError("account not found")
    if account.status != "pending_verification":
        raise ConflictError("account already verified")
    if account.verification_code_sent_at:
        sent_at = datetime.fromisoformat(account.verification_code_sent_at)
        if sent_at.tzinfo is None:
            sent_at = sent_at.replace(tzinfo=timezone.utc)
        elapsed = (datetime.now(timezone.utc) - sent_at).total_seconds()
        if elapsed < VERIFICATION_RESEND_COOLDOWN_SECONDS:
            remaining = int(VERIFICATION_RESEND_COOLDOWN_SECONDS - elapsed)
            raise ConflictError(f"resend cooldown active, try again in {remaining}s")

    code = _generate_verification_code()
    account.verification_code_hash = _hash_verification_code(code, account.salt)
    account.verification_code_sent_at = _utcnow()
    account.verification_attempts_remaining = MAX_VERIFICATION_ATTEMPTS
    _serialize_account(account)
    send_verification_email(account.identifier, code)
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
