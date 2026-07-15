# Tasks: Combinada (Apuestas Combinadas)

**Input**: Design documents from `/specs/005-combinada/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/bets-api.md

**Tests**: TDD is Deferred for this feature, so test-first tasks are not required unless explicitly requested later.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

**Status note (2026-07-16)**: T001–T037 are implemented. Backend (odds, `placed_bets`, `bet_repository.place_bet`/`list_placed_bets`, `/bets/place`, `/bets/mine`, odds embedded in match responses) was verified with two isolated smoke checks in this session: a direct-function check (throwaway SQLite DB) covering simple/combinada placement, single-selection-combinada rejection, duplicate-match rejection, finished-match rejection, invalid-stake rejection, multi-simple placement, ordering, and odds determinism; and a second check that spins up the real `create_app()` HTTP server on an isolated DB/port and drives it with `urllib` end-to-end (register, fetch match odds, `PUT /account/me` draft-boleto round-trip, place simple, place combinada, list mine, reject invalid combinada) — all assertions passed. The real `backend/data/bethany.sqlite3` was also started once directly to confirm the new `placed_bets` table is created additively alongside existing synced competition data, with no data loss (per `research.md` Decision 3, no DB reset was needed, unlike `004-social`'s schema-altering amendment). The frontend (all components/screens for T003, T010–T037) passes a full `npx tsc --noEmit` typecheck with zero errors, but has **not** been exercised in a running Expo/browser session — no headless browser is available in this environment (same limitation noted in `004-social/tasks.md`). T038 (the manual Expo/web pass) is still open; a hands-on pass through `quickstart.md` is recommended before considering this fully done.

**Amendment (2026-07-16)**: Combined odds now sum every leg instead of multiplying them (see `spec.md` Amendment). `backend/bethany_mock/bet_repository.py` (combinada path) and `frontend/components/BetSlipContext.tsx` (`combinedOdds`) were updated accordingly; re-verified with both the direct-function and real-HTTP-server smoke checks above, plus a fresh `npx tsc --noEmit` pass — all green.

**Amendment 2 (2026-07-16)**: Added T039 — a decorative "fly to boleto" animation when a new selection is added (FR-038, `spec.md` Amendment 2). Purely a frontend UI change (no backend/API changes): `EventCard.tsx` animates a small odds pill up-and-away on add (never on remove/toggle-off, and never delaying the real `addSelection` call), while `BetSlipPanel.tsx` and `BetSlipSheet.tsx` play a brief arrival bounce keyed off `selections.length` increasing. Verified with `npx tsc --noEmit` (clean) and a full Expo web bundle (Metro compiled with no errors, page served 200); not exercised in a live browser session for the same no-headless-browser reason noted for T038.

**Amendment 3 (2026-07-16)**: Added T040 — a decorative "disappear" animation when a selection is removed individually (FR-039, `spec.md` Amendment 3). `frontend/components/BetSlipPanel.tsx` now renders each selection through a new internal `TicketRow` component that owns a per-row exit `Animated.Value`; pressing "✕" fades/shrinks/slides that row out over ~220ms and only then calls the real `removeSelection`, so the removal itself is unchanged — only its on-screen transition is. Does not apply to "Limpiar" or the automatic clear after a successful placement (both stay instant). Verified with `npx tsc --noEmit` (clean) and a full Expo web bundle (Metro compiled with no errors, page served 200); not exercised in a live browser session (same no-headless-browser limitation as T038).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel when the files and dependencies do not overlap
- **[Story]**: Which user story the task belongs to, e.g. US1, US2, US3
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new module skeletons this feature will fill in

- [X] T001 [P] Create the odds module skeleton (`generate_match_odds`, `is_open_for_betting`) in `backend/bethany_mock/odds.py`
- [X] T002 [P] Add `PlacedBet` and `PlacedBetSelection` dataclasses in `backend/bethany_mock/models.py`
- [X] T003 [P] Create the frontend bets API client skeleton and the "Mis apuestas" route scaffolding in `frontend/data/bets.ts` and `frontend/app/(tabs)/bets/index.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the odds computation, schema, repository operations, and API routing every user story depends on

