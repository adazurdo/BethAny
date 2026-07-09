# Tasks: base de datos

**Input**: Design documents from `/specs/002-base-de-datos/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: TDD is Deferred for this feature, so test-first tasks are not required unless explicitly requested later.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel when the files and dependencies do not overlap
- **[Story]**: Which user story the task belongs to, e.g. US1, US2, US3
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the local backend/frontend scaffolding needed for authentication and account persistence

- [ ] T001 Create the local backend API entrypoint and dependency manifest in `backend/requirements.txt`, `backend/scripts/run_local_api.py`, and `backend/bethany_mock/api.py`
- [ ] T002 [P] Create the SQLite persistence and account-domain module skeleton in `backend/bethany_mock/database.py`, `backend/bethany_mock/account_repository.py`, and `backend/bethany_mock/models.py`
- [ ] T003 [P] Create the frontend auth route group scaffolding and auth client placeholder in `frontend/app/(auth)/_layout.tsx`, `frontend/app/(auth)/index.tsx`, `frontend/app/(auth)/login.tsx`, `frontend/app/(auth)/register.tsx`, and `frontend/data/auth.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the persistence, auth, and app bootstrap layers that every user story depends on

**⚠️ Critical**: No user story work should start until this phase is complete

- [ ] T004 Define the SQLite schema, table initialization, and connection helper in `backend/bethany_mock/database.py`
- [ ] T005 [P] Define the account aggregate models and ephemeral session container in `backend/bethany_mock/models.py` and `backend/bethany_mock/session_state.py`
- [ ] T006 [P] Implement register, login, logout, and account lookup operations in `backend/bethany_mock/account_repository.py` and `backend/bethany_mock/api.py`
- [ ] T007 Wire the backend server startup and module exports in `backend/scripts/run_local_api.py` and `backend/bethany_mock/__init__.py`
- [ ] T008 [P] Build the frontend auth client, session bootstrap, and request helpers in `frontend/data/auth.ts` and `frontend/app/_layout.tsx`
- [ ] T009 Add auth-aware route gating so unauthenticated users land on the access flow in `frontend/app/index.tsx` and `frontend/app/(tabs)/_layout.tsx`

**Checkpoint**: The backend can persist accounts locally, the frontend can call the auth surface, and unauthenticated users are blocked from the main app.

---

## Phase 3: User Story 1 - Entry Gate for Access (Priority: P1) 🎯 MVP

**Goal**: Show a dedicated access screen first, with clear options to register or sign in

**Independent Test**: Open the app from a fresh state and verify the first screen is the access gate instead of the main content

### Implementation for User Story 1

- [ ] T010 [P] [US1] Build the access-gate landing screen with visible register and sign-in entry points in `frontend/app/(auth)/index.tsx`
- [ ] T011 [P] [US1] Create reusable access-choice UI components in `frontend/components/AuthChoice.tsx`
- [ ] T012 [US1] Connect root routing to the access gate before the main tabs in `frontend/app/_layout.tsx` and `frontend/app/index.tsx`

**Checkpoint**: User Story 1 should now show the access gate first and keep the main app hidden until a user authenticates.

---

## Phase 4: User Story 2 - Create and Reuse Accounts (Priority: P1)

**Goal**: Let users register locally, sign in later with the same credentials, and log out cleanly

**Independent Test**: Register a new account, sign out, sign back in with the same credentials, and confirm the account is recognized

### Implementation for User Story 2

- [ ] T013 [P] [US2] Build the registration form and client-side validation in `frontend/app/(auth)/register.tsx`
- [ ] T014 [P] [US2] Build the login form and client-side validation in `frontend/app/(auth)/login.tsx`
- [ ] T015 [US2] Enforce duplicate-account and credential checks in `backend/bethany_mock/account_repository.py` and `backend/bethany_mock/api.py`
- [ ] T016 [US2] Persist new accounts and current-session state through the auth client in `frontend/data/auth.ts`
- [ ] T017 [US2] Add logout handling that clears the current session and returns to the access gate in `frontend/app/(tabs)/profile.tsx` and `frontend/app/_layout.tsx`

**Checkpoint**: User Story 2 should now support register, sign in, and logout with local persistence.

---

## Phase 5: User Story 3 - Restore Saved Account Data (Priority: P2)

**Goal**: Restore profile, elo, bets, and friendships for the signed-in account on later sessions

**Independent Test**: Sign in with an existing account and confirm the same profile, elo, bets, and friends reappear exactly as saved

### Implementation for User Story 3

