# Tasks: Ventana Social (Amigos y Grupos de Predicciones)

**Input**: Design documents from `/specs/004-social/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/social-api.md

**Tests**: TDD is Deferred for this feature, so test-first tasks are not required unless explicitly requested later.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

**Status note (2026-07-13, updated)**: All 41 tasks are implemented. T001–T021, T025–T026, T033–T034 predate this session (verified against the running code). T022–T024, T027–T039 were implemented and verified in this session: schema/model lifecycle fields, closing-date validation, vote cutoff, resolve/abort (backend + UI), ranking computation (backend + `GroupRanking` UI component), and a local DB reset (old file renamed to `bethany.sqlite3.pre-amendment2.bak`, not deleted, since it had local test data). T040 needed no changes — `quickstart.md` copy already matched the implementation. T041's backend flows were verified with an isolated smoke test (throwaway SQLite DB, separate port, `urllib`) covering propose-with-closing-date, past/missing-`closesAt` rejection, vote-after-close rejection (409), non-author resolve rejection (403), resolve/abort, double-resolve rejection (409), and ranking correctness (including that aborted predictions don't count). The actual `frontend/app/(tabs)/groups/[groupId].tsx` UI was **not** exercised in a browser — no headless browser is available in this environment — so a manual pass in Expo web is still recommended before considering this fully done.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel when the files and dependencies do not overlap
- **[Story]**: Which user story the task belongs to, e.g. US1, US2, US3
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new module skeletons the Social feature will fill in

- [x] T001 [P] Create the social persistence module skeleton in `backend/bethany_mock/social_repository.py`
- [x] T002 [P] Add `FriendRequest`, `PredictionGroup`, `GroupMembership`, `GroupInvite`, `CustomPrediction`, `PredictionVote` dataclasses in `backend/bethany_mock/models.py`
- [x] T003 [P] Create the frontend social API client and group detail route scaffolding in `frontend/data/social.ts` and `frontend/app/(tabs)/groups/[groupId].tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the schema, repository operations, and API routing every user story depends on

**⚠️ Critical**: No user story work should start until this phase is complete

- [x] T004 Add `friend_requests`, `prediction_groups`, `group_memberships`, `group_invites`, `custom_predictions`, and `prediction_votes` tables to the schema in `backend/bethany_mock/database.py`
- [x] T005 [P] Implement friend request send/accept/reject/list/remove operations that validate against real accounts and resolve display name and elo live from each friend's `AccountProfile` in `backend/bethany_mock/social_repository.py`
- [x] T006 [P] Implement group create/list/get, invite/accept/reject membership, and custom-prediction create/vote operations in `backend/bethany_mock/social_repository.py`
- [x] T007 Wire all `/social/friends*` and `/social/groups*` routes onto the existing session-authenticated request handler in `backend/bethany_mock/api.py`
- [x] T008 [P] Add typed request helpers for every `/social/*` endpoint in `frontend/data/social.ts`
- [x] T009 [P] Add `SocialFriend`, `FriendRequest`, `GroupSummary`, `GroupDetail`, and related types in `frontend/data/social.ts`

**Checkpoint**: The backend can persist and serve friends (with live elo), prediction groups, invites, predictions, and votes; the frontend can call every `/social/*` endpoint. ✅ Done.

---

## Phase 3: User Story 1 - Solicitar amistad y aceptar o rechazar solicitudes (Priority: P1) 🎯 MVP

**Goal**: Let a user send a friend request by identifier, and let the recipient accept or reject it before a friendship exists

**Independent Test**: Send a friend request, confirm it appears as pending for the recipient, and confirm accepting creates a mutual friendship (or rejecting discards it)

### Implementation for User Story 1

- [x] T010 [P] [US1] Build the add-friend input with self/duplicate-request error feedback in `frontend/app/(tabs)/social.tsx`
- [x] T011 [P] [US1] Render incoming and outgoing pending requests with accept/reject actions in `frontend/app/(tabs)/social.tsx` and `frontend/components/FriendRow.tsx`
- [x] T012 [US1] Enforce self-request and duplicate-request (any direction) rejection for `POST /social/friends` in `backend/bethany_mock/social_repository.py`
- [x] T013 [US1] Implement `POST /social/friends/requests/{requestId}/accept|reject` in `backend/bethany_mock/social_repository.py` and `backend/bethany_mock/api.py`