**⚠️ Critical**: No user story work should start until this phase is complete

- [X] T004 Add the `placed_bets` table (`id`, `account_id`, `bet_type`, `stake`, `combined_odds`, `potential_winnings`, `selections_json`, `created_at`) to the schema in `backend/bethany_mock/database.py` (additive only — no existing table changes, no DB reset needed; see `research.md` Decision 3)
- [X] T005 Implement `generate_match_odds(match_id)` as a deterministic hash-seeded function and `is_open_for_betting(status)` (`scheduled`/`timed` only) in `backend/bethany_mock/odds.py` (`research.md` Decision 1, Decision 6)
- [X] T006 [P] Add `find_match_by_id(match_id)` scanning every configured competition's snapshot in `backend/bethany_mock/mock_dataset_repository.py`
- [X] T007 Extend match serialization in `GET /mock/competitions/{code}` and `.../matches` with `homeOdds`/`drawOdds`/`awayOdds` from `generate_match_odds` in `backend/bethany_mock/api.py`
- [X] T008 Create `backend/bethany_mock/bet_repository.py` with `place_bet(account_id, bet_type, selections, stake=None)` and `list_placed_bets(account_id)`, validating stake (>0, numeric), match existence, and `is_open_for_betting` before persisting (`FR-010`, `FR-016`, `FR-017`, `FR-018`)
- [X] T009 Wire `POST /bets/place` and `GET /bets/mine` onto the existing session-authenticated request handler in `backend/bethany_mock/api.py`
- [X] T010 [P] Add `MatchOdds`, `PlacedBet`, `PlacedBetSelection` types and `placeSimpleBets()`, `placeCombinadaBet()`, `fetchMyBets()` request helpers in `frontend/data/bets.ts`
- [X] T011 [P] Extend `MockCompetitionMatch` (and its parsing) with `homeOdds`/`drawOdds`/`awayOdds` in `frontend/data/mockCompetitions.ts`
- [X] T012 Extend the `Selection` type (`matchId`, `matchLabel`, `outcome`, `odds`, optional `stake`) in `frontend/components/BetSlipContext.tsx`, keeping the existing `account.bets` sync path unchanged

**Checkpoint**: Backend can compute odds, validate, and persist/list placed bets; frontend has typed clients and an extended draft `Selection` shape.

---

## Phase 3: User Story 1 - Realizar una apuesta simple con cuota real (Priority: P1) 🎯 MVP

**Goal**: Let a user pick one of a match's three outcomes, see its real odds, enter a stake, see the potential winnings, place the bet, and see it in "Mis apuestas"

**Independent Test**: Pick a result on a match, confirm it's added to the boleto with its real odds, enter a stake, confirm potential winnings = stake × odds, place the bet, and confirm it appears in "Mis apuestas" as a simple bet

### Implementation for User Story 1

- [X] T013 [P] [US1] Replace the hardcoded "Apostar 2.15" button with three outcome buttons (Local/Empate/Visitante) showing real odds in `frontend/components/EventCard.tsx` (only for matches carrying `matchId`/odds — static non-football events keep their current stub, see T037)
- [X] T014 [US1] Implement `addSelection`(matchId, outcome, odds, matchLabel) in `frontend/components/BetSlipContext.tsx`
- [X] T015 [US1] Render the stake input and potential winnings (stake × odds) for a single selection in `frontend/components/DesktopShell.tsx`
- [X] T016 [US1] Implement the `simple` path of `place_bet` (one selection, one stake) in `backend/bethany_mock/bet_repository.py`
- [X] T017 [US1] Wire "Realizar apuesta" to `placeSimpleBets()` for a single selection, clearing the boleto on success, in `frontend/components/DesktopShell.tsx`
- [X] T018 [US1] Build the "Mis apuestas" list screen rendering every placed bet (type, stake, odds, potential winnings) from `fetchMyBets()` in `frontend/app/(tabs)/bets/index.tsx`
- [X] T019 [US1] Register the hidden `bets/index` route in `frontend/app/(tabs)/_layout.tsx` and add a link to it from `frontend/app/(tabs)/profile.tsx` (same pattern as `ranking/index`)

