from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class SessionState:
    active_tab: str = "home"
    hidden_friend_ids: set[str] = field(default_factory=set)


def create_default_session_state() -> SessionState:
    return SessionState()


def toggle_friend(state: SessionState, friend_id: str) -> SessionState:
    if friend_id in state.hidden_friend_ids:
        state.hidden_friend_ids.remove(friend_id)
    else:
        state.hidden_friend_ids.add(friend_id)
    return state
