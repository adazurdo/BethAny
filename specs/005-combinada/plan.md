# Implementation Plan: Combinada (Apuestas Combinadas)

**Branch**: `[005-combinada]` | **Date**: 2026-07-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-combinada/spec.md`

**Note (superseded by `006-elo`, 2026-07-17)**: The "no virtual wallet/balance" and "no settlement" statements in `Technical Context` (Constraints) and both `Constitution Check` sections below are superseded by `specs/006-elo/`, which added a Beths balance (named "coins" at the time, renamed 2026-07-17) debited on placement and a lazy settlement against a deterministic simulated match result. See `spec.md` Amendment 4 and `specs/006-elo/plan.md` for the current design; everything else in this plan (odds computation, `placed_bets` shape, Simple/Combinada behavior) remains accurate.

## Summary

Today the "bet slip" is a frontend stub: `EventCard` shows one hardcoded odd (`2.15`), `BetSlipContext` only holds `{id, title, meta}` selections, and the "REALIZAR APUESTA" button in `DesktopShell`'s right rail just logs to the console and clears — nothing is ever placed or persisted server-side, and the panel is desktop-only (no mobile equivalent exists). This feature builds a real 1X2 market for backend-tracked football matches (deterministic mock odds, computed on read — no new column or migration), extends the existing draft boleto (`BetSlipContext` / `account.bets`) to carry match/outcome/odds instead of a bare title, and adds the actual "Simple" vs "Combinada" behavior: two or more selections from different matches unlock a "Combinada" tab whose odds are the sum of every leg (an explicit, deliberate simplification vs. a real bookmaker's product — see `spec.md` Amendment, 2026-07-16), while "Simple" places one independent bet per selection. Placing a bet is a new server-validated action (`POST /bets/place`) that recomputes odds from the match's current status/odds rather than trusting the client, persists to a new `placed_bets` table, and becomes visible in a new "Mis apuestas" screen. A new mobile bet-slip sheet gives the same flow parity on Expo, since the current right rail only renders at desktop widths.

## Technical Context

**Language/Version**: Python 3.11+ (stdlib only: `sqlite3`, `http.server`) for backend; React + Expo (existing frontend stack) for UI

**Primary Dependencies**: None new. Reuses `bethany_mock.models`, `bethany_mock.mock_dataset_repository`, `bethany_mock.account_repository`, `bethany_mock.api`, and the existing `frontend/components/BetSlipContext.tsx` / `frontend/data/auth.ts` request helpers.

**Storage**: Local-only SQLite (`backend/data/bethany.sqlite3`). One new table (`placed_bets`); no changes to existing table schemas — 1X2 odds are computed on read from `match.id`, not persisted as new columns (see `research.md` Decision 1).

**Testing**: TDD remains deferred. Validation is manual/functional via `quickstart.md`, mirroring `002-base-de-datos` and `004-social`.

**Target Platform**: Local development environment with web preview and Expo mobile validation, since the bet slip is a core, previously desktop-only surface that this feature must also bring to mobile.

**Project Type**: Web application with mobile client behavior (same shape as `002-base-de-datos` and `004-social`)

**Performance Goals**: Adding/removing a selection, switching Simple/Combinada, and recalculating combined odds and potential winnings all happen instantly client-side; placing a bet resolves in a single local request.

**Constraints**: No real money, no virtual wallet/balance (stake is illustrative only, per spec Assumptions), only a 1X2 market (no "Sistema" tab, no additional markets), no settlement/resolution of placed bets against real results, no schema migration framework (a genuinely new column would still require deleting the local dev `bethany.sqlite3`, per `004-social/research.md` Decision 12 — avoided here entirely by computing odds on read).

**Scale/Scope**: Single local environment, a handful of football matches per competition, a small number of placed bets per account.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Simplicity: Reuses the existing account/session/SQLite infrastructure and the existing `BetSlipContext`/`DesktopShell` boleto; adds one new repository module, one new table, and one new endpoint namespace instead of a parallel betting service. Odds are a pure computed function, not new stored state.
- [x] Local-first: All new persistence is local SQLite; no cloud/payment dependency is introduced.
- [x] Stack compliance: Python owns the new odds/placement logic; React/Expo owns the UI, and mobile validation is included because the bet slip becomes a mobile-facing flow for the first time.
- [x] TDD status: TDD is deferred for this feature, consistent with the rest of the project.
- [x] Security scope: No money, payment data, or production secrets are introduced; stake is illustrative only. Abuse prevention (mass bet creation) and result settlement are explicitly deferred (see spec Security Scope / Assumptions).

## Project Structure

### Documentation (this feature)

```text
specs/005-combinada/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── bets-api.md
└── tasks.md             # Created later by /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── bethany_mock/
│   ├── models.py                 # NEW: PlacedBet, PlacedBetSelection dataclasses
│   ├── odds.py                   # NEW: generate_match_odds(match_id) -> (home, draw, away), pure/deterministic
│   ├── database.py               # NEW: placed_bets table (no changes to existing tables)
│   ├── mock_dataset_repository.py# NEW: find_match_by_id(match_id) across all competitions
│   ├── bet_repository.py         # NEW: place_bet(...), list_placed_bets(account_id)
│   └── api.py                    # NEW: /bets/place, /bets/mine routing; matches responses gain odds

