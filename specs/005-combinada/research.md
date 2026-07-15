# Research: Combinada (Apuestas Combinadas)

## Decision 1: 1X2 odds are a pure computed function, not new stored state

- **Decision**: Add `backend/bethany_mock/odds.py` with `generate_match_odds(match_id: str) -> MatchOdds` (a pure function seeded by hashing `match_id`, producing three plausible decimal odds for local/draw/away that sum to a realistic overround). It is called wherever a match is serialized in an API response (`GET /mock/competitions/{code}/matches`, `GET /mock/competitions/{code}`) and wherever a bet is placed (`POST /bets/place`), instead of being stored as new fields on `MockMatch` or a new column in `mock_dataset_snapshots`.
- **Rationale**: `MockMatch` instances are stored as JSON inside `mock_dataset_snapshots.matches_json` (see `mock_dataset_repository.py: get_snapshot`/`save_snapshot`) and reconstructed with `MockMatch(**match)`. Adding odds as a stored field would either require a schema/version migration for already-persisted snapshots or leave old snapshots with stale/missing odds until their next sync. Computing odds purely from `match.id` sidesteps both problems entirely: odds are always present, always consistent for a given match id, and require zero changes to `database.py`'s existing tables — directly satisfying the "no migration framework" constraint already documented in `004-social/research.md` Decision 12.
- **Alternatives considered**:
  - Persist odds as new `MockMatch` fields with defaults: rejected because it still leaves already-synced snapshots inconsistent until re-synced, for no benefit over a pure function.
  - Store odds in a new `match_odds` table keyed by match id: rejected as unnecessary — nothing about odds needs its own row lifecycle (create/update/delete) independent of the match itself; a pure function is simpler and satisfies Simplicity.

## Decision 2: Betting is scoped to backend-tracked football matches

- **Decision**: The 1X2 market, selection UI, and bet placement apply only to matches sourced from `003-datos-mock` (`MockMatch` / `CompetitionSource`, reached via `fetchMockCompetitionMatches`). The static, frontend-only mock events for other sports (`frontend/data/mockData.ts`, rendered by `matches/index.tsx` when a competition has no football-data.org backing) are out of scope for this feature.
- **Rationale**: Server-side validation (FR-017, FR-018) requires looking up a real match by id and checking its live status. Only football matches have that backend representation today; the static events in `mockData.ts` have no id the server recognizes and no status field at all. Building a parallel, ungoverned "fake odds for fake events" path would violate FR-018's server-side status check and add complexity for events that were never meant to be real bettable entities in this phase.
- **Alternatives considered**:
  - Also fabricate client-only odds/placement for static mock events: rejected because it cannot satisfy FR-017/FR-018 (no server match to validate against) and would silently diverge from every other bettable match's guarantees.

## Decision 3: New `placed_bets` table, one row per placed bet

