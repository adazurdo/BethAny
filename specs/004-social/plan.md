# Implementation Plan: Ventana Social (Amigos y Grupos de Predicciones)

**Branch**: `[004-social]` | **Date**: 2026-07-12 | **Last updated**: 2026-07-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-social/spec.md`

## Summary

Turn the existing `frontend/app/(tabs)/social.tsx` screen (currently backed by static mock arrays) into a real feature: friends are validated against existing local accounts and connect only through a mutual request/accept/reject flow, elo is always read live from the friend's own account profile, the list can be sorted client-side, and prediction groups become a persisted entity shared across members instead of a hardcoded list, with invite-based (request/accept/reject) membership. Custom predictions inside a group carry a closing date and an author-controlled resolve/abort lifecycle, and the group detail screen shows a ranking of members by number of correctly guessed predictions. The simplest viable approach extends the current Python/SQLite backend with a `social_repository` module and six tables (`friend_requests`, `prediction_groups`, `group_memberships`, `group_invites`, `custom_predictions`, `prediction_votes`), plus a `/social/*` endpoint namespace on the existing `http.server`-based API — no new services, frameworks, or dependencies. **This plan was last regenerated on 2026-07-13** to (a) catch the design docs up to the 2026-07-12 accept/reject amendment, which was already implemented in code but not reflected here, and (b) design the 2026-07-13 amendment (prediction closing date, resolve/abort, group ranking).

## Technical Context

**Language/Version**: Python 3.11+ (stdlib only: `sqlite3`, `http.server`) for backend; React + Expo (existing frontend stack) for UI

**Primary Dependencies**: None new. Reuses `bethany_mock.database`, `bethany_mock.account_repository`, `bethany_mock.api`, and the existing `frontend/data/auth.ts` request helper (`requestJson`).

**Storage**: Local-only SQLite (`backend/data/bethany.sqlite3`), extending the schema already created by `database.initialize_database()`.

**Testing**: TDD remains deferred. Validation is manual/functional via `quickstart.md`, mirroring the approach used in `002-base-de-datos`.

**Target Platform**: Local development environment with web preview and Expo mobile validation, since the "Social" tab is part of the mobile tab bar (`frontend/app/(tabs)/social.tsx`).

**Project Type**: Web application with mobile client behavior (same shape as `002-base-de-datos`)

**Performance Goals**: All social actions (send/accept/reject friend request, remove friend, create group, invite, accept/reject invite, propose/resolve/abort prediction, vote, sort) resolve in a single local request and reflect in the UI without noticeable delay.

**Constraints**: No cloud sync, no push notifications (friend requests and group invites require explicit accept/reject, but the recipient only sees them when they open the Social tab or group screen — see spec Assumptions), no moderation of custom prediction content, no automatic/scheduled resolution of predictions based on real match results, no new third-party dependencies, no schema migration framework (see `research.md` Decision 12 — a schema change requires deleting the local dev `bethany.sqlite3`).

**Scale/Scope**: Single local environment, small number of mock accounts, friends, groups, and custom predictions per account.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Simplicity: Reuses the existing account/session/SQLite infrastructure; adds one new repository module and one new endpoint namespace instead of a parallel service.
- [x] Local-first: All new persistence is local SQLite; no cloud dependency is introduced.
- [x] Stack compliance: Python owns the new persistence/API logic; React/Expo owns the UI, and mobile validation is included because the Social tab is mobile-facing.
- [x] TDD status: TDD is deferred for this feature, consistent with the rest of the project.
- [x] Security scope: No production secrets or PII are introduced; invite-abuse prevention and content moderation are explicitly deferred (see spec Security Scope).

## Project Structure

### Documentation (this feature)

```text
specs/004-social/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── social-api.md
└── tasks.md             # Created later by /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── bethany_mock/
│   ├── models.py                # FriendRequest, PredictionGroup, GroupMembership, GroupInvite, CustomPrediction (+ lifecycle fields), PredictionVote
│   ├── database.py              # friend_requests, prediction_groups, group_memberships, group_invites, custom_predictions (+ closes_at/status/resolved_option/resolved_at), prediction_votes tables
│   ├── account_repository.py    # account lookup by identifier, used to validate friend requests
│   ├── social_repository.py     # friends, groups, invites, predictions, votes persistence; NEW: resolve/abort + ranking computation
│   └── api.py                   # /social/friends* and /social/groups* routing; NEW: resolve/abort endpoints

frontend/
├── app/
│   ├── (tabs)/
│   │   ├── social.tsx           # friends (requests/list/sort), groups list, create-group action
│   │   └── groups/
│   │       └── [groupId].tsx    # group detail: back button, members, invite, predictions + votes; NEW: resolve/abort controls, ranking section
├── components/
│   ├── FriendRow.tsx            # elo display, accept/reject/remove actions
│   ├── GroupCard.tsx            # navigate to group detail
│   ├── FriendSortControl.tsx    # elo asc/desc/alphabetical toggle
│   ├── CreateGroupModal.tsx     # create group + invite friends
│   └── GroupRanking.tsx         # NEW: per-member correct-prediction ranking list
└── data/
    ├── auth.ts                  # AuthAccount/session types
    └── social.ts                 # request helpers for /social/friends* and /social/groups*; NEW: closesAt on propose, resolvePrediction, abortPrediction, ranking field
```

**Structure Decision**: Extend the existing `bethany_mock` Python package and the existing Expo `(tabs)/social.tsx` screen rather than introducing a new backend service or a new frontend app section. Group detail lives at `app/(tabs)/groups/[groupId].tsx`, nested inside the tab navigator as a hidden tab screen (see `research.md` Decision 7), so the bottom tab bar stays visible per FR-027. The 2026-07-13 amendment (prediction lifecycle, ranking) adds no new routes or screens — it extends the existing group detail screen and its backing repository/contract.

## Phase 0: Research Findings

See [research.md](./research.md) for full rationale. Summary of decisions:

- Friends are modeled as a shared `FriendRequest` row (`pending`/`accepted`/`rejected`) rather than one-sided state; display name and elo are always resolved live from the friend's own account profile instead of being duplicated and going stale.
- Prediction groups, memberships, invites, custom predictions, and votes live in their own SQLite tables (not embedded in `account_state`), because they are shared by multiple accounts and cannot be owned by a single account's JSON blob.
- Friend and group mutations get dedicated `/social/*` endpoints instead of overloading `PUT /account/me`, so the backend can enforce duplicate/self/membership checks server-side — this follows the extension path already called out in `contracts/auth-api.md` from `002-base-de-datos`.
- Friend list sorting (elo asc/desc/alphabetical) is computed client-side in the frontend on the already-fetched list; no backend sort parameter is introduced.
- Sending a friend request and inviting a friend to a group both create a `pending` row; the relationship/membership only becomes active once the recipient explicitly accepts (revised 2026-07-12 from the original immediate-add design).
- Votes upsert one row per `(prediction, account)` pair, so changing a vote never duplicates a member's participation in the tally.
- The group detail screen is nested inside the tab navigator (`app/(tabs)/groups/[groupId].tsx`) so the bottom tab bar stays visible per FR-027.
- (2026-07-13) A prediction's closing date and resolve/abort lifecycle live as columns on `custom_predictions` itself; resolving and finalizing early are the same author-only operation; votes are rejected past `closes_at` independent of whether the author has resolved yet; the group ranking is computed on read from existing votes/resolutions, not stored.

## Phase 1: Design Outputs

### Data Model

See [data-model.md](./data-model.md) for the `FriendRequest`, `PredictionGroup`, `GroupMembership`, `GroupInvite`, `CustomPrediction` (with its closing/resolution fields), `PredictionVote`, and derived `GroupRanking` entities.

### Interface Contract

See [contracts/social-api.md](./contracts/social-api.md) for the full `/social/friends*` and `/social/groups*` API surface, including the `resolve`/`abort` endpoints and the `ranking` field on group detail.

### Validation Guide

See [quickstart.md](./quickstart.md) for the friend-request, sorting, group/invite, custom-prediction, voting, resolution, and ranking validation flow.

## Re-evaluate Constitution Check After Design

- [x] Simplicity remains intact: six tables total for the feature's own scope, no new services; the 2026-07-13 addition reuses the existing status-column pattern and adds zero new tables (ranking is computed, not stored).
- [x] Local-first remains intact: everything still persists to the same local SQLite file.
- [x] Stack compliance remains intact: Python backend, React/Expo frontend, mobile validation covered in quickstart.
- [x] TDD remains deferred.
- [x] Security scope remains within the mock-stage boundary; deferred items (invite/request spam prevention, content moderation, automatic result-based resolution) are listed in the spec and carried into quickstart follow-ups.

## Complexity Tracking

No constitution exceptions are required for this feature.
