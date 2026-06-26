# Tasks: prototipo

**Input**: Design documents from `/specs/001-prototipo/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: TDD is deferred for this prototype, so test tasks are not included unless explicitly requested.

**Organization**: Tasks are grouped by user story so each slice can be implemented and demonstrated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story the task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the local-first prototype structure and shared mock-data foundation.

- [x] T001 Create the documented monorepo structure for frontend and backend support in `frontend/` and `backend/`
- [x] T002 [P] Add the prototype theme and shared color tokens in `frontend/theme/`
- [x] T003 [P] Add seeded mock content fixtures for events, profile, ranking, and friends in `backend/bethany_mock/fixtures.py`
- [x] T004 [P] Create the Python package scaffold for local mock helpers in `backend/bethany_mock/__init__.py`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared app shell, mock data access layer, and local session state used by all stories.

- [x] T005 Implement local session state helpers for tab selection and friend toggles in `backend/bethany_mock/session_state.py`
- [x] T006 Implement mock ranking shaping helpers in `backend/bethany_mock/ranking.py`
- [x] T007 [P] Define the shared Expo app shell and bottom navigation structure in `frontend/app/_layout.tsx`
- [x] T008 [P] Define the shared card, section, and layout primitives in `frontend/components/`
- [x] T009 Connect the frontend to the seeded mock content contract in `frontend/data/`
- [x] T010 Document the mock-only data flow and session-only behavior in `specs/001-prototipo/quickstart.md`

**Checkpoint**: The shared shell and mock data foundation are ready; user stories can now be implemented independently.

---

## Phase 3: User Story 1 - Discover Relevant Events (Priority: P1) 🎯 MVP

**Goal**: Show the home page with relevant mock events and the embedded global ranking summary.

**Independent Test**: Open the home page and confirm the event cards, sport variety, and ranking summary are visible without using other pages.

### Implementation for User Story 1

- [x] T011 [P] [US1] Build the home page event feed in `frontend/app/(tabs)/index.tsx`
- [x] T012 [P] [US1] Build the embedded global ranking summary section in `frontend/app/ranking/`
- [x] T013 [US1] Wire the home page to the seeded mock events and ranking data in `frontend/data/`
- [x] T014 [US1] Apply the orange-and-white visual treatment and youth-focused card hierarchy in `frontend/app/(tabs)/index.tsx` and `frontend/theme/`
- [x] T015 [US1] Add responsive empty-state handling for missing featured events in `frontend/app/(tabs)/index.tsx`

**Checkpoint**: The home page should be demoable on its own and communicate the product idea immediately.

---

## Phase 4: User Story 2 - Review Personal Profile (Priority: P2)

**Goal**: Show a mock profile with account identity, avatar, elo, and summary stats.

**Independent Test**: Open the profile page and confirm the mock avatar, account name, elo, and summary stats are visible.

### Implementation for User Story 2

- [x] T016 [P] [US2] Build the profile page layout in `frontend/app/(tabs)/profile.tsx`
- [x] T017 [P] [US2] Create the mock profile summary component in `frontend/components/`
- [x] T018 [US2] Wire the profile page to the seeded mock profile data in `frontend/data/`
- [x] T019 [US2] Add profile-specific responsive styling and long-name handling in `frontend/app/(tabs)/profile.tsx` and `frontend/theme/`
- [x] T020 [US2] Show the profile-linked ranking summary inside the profile page when needed in `frontend/app/(tabs)/profile.tsx`

**Checkpoint**: The profile page should stand alone as a believable mock identity surface.

---

## Phase 5: User Story 3 - Manage Social Prediction Groups (Priority: P3)

**Goal**: Show social groups and friends, with session-only add/remove interactions.

**Independent Test**: Open the social page and confirm groups, friends, and add/remove interactions work in-session.

### Implementation for User Story 3

- [x] T021 [P] [US3] Build the social page layout in `frontend/app/(tabs)/social.tsx`
- [x] T022 [P] [US3] Create the mock group and friend list components in `frontend/components/`
- [x] T023 [US3] Wire the social page to the seeded mock groups and friends in `frontend/data/`
- [x] T024 [US3] Connect add/remove friend interactions to the local session state in `backend/bethany_mock/session_state.py`
- [x] T025 [US3] Add empty-state guidance for an empty friends list in `frontend/app/(tabs)/social.tsx`

**Checkpoint**: Social prediction groups should be visible and interactive at a mock-session level.

---

## Phase 6: User Story 4 - Navigate Across Main Sections (Priority: P1)

**Goal**: Let the user switch between home, profile, and social through a persistent bottom navigation bar.

**Independent Test**: Tap each bottom tab and confirm the active section changes correctly on web and mobile.

### Implementation for User Story 4

- [x] T026 [P] [US4] Finish the persistent bottom navigation behavior in `frontend/app/_layout.tsx`
- [x] T027 [P] [US4] Ensure safe-area and tap-target sizing for the bottom bar in `frontend/app/_layout.tsx` and `frontend/theme/`
- [x] T028 [US4] Preserve navigation state across tab changes in `frontend/app/_layout.tsx`
- [x] T029 [US4] Verify the home, profile, and social routes are the only primary tabs in `frontend/app/(tabs)/`
- [x] T030 [US4] Document the web and Expo mobile navigation walkthrough in `specs/001-prototipo/quickstart.md`

**Checkpoint**: The prototype navigation should feel simple, mobile-friendly, and consistent across platforms.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency work across the full prototype.

- [x] T031 [P] Refine accessibility labels, contrast, and readable spacing across `frontend/app/` and `frontend/components/`
- [x] T032 [P] Normalize mock copy, labels, and Spanish-facing wording across `frontend/data/` and `specs/001-prototipo/spec.md`
- [x] T033 Review and simplify any duplicated mock logic in `backend/bethany_mock/`
- [x] T034 Confirm the prototype still matches the mock-only scope and the embedded ranking decision in `specs/001-prototipo/plan.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - blocks all user stories
- **User Stories (Phase 3+)**: Depend on Foundational completion
- **Polish (Final Phase)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational; no dependency on other stories
- **User Story 2 (P2)**: Can start after Foundational; can be demoed independently
- **User Story 3 (P3)**: Can start after Foundational; can be demoed independently
- **User Story 4 (P1)**: Depends on the shared shell from Foundational, but not on the visual content of other stories

### Within Each User Story

- Build the shared shell and data first
- Implement the primary view
- Add session-only interactions if applicable
- Finish responsive and visual polish for the story

### Parallel Opportunities

- Setup tasks marked [P] can run in parallel
- Foundational tasks marked [P] can run in parallel once the app shell direction is fixed
- User Story 1 and User Story 2 can be worked on in parallel after the foundation is ready
- User Story 3 can proceed in parallel with the content stories once the session state helper exists
- Polish tasks marked [P] can run in parallel after the main views are stable

---

## Parallel Example: User Story 1

```text
Task: "Build the home page event feed in frontend/app/(tabs)/index.tsx"
Task: "Build the embedded global ranking summary section in frontend/app/ranking/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate the home page and embedded ranking summary
5. Demo the prototype entry point if ready

### Incremental Delivery

1. Establish the local foundation
2. Deliver Home and ranking first
3. Add the profile page
4. Add social group interactions
5. Finish with navigation and polish

### Parallel Team Strategy

1. One contributor can work on Home and ranking while another prepares Profile
2. Another contributor can prepare the social session-state helpers
3. Navigation and polish can happen once the shared shell is stable

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- TDD remains deferred until explicitly activated
- Keep the prototype mock-only and local-first