- **Decision**: Add a single `placed_bets` table: `id`, `account_id`, `bet_type` (`simple` | `combinada`), `stake`, `combined_odds`, `potential_winnings`, `selections_json` (list of `{matchId, matchLabel, outcome, odds}`), `created_at`. A "Simple" placement with N selections creates N independent rows (each with exactly one entry in `selections_json`); a "Combinada" placement creates exactly one row with 2+ entries.
- **Rationale**: This mirrors the JSON-blob-inside-a-row pattern `database.py` already uses for `mock_dataset_snapshots` (`teams_json`/`matches_json`) and `custom_predictions` (options stored as JSON), which the project has already accepted as "simple enough" for collections that are always read/written as a whole. A fully normalized `placed_bet_selections` table would need a join for every read of "Mis apuestas" with no behavioral benefit, since selections are never queried independently of their parent bet.
- **Alternatives considered**:
  - Normalized child table `placed_bet_selections` with a foreign key: rejected as unnecessary indirection — selections are never filtered, updated, or joined independently of their `PlacedBet`.
  - Reuse the existing `account_state.bets_json` column (today's `BetRecord`/`bets`) for placed bets too: rejected because that column is the *draft* boleto, replaced wholesale on every `PUT /account/me` (see `002-base-de-datos` and the code discrepancy it left behind); overloading it for placed history would mean a client bug or race in a draft save could destroy bet history. A dedicated table keeps placement an explicit, additive server action.

## Decision 4: The draft boleto keeps using `BetSlipContext` + `account.bets`

- **Decision**: The in-progress boleto (selections not yet placed) continues to live in `BetSlipContext` on the frontend, synced to `account.bets` via the existing `PUT /account/me` path. The `Selection` shape (today `{id, title, meta}`) gains `matchId`, `outcome` (`local`/`empate`/`visitante`), and `odds`, but the storage mechanism is unchanged.
- **Rationale**: The draft boleto is single-account, replace-the-whole-list state — exactly what `PUT /account/me` already does well (as established by `002-base-de-datos` and reused as-is by `004-social`'s bets field). Placing a bet is the one moment that needs new, validated, server-owned behavior (Decision 3); building the draft itself does not.
- **Alternatives considered**:
  - Move the draft boleto server-side into its own table too: rejected — it adds a second persistence path for state that already round-trips correctly through the account blob, with no new invariant that needs enforcing before the bet is actually placed.

## Decision 5: `POST /bets/place` recomputes odds and re-validates match status server-side

- **Decision**: The placement endpoint accepts `matchId` + `outcome` (+ per-selection `stake` for Simple, or a shared `stake` for Combinada) but ignores any odds the client sends. It looks up each match via a new `find_match_by_id` helper, calls `generate_match_odds` itself, and rejects the whole request if any match's status is not open for betting.
- **Rationale**: Same reasoning `004-social/research.md` Decision 3 used for friend/group actions — invariants that matter (correct odds, match still open) must be enforced by the server, not assumed from client state that could be stale (the user built the boleto minutes ago; the match could have kicked off since). Because odds are deterministic (Decision 1), recomputing them server-side is trivial and guarantees the two can never drift.
- **Alternatives considered**:
  - Trust the client-supplied odds captured when the selection was added: rejected — a stale boleto could otherwise place a bet on a match that has since started, or (in a future non-deterministic-odds world) at an odds value that no longer matches.

## Decision 6: A match is open for betting only while `scheduled` or `timed`

- **Decision**: `is_open_for_betting(status)` returns true only for `status.lower() in {"scheduled", "timed"}`. Every other value (`in_play`, `paused`, `suspended`, `postponed`, `finished`, or anything unrecognized) blocks both adding a new selection for that match and placing a bet that already includes it.
- **Rationale**: These are exactly the two football-data.org statuses meaning "not yet played" that `mock_dataset.py: REMAINING_MATCH_STATUSES` already treats as eligible to appear as an upcoming fixture in the first place; synthetic matches from `generate_mock_matches` always default to `scheduled`. Reusing this boundary keeps "can I bet on it" consistent with "is it still listed as upcoming" instead of introducing a second, divergent status taxonomy.
- **Alternatives considered**:
  - Allow betting on `postponed` matches too (their kickoff hasn't technically happened): rejected for simplicity — a postponed match has an uncertain restart time, so treating it the same as `in_play`/`finished` (not bettable) avoids an edge case with no clear resolution story in this phase.

## Decision 7: Mobile parity via a new `BetSlipSheet`, reusing `BetSlipContext`

- **Decision**: Add `frontend/components/BetSlipSheet.tsx`, a modal/bottom-sheet rendered on mobile widths (the `mobileContainer` branch in `DesktopShell`, or a sibling mounted alongside the tab navigator) that reads and mutates the same `BetSlipContext` the desktop right rail uses, opened via a floating "Ver boleto (N)" affordance.
- **Rationale**: `DesktopShell` today only renders the "Tu boleto" rail when `width >= 900`; below that, `mobileContainer` renders nothing bet-slip-related at all, so User Stories 1-5 would otherwise be desktop-only. Reusing `BetSlipContext` (rather than a second store) means every calculation (combined odds, potential winnings, tab visibility) is defined once and shared by both surfaces, consistent with Simplicity.
- **Alternatives considered**:
  - Make the desktop right rail itself responsive down to mobile widths: rejected — the rail's three-column desktop layout (`leftNav`/`main`/`rightRail`) is structurally a desktop pattern; a modal/sheet is the idiomatic mobile equivalent already used elsewhere in the ecosystem for bet slips.

## Decision 8: "Mis apuestas" is a new hidden tab route

- **Decision**: Add `frontend/app/(tabs)/bets/index.tsx` as a hidden tab (`href: null` in `_layout.tsx`, headed by the shared back button), reached via a link from `profile.tsx` (and optionally a post-placement confirmation), listing every `PlacedBet` for the signed-in account via `GET /bets/mine`.
- **Rationale**: This matches the exact pattern `004-social` and this same codebase already established for secondary screens that aren't part of the main tab bar: `ranking/index.tsx` and `matches/index.tsx` are both registered with `href: null` and `headerLeft: () => <HeaderBackButton />`, reached via navigation from another screen rather than their own tab bar icon.
- **Alternatives considered**:
  - Add "Mis apuestas" as a fully visible tab bar icon: rejected — the tab bar already carries Home/Profile/Social; adding a fourth icon changes the primary navigation IA, which is a bigger decision than this feature's ask. Reachable via a link keeps the existing tab bar untouched, mirroring how Ranking is already exposed today.
