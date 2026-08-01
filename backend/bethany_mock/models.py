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
    beths: int = 500
    beths_last_grant_at: str = ""
    # -1 = not yet initialized; social_repository lazily sets it to elo.milestone_tier(elo)
    # on first use, so accounts with a manually-edited elo (pre-this-feature) or that never
    # settled a bet yet bootstrap from their actual current elo, not an assumed one.
    highest_elo_milestone: int = -1
    # Lifetime count of bets that moved Elo (used as the k_factor "games played" tier) and
    # today's running count against elo.DAILY_ELO_COUNTED_BETS, keyed by UTC date so it
    # resets automatically the first settlement of a new day.
    elo_bets_settled: int = 0
    elo_bets_counted_today: int = 0
    elo_bets_counted_date: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "displayName": self.display_name,
            "avatarUrl": self.avatar_url,
            "elo": self.elo,
            "beths": self.beths,
            "bethsLastGrantAt": self.beths_last_grant_at,
            "rankLabel": self.rank_label,
            "winRate": self.win_rate,
            "streak": self.streak,
            "bio": self.bio,
            # Exposed so the client can preview a bet's Elo impact before placing it
            # (k_factor tier + today's remaining Elo-counted-bets budget), without a
            # round trip: see frontend/data/eloPreview.ts, mirrors backend/bethany_mock/elo.py.
            "eloBetsSettled": self.elo_bets_settled,
            "eloBetsCountedToday": self.elo_bets_counted_today,
            "eloBetsCountedDate": self.elo_bets_counted_date,
        }


@dataclass
class BetRecord:
    id: str
    title: str
    meta: str | None = None
    status: str = "open"
    match_id: str | None = None
    outcome: str | None = None
    odds: float | None = None
    stake: float | None = None

    def to_dict(self) -> dict[str, Any]:
        """Snake_case storage shape (round-trips through `BetRecord(**bet.to_dict())`).

        The API-facing camelCase shape is built separately in `UserAccount.to_dict()`.
        """
        return asdict(self)

    def to_api_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "meta": self.meta,
            "status": self.status,
            "matchId": self.match_id,
            "outcome": self.outcome,
            "odds": self.odds,
            "stake": self.stake,
        }


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
    closes_at: str
    status: str = "open"
    resolved_option: str | None = None
    resolved_at: str | None = None

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
class PlacedBetSelection:
    match_id: str
    match_label: str
    outcome: str
    odds: float

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class PlacedBet:
    id: str
    account_id: str
    bet_type: str
    stake: float
    combined_odds: float
    potential_winnings: float
    created_at: str
    selections: list[PlacedBetSelection] = field(default_factory=list)
    status: str = "realizada"
    settled_at: str | None = None
    # The exact Elo change this bet applied to the account when it settled (None while
    # pending, and also None once settled if the account's daily Elo-counted cap was already
    # spent — the Beths payout still applies either way, see bet_repository).
    elo_delta: int | None = None
    # "Elo boost": a random 2-20% bonus rolled once at placement for combinadas with 3+
    # distinct match selections (see combinada_boost.py). None when not applicable. Purely a
    # payout bonus - `combined_odds` and Elo settlement math always use the true, unboosted
    # odds (see bet_repository._apply_elo_for_settlement); only `boosted_odds`/
    # `potential_winnings` reflect it.
    elo_boost_percent: float | None = None
    boosted_odds: float | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class FriendChallenge:
    id: str
    challenger_account_id: str
    opponent_account_id: str
    match_id: str
    match_label: str
    outcome: str
    status: str = "pending"
    created_at: str = ""
    responded_at: str | None = None
    settled_at: str | None = None
    result: str | None = None
    winner_account_id: str | None = None
    # "match" (tied to an official mock match, auto-settled) or "custom" (free-form bet
    # proposed by the challenger — title + options — resolved manually, see
    # challenge_repository.resolve_custom_challenge).
    challenge_type: str = "match"
    title: str | None = None
    options: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class EloMilestoneAward:
    id: str
    account_id: str
    tier: int
    bonus_beths: int
    awarded_at: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


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
            "bets": [bet.to_api_dict() for bet in self.bets],
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
    # Raw ISO timestamp the kickoff_label is formatted from ("" if the source didn't provide
    # one) - kept separately because settlement (bet_repository) needs to compare it against
    # "now", which a human-formatted label can't do.
    kickoff_at: str = ""
    # Non-null only for knockout/elimination stages (see mock_dataset.py) so the UI can call
    # out playoffs/finals; null means regular season / group stage, nothing special to show.
    stage_label: str | None = None
    # PandaScore-only: the specific league within a videogame (e.g. "LEC", "LCK", "LPL") so the
    # UI can group esports matches by league. Null for football-data.org matches, whose
    # CompetitionSource already IS a single league (LaLiga, Champions...).
    league_name: str | None = None
    league_image_url: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class CompetitionSource:
    code: str
    external_code: str
    display_name: str
    sport: str
    # Which external client `mock_dataset_service.sync_competition` should call: "football-data"
    # (football-data.org, competitions/leagues) or "pandascore" (esports, videogame slugs).
    provider: str = "football-data"
    sync_status: str = "never_synced"
    last_synced_at: str | None = None
    last_error: str | None = None
    # Real per-competition emblem (football-data.org's `emblem`). Esports game icons are static
    # assets the frontend renders directly, so this stays null for `pandascore` sources.
    icon_url: str | None = None

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
        beths=500,
    )
    return profile


def create_default_bets() -> list[BetRecord]:
    return [
        BetRecord(id="event-1", title="Real Madrid vs Barcelona", meta="LaLiga • Tonight 21:00"),
        BetRecord(id="event-2", title="Carlos Alcaraz v Sinner", meta="ATP Masters • Tomorrow 18:30"),
    ]