**Checkpoint**: User Story 1 lets a user send, accept, and reject friend requests independently of groups or sorting. ✅ Done.

---

## Phase 4: User Story 2 - Eliminar amigos (Priority: P1)

**Goal**: Let a user remove an existing friend from the Social tab

**Independent Test**: Remove an existing friend and confirm it disappears from both accounts' friend lists

### Implementation for User Story 2

- [x] T014 [US2] Wire the remove-friend action to `DELETE /social/friends/{friendAccountId}` in `frontend/app/(tabs)/social.tsx` and `frontend/data/social.ts`
- [x] T015 [US2] Enforce accepted-friendship-only removal, reflected for both accounts, in `backend/bethany_mock/social_repository.py`

**Checkpoint**: User Stories 1 and 2 both work independently. ✅ Done.

---

## Phase 5: User Story 3 - Crear grupo de predicciones e invitar amigos con aceptacion (Priority: P2)

**Goal**: Let a user create a prediction group and invite friends, who must accept before becoming members

**Independent Test**: Create a group, invite an existing friend, confirm the invite is pending for the invitee, and confirm accepting adds them as a member (or rejecting does not)

### Implementation for User Story 3

- [x] T016 [P] [US3] Build the create-group action and form in `frontend/components/CreateGroupModal.tsx`
- [x] T017 [P] [US3] Build the group detail screen with member list, pending invites, invite-friend action, and back button in `frontend/app/(tabs)/groups/[groupId].tsx`
- [x] T018 [US3] Enforce friends-only invites and duplicate-membership/duplicate-invite rejection for `POST /social/groups/{groupId}/members` in `backend/bethany_mock/social_repository.py`
- [x] T019 [US3] Implement `POST /social/groups/invites/{inviteId}/accept|reject`, creating the `GroupMembership` on accept, in `backend/bethany_mock/social_repository.py` and `backend/bethany_mock/api.py`

**Checkpoint**: User Stories 1–3 all work independently. ✅ Done.

---

## Phase 6: User Story 4 - Proponer predicciones personalizadas en un grupo (Priority: P2)

**Goal**: Let group members propose a custom prediction (question + options + closing date) visible to the whole group

**Independent Test**: Propose a custom prediction with a question, at least two options, and a future closing date inside an existing group, and confirm it (with its closing date and `open` status) is visible from the group detail view

### Implementation for User Story 4

- [x] T020 [US4] Build the custom-prediction proposal form (question + options) in `frontend/app/(tabs)/groups/[groupId].tsx`
- [x] T021 [US4] Enforce a non-empty question and a minimum of two valid options for `POST /social/groups/{groupId}/predictions` in `backend/bethany_mock/social_repository.py`
- [x] T022 [US4] Add `closes_at`, `status` (`open`/`resolved`/`aborted`, default `open`), `resolved_option`, and `resolved_at` columns to `custom_predictions` in `backend/bethany_mock/database.py`; add matching fields to `CustomPrediction` in `backend/bethany_mock/models.py` (see `data-model.md` CustomPrediction, `research.md` Decision 8)
- [x] T023 [US4] Require and validate a future `closesAt` in `add_prediction()`, storing it and defaulting new predictions to `status='open'`, in `backend/bethany_mock/social_repository.py` (`FR-018`, `FR-019`, `FR-028`)
- [x] T024 [US4] Add a closing-date input to the proposal form, and surface `closesAt`/`status`/`resolvedOption` on each prediction card, in `frontend/app/(tabs)/groups/[groupId].tsx` and `frontend/data/social.ts`

**Checkpoint**: User Stories 1–4 all work independently. ✅ Done.

---

## Phase 7: User Story 5 - Votar en las predicciones de un grupo (Priority: P2)

**Goal**: Let group members vote on a custom prediction's options while it is open, and change their vote

**Independent Test**: Vote on an option of an existing prediction and confirm the tally updates for all members; vote again and confirm the previous vote is replaced, not duplicated

### Implementation for User Story 5