**Checkpoint**: User Story 1 lets a user place and see a simple bet, independently of any combinada behavior.

---

## Phase 4: User Story 2 - Construir y realizar una apuesta combinada (Priority: P1)

**Goal**: Let a user combine selections from 2+ different matches into one combinada with a correctly summed odds and potential winnings

**Independent Test**: Add selections from two different matches, confirm the "Combinada" tab appears with the correct combined odds, enter a stake, place the bet, and confirm it appears in "Mis apuestas" as one combinada with its full selection breakdown

### Implementation for User Story 2

- [X] T020 [US2] Show the "Combinada" tab automatically once 2+ selections from different matches exist, computing combined odds as the sum of all selections' odds, in `frontend/components/BetSlipContext.tsx`
- [X] T021 [US2] Render the Simple/Combinada tab switcher, combined odds, stake input, and potential winnings for the Combinada tab in `frontend/components/DesktopShell.tsx`
- [X] T022 [US2] Implement the `combinada` path of `place_bet` (2+ selections from different matches required, one shared stake, `combined_odds` = sum of all legs — see `spec.md` Amendment, 2026-07-16) in `backend/bethany_mock/bet_repository.py`
- [X] T023 [US2] Wire "Realizar apuesta" in the Combinada tab to `placeCombinadaBet()`, clearing the boleto on success, in `frontend/components/DesktopShell.tsx`
- [X] T024 [US2] Render the full per-selection breakdown (match, outcome, odds) alongside combined odds and potential winnings for combinada rows in `frontend/app/(tabs)/bets/index.tsx`

**Checkpoint**: User Stories 1 and 2 both work independently — a user can place a simple bet or build and place a combinada.

---

## Phase 5: User Story 3 - Elegir entre apostar en Simple o en Combinada con varias selecciones (Priority: P2)

**Goal**: With 2+ selections in the boleto, let the user place them as N independent simple bets (own stake each) or as one combinada

**Independent Test**: With three selections, enter a different stake per selection in the Simple tab and confirm three independent simple bets are created; switch to Combinada with one stake and confirm a single combined bet is created instead

### Implementation for User Story 3

- [X] T025 [US3] Add a per-selection stake map for the Simple tab when 2+ selections exist, each with its own computed potential winnings, in `frontend/components/BetSlipContext.tsx` and `frontend/components/DesktopShell.tsx`
- [X] T026 [US3] Submit all Simple-tab selections (each with its own stake) in a single `placeSimpleBets()` call in `frontend/data/bets.ts` and `frontend/components/DesktopShell.tsx`
- [X] T027 [US3] Confirm `POST /bets/place` with `betType: "simple"` and N selections returns N independent `PlacedBet` rows, each with exactly one selection — depends on T016, in `backend/bethany_mock/bet_repository.py`

**Checkpoint**: A user can freely choose Simple (independent bets) or Combinada (one bet) whenever 2+ selections exist.

---

## Phase 6: User Story 4 - Quitar selecciones del boleto y ver el recálculo automático (Priority: P2)

**Goal**: Removing a selection recalculates combined odds/potential winnings live, and drops back to Simple-only below 2 selections

**Independent Test**: With three selections and Combinada active, remove one and confirm the combined odds recompute from the remaining two; remove a second and confirm the boleto shows only the Simple tab

### Implementation for User Story 4

- [X] T028 [US4] Implement `removeSelection` recalculating combined odds/potential winnings from the remaining selections, and auto-hiding the Combinada tab below 2 selections, in `frontend/components/BetSlipContext.tsx`
- [X] T029 [US4] Reflect the recalculated combined odds, potential winnings, and tab visibility immediately in `frontend/components/DesktopShell.tsx` — depends on T028

**Checkpoint**: The boleto stays consistent through any sequence of adds/removes.

---

