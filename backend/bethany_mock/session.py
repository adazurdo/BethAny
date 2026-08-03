from __future__ import annotations

import secrets
from typing import Any

from fastapi import Depends, Header, HTTPException

from .account_repository import get_account_by_id
from .social_repository import list_unseen_elo_milestones

# In-memory session store: token -> account_id. Each login/register call gets its own
# token instead of sharing one process-wide "active account" — the previous single global
# session meant that as soon as a second account logged in from another device (the normal
# way to test the friends feature, which needs two real accounts), it silently replaced the
# first session, so requests from the first device kept acting as the second account and
# friend requests/state appeared to vanish. See specs/007-retos-entre-amigos and the friends
# feature bug report that traced back to this.
SESSIONS: dict[str, str] = {}


def _new_session_token() -> str:
    return secrets.token_hex(24)


def extract_bearer_token(authorization: str | None) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[len("Bearer ") :].strip()
    return token or None


def require_session(authorization: str | None = Header(default=None)) -> str:
    token = extract_bearer_token(authorization)
    account_id = SESSIONS.get(token) if token else None
    if account_id is None:
        raise HTTPException(status_code=401, detail="no active session")
    return account_id


def require_verified_session(account_id: str = Depends(require_session)) -> str:
    """Same as require_session, plus 403s for an account still pending email verification
    (009-verificacion-correo, FR-004) — used only on the 3 routes with economic/competitive
    stake (place bet, create challenge, accept challenge), never on login/resend/social/profile.
    """
    account = get_account_by_id(account_id)
    if account is not None and account.status == "pending_verification":
        raise HTTPException(status_code=403, detail="email verification required")
    return account_id


def _serialize_account(account) -> dict[str, Any]:
    return {**account.to_dict(), "unseenEloMilestones": list_unseen_elo_milestones(account.id)}