- [x] T025 [US5] Build the vote UI (option buttons, live tally, own-vote highlight) in `frontend/app/(tabs)/groups/[groupId].tsx`
- [x] T026 [US5] Implement upsert voting (`cast_vote`) enforcing group membership and a valid option for `POST /social/groups/{groupId}/predictions/{predictionId}/votes` in `backend/bethany_mock/social_repository.py`
- [x] T027 [US5] Reject votes once a prediction's `closes_at` has passed or its `status` is no longer `open` (`FR-029`) in `cast_vote()` in `backend/bethany_mock/social_repository.py`, and surface the resulting `409` in `frontend/app/(tabs)/groups/[groupId].tsx` — depends on T022

**Checkpoint**: User Stories 1–5 all work independently. ✅ Done.

---

## Phase 8: User Story 6 - Resolver o abortar una prediccion personalizada (Priority: P2) 🆕

**Goal**: Let a prediction's author mark the correct option (at or before its closing date) or abort it without a winner, closing it to further votes either way

**Independent Test**: As the author, resolve a prediction with existing votes by marking an option correct, and confirm it closes to voting and records who guessed correctly; separately, abort a different prediction and confirm no member is credited with a correct guess

### Implementation for User Story 6

- [x] T028 [US6] Implement `resolve_prediction(group_id, prediction_id, requester_account_id, option)` — author-only, requires `status == 'open'`, sets `status='resolved'`, `resolved_option`, `resolved_at` — in `backend/bethany_mock/social_repository.py` (`FR-030`, `FR-031`, `FR-033`; see `research.md` Decision 9 for why early finalization uses the same operation) — depends on T022
- [x] T029 [US6] Implement `abort_prediction(group_id, prediction_id, requester_account_id)` — author-only, requires `status == 'open'`, sets `status='aborted'`, `resolved_at`, no `resolved_option` — in `backend/bethany_mock/social_repository.py` (`FR-032`, `FR-033`) — depends on T022
- [x] T030 [US6] Wire `POST /social/groups/{groupId}/predictions/{predictionId}/resolve` and `.../abort` onto the session-authenticated handler in `backend/bethany_mock/api.py`
- [x] T031 [P] [US6] Add `resolvePrediction`/`abortPrediction` request helpers and extend the `CustomPrediction` type with `status`/`resolvedOption`/`resolvedAt` in `frontend/data/social.ts`
- [x] T032 [US6] Show author-only resolve/abort controls on each open prediction, and a resolved/aborted badge on closed ones, in `frontend/app/(tabs)/groups/[groupId].tsx`

**Checkpoint**: User Stories 1–6 all work independently. ✅ Done.

---

## Phase 9: User Story 7 - Ordenar la lista de amigos (Priority: P3)

**Goal**: Let a user sort their friends list by elo ascending, elo descending, or alphabetically

**Independent Test**: With friends of different elo, switch sort options and confirm the displayed order changes correctly for each, with an alphabetical tie-break on equal elo

### Implementation for User Story 7

- [x] T033 [P] [US7] Build the sort control (elo ascending / elo descending / alphabetical) in `frontend/components/FriendSortControl.tsx`
- [x] T034 [US7] Apply client-side sorting with an alphabetical tie-break to the rendered friends list in `frontend/app/(tabs)/social.tsx`

**Checkpoint**: User Stories 1–7 all work independently. ✅ Done.

---

## Phase 10: User Story 8 - Ver el ranking de aciertos del grupo (Priority: P3) 🆕

**Goal**: Show a per-member ranking on the group screen, ordered by number of correctly guessed (resolved) predictions

**Independent Test**: With a group containing several resolved predictions with different winners, open the group screen and confirm the ranking lists every member with their correct-guess count, ordered descending with an alphabetical tie-break

### Implementation for User Story 8

- [x] T035 [US8] Compute, per group member, the count of resolved `custom_predictions` in the group where the member's `prediction_votes.option` matches `resolved_option` (aborted and still-open predictions contribute nothing) in `backend/bethany_mock/social_repository.py` (`FR-034`) — depends on T028/T029
- [x] T036 [US8] Sort the computed ranking descending by count with an alphabetical `display_name` tie-break, zero-filling members with no correct predictions, and include it as `ranking` in `serialize_group_detail()` in `backend/bethany_mock/social_repository.py` (`FR-035`, `FR-036`)
- [x] T037 [P] [US8] Build `frontend/components/GroupRanking.tsx` rendering the member ranking list (name + correct count)
- [x] T038 [US8] Render `GroupRanking` in the group detail screen using the `ranking` field from `getGroup()` in `frontend/app/(tabs)/groups/[groupId].tsx` and `frontend/data/social.ts`

