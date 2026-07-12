from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class AccountProfile:
    display_name: str
    avatar_url: str
    elo: int
    rank_label: str
    win_rate: str
    streak: str
    bio: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "displayName": self.display_name,
            "avatarUrl": self.avatar_url,
            "elo": self.elo,
            "rankLabel": self.rank_label,
            "winRate": self.win_rate,
            "streak": self.streak,
            "bio": self.bio,
        }


@dataclass
class BetRecord:
    id: str
    title: str
    meta: str | None = None
    status: str = "open"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class FriendRequest:
    id: str
    requester_account_id: str
    target_account_id: str
    status: str = "pending"
    created_at: str = ""
    responded_at: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class PredictionGroup:
    id: str
    name: str
    owner_account_id: str
    created_at: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class GroupMembership:
    id: str
    group_id: str
    account_id: str
    joined_at: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class GroupInvite:
    id: str
    group_id: str
    inviter_account_id: str
    invitee_account_id: str
    status: str = "pending"
    created_at: str = ""
    responded_at: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class CustomPrediction:
    id: str
    group_id: str
    created_by_account_id: str
    question: str
    options: list[str]
    created_at: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class PredictionVote:
    id: str
    prediction_id: str
    account_id: str
    option: str
    created_at: str
    updated_at: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class SessionState:
    active_account_id: str | None = None


@dataclass
class UserAccount:
    id: str
    identifier: str
    password_hash: str
    salt: str
    created_at: str
    last_login_at: str
    status: str = "active"
    profile: AccountProfile = field(default_factory=lambda: AccountProfile(
        display_name="bethany_fox",
        avatar_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&h=256&fit=crop",
        elo=1768,
        rank_label="Prediction Captain",
        win_rate="68% win rate",
        streak="5 wins in a row",
        bio="Competitive predictor with a sharp eye for football, tennis, and esports.",
    ))
    bets: list[BetRecord] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "accountId": self.id,
            "identifier": self.identifier,
            "status": self.status,
            "createdAt": self.created_at,
            "lastLoginAt": self.last_login_at,
            "profile": self.profile.to_dict(),
            "bets": [bet.to_dict() for bet in self.bets],
        }


@dataclass
class TeamSnapshot:
    id: str
    name: str
    short_name: str
    crest_url: str
    venue: str
    squad: list[str] = field(default_factory=list)
    standing_position: int | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class MockMatch:
    id: str
    competition_code: str
    home_team_id: str
    home_team_name: str
    away_team_id: str
    away_team_name: str
    kickoff_label: str
    status: str = "scheduled"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class CompetitionSource:
    code: str
    external_code: str
    display_name: str
    sport: str
    sync_status: str = "never_synced"
    last_synced_at: str | None = None
    last_error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class MockDatasetSnapshot:
    competition_code: str
    version: int
    generated_at: str
    teams: list[TeamSnapshot] = field(default_factory=list)
    matches: list[MockMatch] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "competitionCode": self.competition_code,
            "version": self.version,
            "generatedAt": self.generated_at,
            "teams": [team.to_dict() for team in self.teams],
            "matches": [match.to_dict() for match in self.matches],
        }


def create_default_profile(display_name: str | None = None) -> AccountProfile:
    profile = AccountProfile(
        display_name=display_name or "bethany_fox",
        avatar_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&h=256&fit=crop",
        elo=1768,
        rank_label="Prediction Captain",
        win_rate="68% win rate",
        streak="5 wins in a row",
        bio="Competitive predictor with a sharp eye for football, tennis, and esports.",
    )
    return profile


def create_default_bets() -> list[BetRecord]:
    return [
        BetRecord(id="event-1", title="Real Madrid vs Barcelona", meta="LaLiga • Tonight 21:00"),
        BetRecord(id="event-2", title="Carlos Alcaraz v Sinner", meta="ATP Masters • Tomorrow 18:30"),
    ]


