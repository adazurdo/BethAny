# Tasks: Ventana Social (Amigos y Grupos de Predicciones)

**Input**: Design documents from `/specs/004-social/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/social-api.md

**Tests**: TDD is Deferred for this feature, so test-first tasks are not required unless explicitly requested later.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel when the files and dependencies do not overlap
- **[Story]**: Which user story the task belongs to, e.g. US1, US2, US3, US4
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new module skeletons the Social feature will fill in

- [ ] T001 [P] Create the social persistence module skeleton in `backend/bethany_mock/social_repository.py`
- [ ] T002 [P] Add `Friend`, `PredictionGroup`, `GroupMembership`, and `CustomPrediction` dataclass skeletons in `backend/bethany_mock/models.py`
- [ ] T003 [P] Create the frontend social API client skeleton and group detail route scaffolding in `frontend/data/social.ts` and `frontend/app/groups/[groupId].tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the schema, repository operations, and API routing every user story depends on

**⚠️ Critical**: No user story work should start until this phase is complete

- [ ] T004 Add `friendships`, `prediction_groups`, `group_memberships`, and `custom_predictions` tables to the schema in `backend/bethany_mock/database.py`
- [ ] T005 [P] Implement friend add/remove/list operations that validate against real accounts and resolve display name and elo live from each friend's `AccountProfile` in `backend/bethany_mock/account_repository.py`
- [ ] T006 [P] Implement group create/list/get, membership add, and custom-prediction create operations in `backend/bethany_mock/social_repository.py`
- [ ] T007 Wire `POST/DELETE /social/friends` and `POST/GET /social/groups*` onto the existing session-authenticated request handler in `backend/bethany_mock/api.py`
- [ ] T008 [P] Add typed request helpers (`addFriend`, `removeFriend`, `createGroup`, `listGroups`, `getGroup`, `inviteGroupMember`, `proposeCustomPrediction`) in `frontend/data/social.ts`
- [ ] T009 [P] Extend friend and account types with `accountId` and live `elo` in `frontend/data/auth.ts`

**Checkpoint**: The backend can persist and serve friends (with live elo) and prediction groups; the frontend can call every `/social/*` endpoint.

---

## Phase 3: User Story 1 - Añadir y eliminar amigos (Priority: P1) 🎯 MVP

**Goal**: Let a user add a friend by identifier (validated against a real account) and remove an existing friend from the Social tab

**Independent Test**: Add a friend by a valid identifier and confirm it appears in the list; remove it and confirm it disappears

### Implementation for User Story 1

- [ ] T010 [P] [US1] Build the add-friend input with duplicate/self-add error feedback in `frontend/app/(tabs)/social.tsx`
- [ ] T011 [P] [US1] Adapt `FriendRow` to real add/remove semantics and display each friend's elo in `frontend/components/FriendRow.tsx`
- [ ] T012 [US1] Enforce self-add and duplicate-friend rejection for `POST /social/friends` in `backend/bethany_mock/account_repository.py` and `backend/bethany_mock/api.py`
- [ ] T013 [US1] Wire the remove-friend action to `DELETE /social/friends/{friendAccountId}` in `frontend/app/(tabs)/social.tsx` and `frontend/data/social.ts`

**Checkpoint**: User Story 1 should now let a user add and remove friends independently of groups or sorting.

---

## Phase 4: User Story 2 - Crear grupo de predicciones e invitar amigos (Priority: P2)

**Goal**: Let a user create a prediction group and invite friends from their friend list into it

**Independent Test**: Create a group, invite an existing friend, and confirm the friend appears as a group member

### Implementation for User Story 2

- [ ] T014 [P] [US2] Build the create-group action and form in `frontend/components/CreateGroupModal.tsx`
- [ ] T015 [P] [US2] Adapt `GroupCard` to real member counts and navigation into group detail in `frontend/components/GroupCard.tsx` and `frontend/app/(tabs)/social.tsx`
- [ ] T016 [US2] Build the group detail screen with member list and invite-friend action in `frontend/app/groups/[groupId].tsx`
- [ ] T017 [US2] Enforce friends-only invites and duplicate-membership rejection for `POST /social/groups/{groupId}/members` in `backend/bethany_mock/social_repository.py` and `backend/bethany_mock/api.py`

**Checkpoint**: User Stories 1 AND 2 should both work independently.

---

## Phase 5: User Story 3 - Proponer predicciones personalizadas en un grupo (Priority: P2)

**Goal**: Let group members propose a custom prediction (question + options) visible to the whole group

**Independent Test**: Propose a custom prediction inside an existing group and confirm it is visible from the group detail view

### Implementation for User Story 3