**Checkpoint**: All eight user stories work independently. ✅ Done.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Final documentation, validation, and cleanup across the whole feature

- [x] T039 [P] Renamed the local `backend/data/bethany.sqlite3` to `bethany.sqlite3.pre-amendment2.bak` (kept as backup instead of deleted) so a fresh DB with the new schema is created on next backend start, since this project has no migration mechanism (`research.md` Decision 12)
- [x] T040 [P] Reviewed `specs/004-social/quickstart.md` against the implementation; no copy/step changes were needed
- [x] T041 Ran an isolated backend smoke check (throwaway SQLite DB + separate port) covering propose-with-closing-date, past/missing-`closesAt` rejection, vote-after-close rejection, non-author resolve rejection, resolve, abort, double-resolve rejection, and ranking correctness — all assertions passed. The frontend UI itself was not exercised in a browser (no headless browser available in this environment); a manual Expo web pass is still recommended.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Done
- **Foundational (Phase 2)**: Done — blocked all user stories, now unblocks them
- **All user stories (Phases 3–10)**: Done, and independently testable per their Independent Test above
- **Polish (Phase 11)**: Done — see the Status note for what was and wasn't hands-on verified

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on other stories
- **User Story 2 (P1)**: No dependency on other stories
- **User Story 3 (P2)**: Easiest to validate after US1 (needs a friend to invite)
- **User Story 4 (P2)**: Easiest to validate after US3 (needs a group to propose into)
- **User Story 5 (P2)**: Needs a prediction from US4 to vote on
- **User Story 6 (P2)**: Needs votes from US5 to see resolution have an effect, and the schema from US4's T022
- **User Story 7 (P3)**: Only needs the friends list rendered by US1 to be meaningful to test
- **User Story 8 (P3)**: Needs resolved predictions from US6 to show non-zero counts

### Within Each User Story

- Story tasks should be completed in order when a task depends on a file created by an earlier task
- Tasks marked `[P]` can be done in parallel because they touch different files or isolated slices of the same feature
- T028 and T029 (resolve/abort) can be built in parallel with each other once T022 lands (different functions, same file, low collision risk, but land as separate commits if working with multiple contributors)
- T035 and T036 (ranking computation and sorting) should land together since they're the same function's logic

### Parallel Opportunities

- T022 (schema) blocks T023, T024, T027, T028, T029; land it first
- T031 (frontend request helpers) can be built in parallel with T028–T030 (backend) since they touch different files
- T037 (`GroupRanking` component) can be built in parallel with T035–T036 (backend ranking computation) since they touch different files, then wired together in T038

---

## Parallel Example: User Story 6

```bash
# Once T022 (schema) is done, resolve and abort can be implemented together:
Task: "Implement resolve_prediction(...) in backend/bethany_mock/social_repository.py"
Task: "Implement abort_prediction(...) in backend/bethany_mock/social_repository.py"
# ...while the frontend client stub is built independently:
Task: "Add resolvePrediction/abortPrediction request helpers in frontend/data/social.ts"
```

---

## Implementation Strategy

### Current State (as of 2026-07-13)

All 8 user stories are implemented, including the 2026-07-13 amendment (prediction closing date, resolve/abort, group ranking). See the Status note at the top of this file for what was verified this session and the one remaining manual-verification gap (frontend UI in an actual browser).

---

## Notes

- `[P]` tasks = different files and no blocking dependency on unfinished work
- `[Story]` labels map directly to the prioritized user stories in `spec.md`
- TDD is deferred, so the task list focuses on implementation and validation rather than test-first ordering
- Friend requests and group invites require explicit accept/reject; there is no immediate-add path (see `spec.md` Amendment, 2026-07-12)
- Elo shown for a friend or group member must always be resolved live from that account's profile, never cached or duplicated
- Resolving and finalizing a prediction early are the same backend operation (`research.md` Decision 9) — there is no separate "early finalize" endpoint or status
- The group ranking is computed on every `GET /social/groups/{groupId}` call, not stored (`research.md` Decision 11)
