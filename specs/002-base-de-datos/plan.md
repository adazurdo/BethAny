# Implementation Plan: base de datos

**Branch**: `[002-base-de-datos]` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-base-de-datos/spec.md`

## Summary

Add a local account system that shows an access screen first, lets users register or sign in with an email-or-username plus password, and restores the signed-in account's profile, elo, bets, and friends from local persistence. The simplest viable approach is a local Python-backed SQLite store with an authenticated session that lasts only for the current app run.

## Technical Context

**Language/Version**: Python 3.11+ for backend/automation; React + Expo for frontend

**Primary Dependencies**: Local Python persistence layer, SQLite, Expo Router, existing React Native frontend, existing Python backend package

**Storage**: Local-only SQLite database for accounts and account-owned state; in-memory session state for the active app run

**Testing**: TDD remains deferred. Validate the access gate, register/login/logout flow, and state restoration with manual and automated checks once implementation is in place.

**Target Platform**: Local development environment with web preview and Expo mobile validation when account flows are reviewed on phones or tablets

**Project Type**: Web application with mobile client behavior

**Performance Goals**: Access-screen render should be immediate in local development; register/login should complete in a single short interaction and restore account state without noticeable delay

**Constraints**: No cloud sync, no production secrets, no real-money flows, no automatic remembered login on restart, and no security hardening beyond the mock-stage baseline

**Scale/Scope**: Single local environment, small number of mock accounts, one authenticated user context per active app run

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Simplicity: The design uses one local persistence path and one access gate before the main app.
- [x] Local-first: All persistence is local and no cloud dependency is introduced.
- [x] Stack compliance: Python owns the backend/persistence layer; React/Expo owns the UI and mobile validation is included.
- [x] TDD status: TDD is deferred for this feature.
- [x] Security scope: No production secrets or PII are introduced; advanced auth hardening is deferred.

## Project Structure

### Documentation (this feature)

```text
specs/002-base-de-datos/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── auth-api.md
└── tasks.md             # Created later by /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── bethany_mock/
│   ├── __init__.py
│   ├── fixtures.py
│   ├── ranking.py
│   └── session_state.py
└── scripts/
    └── demo_mock_data.py

frontend/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── profile.tsx
│   │   └── social.tsx
│   └── ranking/
│       └── index.tsx
├── components/
└── data/
```

**Structure Decision**: Extend the existing Python backend area with local persistence logic and adapt the Expo frontend so the first route is an access gate before the current tab-based app. Keep the implementation inside the current repo layout rather than introducing a new service or package boundary.

## Phase 0: Research Findings

The plan is intentionally simple:

- Store accounts and account-owned state in a local SQLite database managed by the Python backend.
- Require explicit login on app entry; do not add automatic remembered sign-in for the first version.
- Accept email or username plus password as the credential format.
- Treat profile, elo, friends, and bets as one account aggregate so a later sign-in restores the same state.
- Include logout in the first version so the access gate can be revisited cleanly.

## Phase 1: Design Outputs

### Data Model

See [data-model.md](./data-model.md) for the account, profile, bet, friendship, and session entities.

### Interface Contract

See [contracts/auth-api.md](./contracts/auth-api.md) for the local auth and account-state API surface.

### Validation Guide

See [quickstart.md](./quickstart.md) for the access-gate and account-restore validation flow.

## Re-evaluate Constitution Check After Design

- [x] Simplicity remains intact after design outputs are defined.
- [x] Local-first remains intact after design outputs are defined.
- [x] Stack compliance remains intact after design outputs are defined.
- [x] TDD remains deferred.
- [x] Security scope remains within the mock-stage boundary.

## Complexity Tracking

No constitution exceptions are required for this feature.