- [ ] T018 [P] [US3] Build the custom-prediction proposal form (question + options) in `frontend/app/groups/[groupId].tsx`
- [ ] T019 [US3] Render the group's custom predictions list for all members in `frontend/app/groups/[groupId].tsx`
- [ ] T020 [US3] Enforce a non-empty question and a minimum of two valid options for `POST /social/groups/{groupId}/predictions` in `backend/bethany_mock/social_repository.py` and `backend/bethany_mock/api.py`

**Checkpoint**: User Stories 1, 2, AND 3 should all work independently.

---

## Phase 6: User Story 4 - Ordenar la lista de amigos (Priority: P3)

**Goal**: Let a user sort their friends list by elo ascending, elo descending, or alphabetically

**Independent Test**: With friends of different elo, switch sort options and confirm the displayed order changes correctly for each, with an alphabetical tie-break on equal elo

### Implementation for User Story 4

- [ ] T021 [P] [US4] Build the sort control (elo ascending / elo descending / alphabetical) in `frontend/components/FriendSortControl.tsx`
- [ ] T022 [US4] Apply client-side sorting with an alphabetical tie-break to the rendered friends list in `frontend/app/(tabs)/social.tsx`

**Checkpoint**: All four user stories should now be independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final documentation, validation, and cleanup across the whole feature

- [ ] T023 [P] Update `specs/004-social/quickstart.md` with any UI copy/step changes discovered during implementation
- [ ] T024 [P] Refresh `specs/004-social/research.md` if any deferred decision (e.g., pending invite approval) is revisited during implementation
- [ ] T025 Run a local smoke check for add/remove friend, sort, create group, invite, and propose prediction against `frontend/app/(tabs)/social.tsx`, `frontend/app/groups/[groupId].tsx`, and `specs/004-social/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies and can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories
- **User Stories (Phase 3+)**: Depend on the Foundational phase and can then proceed in priority order or in parallel where marked
- **Polish (Final Phase)**: Depends on the desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after the Foundational phase; no dependency on other stories
- **User Story 2 (P2)**: Can start after the Foundational phase; requires a friend to exist to invite, so it is easiest to validate after US1, though it does not share files that block independent implementation
- **User Story 3 (P2)**: Can start after the Foundational phase; requires a group to exist, so it is easiest to validate after US2
- **User Story 4 (P3)**: Can start after the Foundational phase; only needs the friends list rendered by US1 to be meaningful to test

### Within Each User Story

- Story tasks should be completed in order when a task depends on a file created by an earlier task
- Tasks marked `[P]` can be done in parallel because they touch different files or isolated slices of the same feature
- User Story 1 should be validated before relying on its friend list for User Story 2's invite flow
- User Story 2 should be validated before expanding into User Story 3's custom predictions
- User Story 4 can be implemented any time after Foundational, but is most useful to validate once US1 has produced a non-trivial friends list

### Parallel Opportunities

- All Setup tasks marked `[P]` can run in parallel
- Foundational tasks marked `[P]` can run in parallel once the schema direction (T004) is agreed
- Within US1, the add-friend UI and the `FriendRow` adaptation can be built in parallel
- Within US2, the create-group form and the `GroupCard` adaptation can be built in parallel
- Within US3, the proposal form can be built while the backend validation (T020) is finalized, since they touch different files
- US4's sort control component can be built in parallel with any other story's work once Foundational is done

---

## Parallel Example: User Story 1

```bash
# Launch the add-friend UI and FriendRow adaptation together:
Task: "Build the add-friend input with duplicate/self-add error feedback in `frontend/app/(tabs)/social.tsx`"
Task: "Adapt `FriendRow` to real add/remove semantics and display each friend's elo in `frontend/components/FriendRow.tsx`"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Stop and validate that friends can be added and removed correctly, with live elo shown

### Incremental Delivery

1. Complete Setup + Foundational so the backend and frontend can talk over `/social/*`
2. Add User Story 1 and confirm add/remove friend works with real account validation
3. Add User Story 2 and confirm group creation and friend invites work
4. Add User Story 3 and confirm custom predictions are visible to all group members
5. Add User Story 4 so the friends list can be sorted by elo or alphabetically
6. Finish with documentation and smoke checks

### Parallel Team Strategy

With more than one contributor:

1. One person can own the backend schema and repository work (T004-T007) while another builds the frontend social client and types (T008-T009)
2. After Foundational is ready, US1 and US4 can proceed in parallel since US4 only needs the friends list UI shell from US1's file
3. US2 and US3 can be split across contributors once a group exists to invite into and propose predictions in
4. Use the polish phase to align docs and the final smoke validation

---

## Notes

- `[P]` tasks = different files and no blocking dependency on unfinished work
- `[Story]` labels map directly to the prioritized user stories in `spec.md`
- TDD is deferred, so the task list focuses on implementation and validation rather than test-first ordering
- Keep friend adds and group invites immediate (no pending-approval state) per the spec's Assumptions
- Elo shown for a friend or group member must always be resolved live from that account's profile, never cached or duplicated
