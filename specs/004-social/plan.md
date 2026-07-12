# Implementation Plan: Ventana Social (Amigos y Grupos de Predicciones)

**Branch**: `[004-social]` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-social/spec.md`

## Summary

Turn the existing `frontend/app/(tabs)/social.tsx` screen (currently backed by static mock arrays) into a real feature: friends are validated against existing local accounts, elo is always read live from the friend's own account profile, the list can be sorted client-side, and prediction groups become a persisted entity shared across members instead of a hardcoded list. The simplest viable approach extends the current Python/SQLite backend with a small `social_repository` module and three new tables (friendships, prediction groups, group memberships, custom predictions), plus a `/social/*` endpoint namespace on the existing `http.server`-based API — no new services, frameworks, or dependencies.

## Technical Context

**Language/Version**: Python 3.11+ (stdlib only: `sqlite3`, `http.server`) for backend; React + Expo (existing frontend stack) for UI

**Primary Dependencies**: None new. Reuses `bethany_mock.database`, `bethany_mock.account_repository`, `bethany_mock.api`, and the existing `frontend/data/auth.ts` request helper (`requestJson`).

**Storage**: Local-only SQLite (`backend/data/bethany.sqlite3`), extending the schema already created by `database.initialize_database()`.

**Testing**: TDD remains deferred. Validation is manual/functional via `quickstart.md`, mirroring the approach used in `002-base-de-datos`.

**Target Platform**: Local development environment with web preview and Expo mobile validation, since the "Social" tab is part of the mobile tab bar (`frontend/app/(tabs)/social.tsx`).

**Project Type**: Web application with mobile client behavior (same shape as `002-base-de-datos`)

**Performance Goals**: All social actions (add/remove friend, create group, invite, propose prediction, sort) resolve in a single local request and reflect in the UI without noticeable delay.

**Constraints**: No cloud sync, no push notifications, no pending-invite/approval workflow (adds and invites are immediate per spec Assumptions), no moderation of custom prediction content, no new third-party dependencies.

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
│   ├── models.py                # extend FriendshipData; add PredictionGroup, GroupMembership, CustomPrediction
│   ├── database.py              # add friendships, prediction_groups, group_memberships, custom_predictions tables
│   ├── account_repository.py    # add friend add/remove helpers resolved against real accounts
│   ├── social_repository.py     # NEW: groups, memberships, custom predictions persistence
│   └── api.py                   # extend routing with /social/friends and /social/groups endpoints

frontend/
├── app/
│   ├── (tabs)/
│   │   └── social.tsx           # rework: real friends/groups from the API, sort control, create-group action
│   └── groups/
│       └── [groupId].tsx        # NEW: group detail (members + propose/list custom predictions)
├── components/
│   ├── FriendRow.tsx            # adapt: show elo, real add/remove semantics
│   ├── GroupCard.tsx            # adapt: navigate to group detail
│   ├── FriendSortControl.tsx    # NEW: elo asc/desc/alphabetical toggle
│   └── CreateGroupModal.tsx     # NEW: create group + invite friends
└── data/
    ├── auth.ts                  # extend FriendItem/AuthAccount types
    └── social.ts                 # NEW: request helpers for /social/friends and /social/groups
```

**Structure Decision**: Extend the existing `bethany_mock` Python package and the existing Expo `(tabs)/social.tsx` screen rather than introducing a new backend service or a new frontend app section. Groups get their own route (`app/groups/[groupId].tsx`) because group detail (members + custom predictions) does not fit inside the tab list view.

## Phase 0: Research Findings

See [research.md](./research.md) for full rationale. Summary of decisions:

- Friends reference a real `UserAccount` (`friend_account_id`); display name and elo are resolved live from that account's profile instead of being duplicated and going stale.
- Prediction groups, memberships, and custom predictions live in their own SQLite tables (not embedded in `account_state`), because a group is shared by multiple accounts and cannot be owned by a single account's JSON blob.
- Friend and group mutations get dedicated `/social/*` endpoints instead of overloading `PUT /account/me`, so the backend can enforce duplicate/self/membership checks server-side — this follows the extension path already called out in `contracts/auth-api.md` from `002-base-de-datos`.
- Friend list sorting (elo asc/desc/alphabetical) is computed client-side in the frontend on the already-fetched list; no backend sort parameter is introduced.
- Adding a friend and inviting a friend to a group are both immediate actions with no pending-approval state, consistent with the spec's Assumptions.

## Phase 1: Design Outputs

### Data Model

See [data-model.md](./data-model.md) for the `Friend`, `PredictionGroup`, `GroupMembership`, and `CustomPrediction` entities.

### Interface Contract

See [contracts/social-api.md](./contracts/social-api.md) for the `/social/friends` and `/social/groups` API surface.

### Validation Guide

See [quickstart.md](./quickstart.md) for the friend-management, sorting, and group/prediction validation flow.

## Re-evaluate Constitution Check After Design

- [x] Simplicity remains intact: no new tables beyond the four needed for the feature's own scope, no new services.
- [x] Local-first remains intact: everything still persists to the same local SQLite file.
- [x] Stack compliance remains intact: Python backend, React/Expo frontend, mobile validation covered in quickstart.
- [x] TDD remains deferred.
- [x] Security scope remains within the mock-stage boundary; deferred items are listed in the spec and carried into quickstart follow-ups.

## Complexity Tracking

No constitution exceptions are required for this feature.