## Phase 7: User Story 5 - Impedir combinar dos selecciones del mismo partido (Priority: P2)

**Goal**: The boleto never holds two selections for the same match at once

**Independent Test**: Select one outcome of a match, then select a different outcome of the same match, and confirm the boleto still has exactly one entry for it (now the new outcome); select that same outcome again and confirm it's removed

### Implementation for User Story 5

- [X] T030 [US5] Enforce at most one active selection per `matchId` in `addSelection` — replace the existing selection when a different outcome of the same match is chosen, remove it when the same outcome is chosen again — in `frontend/components/BetSlipContext.tsx`
- [X] T031 [US5] Re-validate no two selections share a `matchId` when placing a bet, rejecting the whole request if violated — depends on T016, T022, in `backend/bethany_mock/bet_repository.py`

**Checkpoint**: The combined odds calculation can never be corrupted by two mutually exclusive outcomes of the same match.

---

## Phase 8: User Story 6 - Gestionar el boleto también desde el móvil (Priority: P2)

**Goal**: Give mobile (Expo) users the same boleto experience the desktop right rail already provides

**Independent Test**: On a mobile device/simulator, add selections, open the mobile boleto access point, confirm it shows the same selections/tabs/odds/stake as desktop, and confirm placing a bet works the same way

### Implementation for User Story 6

- [X] T032 [P] [US6] Build `frontend/components/BetSlipSheet.tsx`, a modal reusing `BetSlipContext` with the same tabs, stake inputs, combined odds, and "Realizar apuesta" CTA as `DesktopShell`'s right rail
- [X] T033 [US6] Add a floating "Ver boleto (N)" access point that opens `BetSlipSheet` in the mobile (`mobileContainer`) branch of `frontend/components/DesktopShell.tsx`

**Checkpoint**: All of User Stories 1-5 are now usable on both desktop and mobile.

---

## Phase 9: User Story 7 - Consultar el historial de "Mis apuestas" (Priority: P3)

**Goal**: Polish the "Mis apuestas" screen built incrementally in US1/US2 with ordering and a clear empty state

**Independent Test**: With no bets placed, open "Mis apuestas" and confirm a clear empty state; place a simple and a combinada bet and confirm the combinada appears most recent first with its full detail

### Implementation for User Story 7

- [X] T034 [US7] Order `list_placed_bets` by `created_at` descending (most recent first) in `backend/bethany_mock/bet_repository.py`
- [X] T035 [US7] Add a clear empty-state message in `frontend/app/(tabs)/bets/index.tsx` when the account has no placed bets (`FR-023`) — depends on T018

**Checkpoint**: "Mis apuestas" is a complete, ordered, and clearly-empty-when-empty history view.

---

## Phase 10: User Story 8 - Usar importes rápidos preestablecidos (Priority: P3)

**Goal**: Let the user fill the stake field with one tap instead of typing it

**Independent Test**: With a selection in the boleto, tap a quick-amount button and confirm the stake field and potential winnings update to that value

### Implementation for User Story 8

- [X] T036 [P] [US8] Add quick-amount preset buttons (2€/5€/10€/20€) that fill the active stake field(s) and remain freely editable afterward, in `frontend/components/DesktopShell.tsx` and `frontend/components/BetSlipSheet.tsx`

**Checkpoint**: All eight user stories work independently.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Regression safety and final validation across the whole feature

