# Implementation Plan: prototipo

**Branch**: `[001-prototipo]` | **Date**: 2026-06-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from [spec.md](spec.md)

## Summary

Build a local-first mock MVP for BethAny with one shared React/Expo interface for web and mobile, three primary views, a persistent bottom navigation bar, and an embedded global ranking summary inside Home or Profile. Use Python only for local mock-data shaping and ranking helpers. Keep all interactions session-only, visually modern, and intentionally non-functional for the prototype stage.

## Technical Context

**Language/Version**: Python 3.11+ for support logic; React via Expo for the UI layer

**Primary Dependencies**: Expo, React Native, Expo Router or React Navigation, Python stdlib for seeded data helpers

**Storage**: Local fixtures and in-memory session state; optional local persistence only if needed for a single prototype run

**Testing**: TDD deferred until explicitly activated by the product owner; validation will start with manual walkthroughs and later add focused tests for data shaping and UI behavior

**Target Platform**: Local development on web plus mobile validation through Expo on real devices

**Project Type**: Cross-platform mobile/web app prototype with Python support utilities

**Performance Goals**: Fast local first render, immediate navigation response, and smooth card-based scrolling on common desktop and mobile sizes

**Constraints**: Mock-only data, no real money, no live predictions, no external services, no production authentication, and no cloud dependency in this phase

**Scale/Scope**: Three main user surfaces, one embedded ranking module, one mock profile, one social section, and seeded lists of featured events and friends

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Simplicity: The design uses one shared app shell, seeded mock data, and session-only interactions; separate ranking tabs and server-backed state were rejected.
- [x] Local-first: Runtime assumptions stay local only for this phase.
- [x] Stack compliance: Python support logic plus React/Expo UI satisfy the constitution and mobile validation requirement.
- [x] TDD status: TDD is deferred and explicitly not a merge gate for this prototype.
- [x] Security scope: Mock-stage security posture is preserved; no production secrets, PII, or hardening work is included.

## Project Structure

### Documentation (this feature)

```text
specs/001-prototipo/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
frontend/
├── app/
│   ├── _layout.tsx
│   ├── (tabs)/
│   │   ├── index.tsx
│   │   ├── profile.tsx
│   │   └── social.tsx
│   └── ranking/   # embedded section used inside Home or Profile, not a tab
├── components/
├── data/
└── theme/

backend/
├── bethany_mock/
│   ├── __init__.py
│   ├── fixtures.py
│   ├── ranking.py
│   └── session_state.py
└── scripts/
```

**Structure Decision**: Use a monorepo with a shared Expo frontend for web and mobile, plus a small Python support package for seeded mock data and ranking helpers. There is no separate API surface in the MVP, and no external contracts are required.

## Complexity Tracking

No constitution violations require justification for this MVP.
