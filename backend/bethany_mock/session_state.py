from __future__ import annotations

from .models import SessionState


def create_default_session_state() -> SessionState:
    return SessionState()


def set_active_account(state: SessionState, account_id: str | None) -> SessionState:
    state.active_account_id = account_id
    return state
