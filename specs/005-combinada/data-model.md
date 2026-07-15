# Data Model: Combinada (Apuestas Combinadas)

## Overview

The feature adds a real 1X2 betting market on top of the football matches already modeled in `003-datos-mock`, extends the existing draft boleto (`BetSlipContext` / `account.bets`, originally specced as `BetRecord` in `002-base-de-datos`) with match/outcome/odds data, and introduces a new server-owned `PlacedBet` aggregate for bets that have actually been placed (simple or combinada). Odds are never stored; they are always derived from a match's id via a pure function, so nothing here introduces a schema migration for existing data.

## Entities

### MatchOdds *(derived, not stored)*

Represents the 1X2 market for one `MockMatch`.

**Fields**:
- `match_id`: the `MockMatch.id` this market belongs to
- `home_odds`, `draw_odds`, `away_odds`: decimal odds for Local, Empate, and Visitante respectively

**Rules**:
- Computed deterministically from `match_id` (see `odds.py: generate_match_odds`); the same `match_id` always yields the same three odds.
- Not persisted anywhere; recomputed on every read (match listing) and again at bet placement time, so it can never drift out of sync with itself.
- Only meaningful while the owning `MockMatch.status` is open for betting (`scheduled` or `timed`); the API still returns odds for other statuses (for display in "Mis apuestas" history), but new selections and placements against that match are rejected.

### BetSelection *(extends the existing draft-boleto entry, `BetRecord`/`bets` from `002-base-de-datos`)*

One entry of the boleto currently being built by the user, not yet placed.

**Fields**:
- `id`: stable identifier for the selection (existing field)
- `match_id`: the `MockMatch` this selection refers to
- `match_label`: display string for the fixture (e.g. "Francia vs Inglaterra"), used to render the boleto without an extra lookup
- `outcome`: `local`, `empate`, or `visitante`
- `odds`: the `MatchOdds` value for this outcome at the time the selection was added
- `stake`: optional per-selection amount, used when the "Simple" tab is active with 2+ selections (User Story 3)

**Rules**:
- At most one `BetSelection` per `match_id` may exist in the boleto at a time; choosing a different outcome for a match already in the boleto replaces its existing selection (FR-004); choosing the same outcome again removes it (FR-005).
- `odds` shown in the boleto is illustrative only until placement — `POST /bets/place` recomputes it server-side and is the value of record (Decision 5, `research.md`).
- The boleto (its list of `BetSelection`s) continues to persist via the existing `account.bets` field and `PUT /account/me`, unchanged from `002-base-de-datos`/`004-social`.

### PlacedBet

An apuesta already placed by an account — either `simple` (one selection) or `combinada` (two or more selections from different matches).

**Fields**:
- `id`
- `account_id`: owning account
- `bet_type`: `simple` or `combinada`
- `stake`: amount entered by the user (illustrative only — no wallet is debited)
- `combined_odds`: the selection's own odds for a `simple` bet, or the sum of every selection's odds for a `combinada` (a deliberate simplification vs. a real bookmaker's product, since no real money is at stake — see `spec.md` Amendment, 2026-07-16)
- `potential_winnings`: `stake * combined_odds`, rounded to 2 decimals
- `status`: fixed `"realizada"` in this phase (no settlement/resolution against real results)
- `created_at`

**Rules**:
- Belongs to exactly one account.
- A `combinada` MUST have at least 2 `PlacedBetSelection` entries, each from a different match; a `simple` MUST have exactly 1.
- Immutable once created: placing a bet is a one-shot action with no edit/cancel flow in this phase.
- Must be restorable after a later sign-in of the owning account (same restorability guarantee `002-base-de-datos` established for `BetRecord`).

### PlacedBetSelection

One leg of a `PlacedBet`, frozen at the moment of placement.

**Fields**:
- `match_id`
- `match_label`
- `outcome`: `local`, `empate`, or `visitante`
- `odds`: the odds used for this leg when the bet was placed

**Rules**:
- Stored as part of its `PlacedBet`'s `selections_json` (see `research.md` Decision 3) — not a separately queried row.
- `odds` here is frozen history: it does not change even if `generate_match_odds` is later invalidated (e.g. the match is removed from a future snapshot), so "Mis apuestas" always shows exactly what was placed.

## Relationships

- One `MockMatch` has one derived `MatchOdds`.
- One account has many draft `BetSelection`s (its current boleto) and many `PlacedBet`s (its history).
- One `PlacedBet` has one (`simple`) or many (`combinada`) `PlacedBetSelection`s, each referencing a `MockMatch`.
- A `BetSelection` in the draft boleto becomes one or more `PlacedBetSelection`s only when the user successfully places a bet; the draft boleto is then cleared (FR-015).

## Validation Rules

- Placing any bet requires an active session (FR-016).
- Placing a bet with a stake that is zero, negative, or non-numeric MUST be rejected (FR-010).
- Placing a `combinada` with fewer than 2 selections, or with two selections from the same match, MUST be rejected.
- Placing a bet that includes any match whose status is not `scheduled`/`timed` MUST be rejected, naming the offending selection (FR-018).
- `combined_odds` and `potential_winnings` MUST be computed server-side from the match's current odds at placement time, never taken as-is from the client (FR-017).