- [ ] T018 [P] [US3] Model persisted profile, elo, bets, and friendships as account-owned data in `backend/bethany_mock/models.py` and `backend/bethany_mock/account_repository.py`
- [ ] T019 [US3] Restore the full account aggregate on sign-in in `backend/bethany_mock/api.py` and `backend/bethany_mock/session_state.py`
- [ ] T020 [P] [US3] Rehydrate account-owned state into the frontend stores in `frontend/components/BetSlipContext.tsx` and `frontend/components/ProfileSummary.tsx`
- [ ] T021 [US3] Bind the home, profile, social, and bet-slip screens to the signed-in account data in `frontend/app/(tabs)/index.tsx`, `frontend/app/(tabs)/profile.tsx`, `frontend/app/(tabs)/social.tsx`, `frontend/components/EventCard.tsx`, and `frontend/components/FriendRow.tsx`
- [ ] T022 [US3] Persist edits to profile, elo, bets, and friendships back to SQLite through the auth client in `frontend/components/ProfileSummary.tsx`, `frontend/components/EventCard.tsx`, `frontend/components/FriendRow.tsx`, and `frontend/data/auth.ts`

**Checkpoint**: User Story 3 should now restore the account-owned state on later sign-ins.

---

## Phase 6: User Story 4 - Protect Main App Access After Login (Priority: P2)

**Goal**: Keep the app in a controlled state so the access gate appears again after logout or restart

**Independent Test**: Start from a signed-out state, restart the app, and verify the access gate appears again instead of a remembered account

### Implementation for User Story 4

- [ ] T023 [US4] Keep the app on the access screen after restart unless a fresh sign-in occurs in `frontend/app/_layout.tsx` and `frontend/data/auth.ts`
- [ ] T024 [US4] Clear the active session and reset authenticated UI state on logout in `backend/bethany_mock/session_state.py` and `frontend/app/(tabs)/profile.tsx`

**Checkpoint**: User Story 4 should now enforce the access gate on restart and after logout.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final documentation, validation, and cleanup across the whole feature

- [ ] T025 [P] Update the validation guide with register, login, logout, and account-restore checks in `specs/002-base-de-datos/quickstart.md`
- [ ] T026 [P] Refresh research notes for deferred security and any follow-up constraints in `specs/002-base-de-datos/research.md`
- [ ] T027 Run a local smoke check for the access gate and account restore flow against `frontend/app/_layout.tsx`, `frontend/app/index.tsx`, and `specs/002-base-de-datos/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies and can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories
- **User Stories (Phase 3+)**: Depend on the Foundational phase and can then proceed in priority order or in parallel where marked
- **Polish (Final Phase)**: Depends on the desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after the Foundational phase; no dependency on other stories
- **User Story 2 (P1)**: Can start after the Foundational phase; can be built alongside US1 if needed
- **User Story 3 (P2)**: Can start after the Foundational phase and uses the persisted account state built earlier
- **User Story 4 (P2)**: Can start after the Foundational phase and depends on the access gate and logout flow being present

### Within Each User Story

- Story tasks should be completed in order when a task depends on a file created by an earlier task
- Tasks marked `[P]` can be done in parallel because they touch different files or isolated slices of the same feature
- User Story 1 should be ready before moving to the heavier account flows
- User Story 2 should be validated before expanding into account-state restore
- User Story 3 should preserve the existing mock app behavior while adding persistence
- User Story 4 should be the final behavior gate before polish

### Parallel Opportunities

- All Setup tasks marked `[P]` can run in parallel after the initial backend/frontend skeleton exists
- Foundational tasks marked `[P]` can run in parallel once the schema and auth surface direction is agreed
- Within US1, the access screen and reusable UI components can be built in parallel
- Within US2, the register and login forms can be built in parallel
- Within US3, the backend account aggregate and the frontend rehydration work can proceed in parallel
- The final documentation updates can be done in parallel with the last smoke check preparation

---

## Parallel Example: User Story 2

```bash
# Launch the registration and login UI work together:
Task: "Build the registration form and client-side validation in `frontend/app/(auth)/register.tsx`"
Task: "Build the login form and client-side validation in `frontend/app/(auth)/login.tsx`"

# Launch account validation and session plumbing together:
Task: "Enforce duplicate-account and credential checks in `backend/bethany_mock/account_repository.py` and `backend/bethany_mock/api.py`"
Task: "Persist new accounts and current-session state through the auth client in `frontend/data/auth.ts`"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Stop and validate that the access gate is the first screen

### Incremental Delivery

1. Complete Setup + Foundational so the backend and frontend can talk
2. Add User Story 1 and confirm the access gate blocks the main app
3. Add User Story 2 and confirm register/login/logout work locally
4. Add User Story 3 and confirm account-owned data is restored on later sign-ins
5. Add User Story 4 so restart and logout behavior stays controlled
6. Finish with documentation and smoke checks

### Parallel Team Strategy

With more than one contributor:

1. One person can own the backend schema and repository work while another builds the frontend auth routes
2. After the foundation is ready, US1 and US2 can proceed in parallel if needed
3. US3 backend persistence and US3 frontend rehydration can also be split across contributors
4. Use the polish phase to align docs, quickstart, and smoke validation

---

## Notes

- `[P]` tasks = different files and no blocking dependency on unfinished work
- `[Story]` labels map directly to the prioritized user stories in `spec.md`
- TDD is deferred, so the task list focuses on implementation and validation rather than test-first ordering
- Avoid adding remembered login or cloud sync in this feature
- Keep the implementation local-first and account-scoped