- [X] T037 [P] Verify `frontend/components/EventCard.tsx` still renders its original single "Apostar" stub, unmodified, for the static non-football `frontend/data/mockData.ts` events that carry no `matchId` (regression guard for the scope boundary in `research.md` Decision 2)
- [ ] T038 Run the `quickstart.md` validation flow end-to-end: backend checks for place/list/status-rejection/duplicate-match-rejection, plus a manual Expo/web pass for the boleto (desktop and mobile) and "Mis apuestas"
- [X] T039 [US1] Add a decorative, non-blocking "fly to boleto" animation on adding a new selection in `frontend/components/EventCard.tsx` (FR-038), plus a matching arrival pulse on the selection count in `frontend/components/BetSlipPanel.tsx` and on the mobile FAB in `frontend/components/BetSlipSheet.tsx`
- [X] T040 [US4] Add a decorative "disappear" exit animation (fade/shrink/slide) when a selection is individually removed from the boleto, via a new `TicketRow` sub-component in `frontend/components/BetSlipPanel.tsx` (FR-039); the real `removeSelection` only runs once the animation finishes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 and should land first (US2 needs US1's `EventCard`/`BetSlipContext` selection plumbing to already exist)
  - US3-US6 (P2) refine the same boleto/placement surface and can proceed in priority order once US1+US2 exist
  - US7-US8 (P3) are pure polish on top of the already-working boleto and history screen
- **Polish (Phase 11)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on other stories (foundation for everything else)
- **User Story 2 (P1)**: Needs US1's selection/odds plumbing (`EventCard`, `BetSlipContext.addSelection`) to exist first
- **User Story 3 (P2)**: Needs 2+ selections to be meaningful, so depends on US1 + US2 existing
- **User Story 4 (P2)**: Needs the Combinada tab and combined-odds calculation from US2
- **User Story 5 (P2)**: Needs `addSelection` from US1 to extend with the same-match guard
- **User Story 6 (P2)**: Needs `BetSlipContext` (US1) to be feature-complete enough to reuse in a mobile sheet
- **User Story 7 (P3)**: Needs the "Mis apuestas" screen from US1 and the combinada breakdown from US2
- **User Story 8 (P3)**: Needs the stake inputs built in US1/US3

### Within Each User Story

- Backend validation/persistence tasks (`bet_repository.py`) generally land before or alongside the frontend tasks that call them
- Tasks marked `[P]` can be done in parallel because they touch different files or isolated slices of the same feature

### Parallel Opportunities

- T001-T003 (Setup) can all run in parallel — different files
- T006, T010, T011 (Phase 2) can run in parallel with T004-T005 and with each other — different files
- T032 (`BetSlipSheet`) can be built in parallel with T020-T024 (US2) since it's a new file that only starts consuming `BetSlipContext` once mounted in T033
- T037 (regression guard) can run in parallel with any later-phase task since it only reads/verifies existing code

---

## Parallel Example: Phase 2 (Foundational)

```bash
# These can be built in parallel once T004/T005 land:
Task: "Add find_match_by_id(match_id) in backend/bethany_mock/mock_dataset_repository.py"
Task: "Add MatchOdds/PlacedBet types and request helpers in frontend/data/bets.ts"
Task: "Extend MockCompetitionMatch with odds fields in frontend/data/mockCompetitions.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 and 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (simple bets work end-to-end)
4. Complete Phase 4: User Story 2 (combinadas work end-to-end)
5. **STOP and VALIDATE**: Run `quickstart.md` steps 1-4
6. This is the feature's actual MVP — everything after is refinement (US3-US8)

### Incremental Delivery

1. Setup + Foundational → odds and placement plumbing ready
2. US1 → simple bets placeable and visible (MVP slice 1)
3. US2 → combinadas placeable and visible (MVP slice 2, the feature's core ask)
4. US3-US6 → Simple-vs-Combinada choice, live recalculation, same-match guard, mobile parity
5. US7-US8 → history polish and quick-amount convenience

---

## Notes

- `[P]` tasks = different files and no blocking dependency on unfinished work
- `[Story]` labels map directly to the prioritized user stories in `spec.md`
- TDD is deferred, so the task list focuses on implementation and validation rather than test-first ordering
- Odds are never persisted (`research.md` Decision 1) — adding `placed_bets` (T004) is purely additive and does not require deleting/resetting the local `bethany.sqlite3`, unlike the schema-altering amendments in `004-social`
- Betting applies only to backend-tracked football matches; static non-football mock events are explicitly out of scope (T037 is a regression guard for this boundary, not new functionality)
- There is no wallet/balance and no bet settlement in this feature — stakes are illustrative and every placed bet stays in a fixed "realizada" state