frontend/
├── app/
│   ├── (tabs)/
│   │   ├── matches/index.tsx     # EventCard now renders 3 outcome buttons for backend-tracked matches
│   │   └── bets/
│   │       └── index.tsx         # NEW: "Mis apuestas" screen (hidden tab, same pattern as ranking/index.tsx)
├── components/
│   ├── BetSlipContext.tsx        # Selection gains matchId/outcome/odds; adds activeTab, stakes, placeBet()
│   ├── DesktopShell.tsx          # Right rail "Tu boleto" gets real Simple/Combinada tabs, stake inputs, CTA wired to placeBet()
│   ├── EventCard.tsx             # Three outcome buttons (Local/Empate/Visitante) with real odds, replacing the hardcoded "2.15"
│   └── BetSlipSheet.tsx          # NEW: mobile modal/bottom-sheet equivalent of the desktop right rail
└── data/
    ├── mockCompetitions.ts       # MockCompetitionMatch gains odds fields from the backend response
    └── bets.ts                   # NEW: placeSimpleBets(), placeCombinadaBet(), fetchMyBets(), PlacedBet types
```

**Structure Decision**: Extend the existing `bethany_mock` Python package and the existing `BetSlipContext`/`DesktopShell`/`EventCard` frontend components rather than introducing a new backend service or a parallel bet-slip UI. "Mis apuestas" lives at `app/(tabs)/bets/index.tsx`, a hidden tab (`href: null`) reached via a link from the Profile screen, following the exact pattern already used for `ranking/index.tsx` and `matches/index.tsx` in `frontend/app/(tabs)/_layout.tsx`. The mobile bet-slip gap (the right rail in `DesktopShell` only renders at `width >= 900`) is closed by a new `BetSlipSheet` modal consuming the same `BetSlipContext`, not a second parallel state store.

## Phase 0: Research Findings

See [research.md](./research.md) for full rationale. Summary of decisions:

- 1X2 odds are a pure, deterministic function of `match.id` (`odds.py: generate_match_odds`), computed wherever a match is served or a bet is placed — no new column on `MockMatch`, no schema migration, and odds stay stable as long as the match keeps the same id.
- Betting (market, selections, placement) applies only to backend-tracked football matches (`MockMatch`/snapshot from `003-datos-mock`); static non-football mock events (`frontend/data/mockData.ts`) are out of scope for this feature (see spec Assumptions) and keep their current stub "Apostar" interaction.
- A new `placed_bets` table (one row per placed bet, `selections_json` blob for its legs) follows the same JSON-blob-inside-a-row pattern already used by `mock_dataset_snapshots` and `custom_predictions`, rather than a fully normalized selections table.
- The draft boleto keeps living in `BetSlipContext` + `account.bets` (extended with `matchId`/`outcome`/`odds`), reusing the existing `PUT /account/me` sync path — no new draft-state table.
- `POST /bets/place` recomputes each selection's odds from the match's current data and re-validates match status server-side, rather than trusting the odds/stake the client already computed — this is the same "don't trust the client for invariants" reasoning `004-social/research.md` Decision 3 used for friend/group actions.
- A match is open for betting only while its status is `scheduled` or `timed` (the two football-data.org statuses meaning "not yet played"); any other status (`in_play`, `paused`, `suspended`, `postponed`, `finished`, or anything unrecognized) blocks new selections and blocks placement.
- Same-match duplicate selections are prevented client-side (`BetSlipContext.addSelection` replaces/toggles) and re-checked server-side at placement time.
- The "Sistema" tab from the reference screenshot is intentionally not built (see spec Assumptions); only "Simple" and "Combinada" exist.
- Mobile parity is a new `BetSlipSheet` modal component reusing `BetSlipContext`, not a second bet-slip implementation.

## Phase 1: Design Outputs

### Data Model

See [data-model.md](./data-model.md) for the extended `BetSelection` (draft) entity and the new `PlacedBet` / `PlacedBetSelection` entities, plus the pure `MatchOdds` computation.

### Interface Contract

See [contracts/bets-api.md](./contracts/bets-api.md) for the full `/bets/*` API surface (`POST /bets/place`, `GET /bets/mine`) and the odds fields added to the existing match-listing responses.

### Validation Guide

See [quickstart.md](./quickstart.md) for the simple-bet, combinada-build, tab-switch, same-match-guard, mobile, and "Mis apuestas" validation flow.

## Re-evaluate Constitution Check After Design

- [x] Simplicity remains intact: one new table, one new repository module, one new endpoint namespace; odds add zero new stored state.
- [x] Local-first remains intact: everything still persists to the same local SQLite file.
- [x] Stack compliance remains intact: Python backend, React/Expo frontend, mobile validation covered in quickstart (new `BetSlipSheet`).
- [x] TDD remains deferred.
- [x] Security scope remains within the mock-stage boundary: no money/wallet is introduced; deferred items (bet-creation abuse prevention, result settlement) are listed in the spec and carried into quickstart follow-ups.

## Complexity Tracking

No constitution exceptions are required for this feature.
