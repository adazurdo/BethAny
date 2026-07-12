# Research: Ventana Social (Amigos y Grupos de Predicciones)

## Decision 1: Friendship is a shared, symmetric row — not per-account state

- **Decision**: Model friendship as a `FriendRequest` row shared between two accounts (`requester_account_id`, `target_account_id`, `status`), stored in its own table, instead of a directional entry duplicated inside each account's `friends_json` blob. Once `status = accepted`, the row is read as a friendship from either account's point of view. Display name and elo shown in the friends list are still read live from the friend's `AccountProfile` at request time, never copied.
- **Rationale**: The first implementation pass stored friendship as owner-scoped state inside `account_state.friends_json`, which worked for immediate, one-sided adds. Once friend requests require the *other* account to accept or reject (per the 2026-07-12 feedback), the row is inherently shared between two accounts and needs a status two different sessions can both read and mutate — the same reasoning as Decision 2 for groups. A per-account blob can't represent "pending, waiting on the other account" cleanly.
- **Alternatives considered**:
  - Keep the directional per-account model and add a mirrored "pending" entry in both accounts' blobs: rejected because keeping two blobs in sync on every accept/reject is exactly the duplication problem Decision 2 already rejected for groups.
  - Allow adding a friend by free-text name with no backing account: rejected because it can't satisfy self-add/duplicate validation or a real accept/reject flow.

## Decision 2: Groups, memberships, invites, predictions, and votes get their own tables

- **Decision**: Store `PredictionGroup`, `GroupMembership`, `GroupInvite`, `CustomPrediction`, and `PredictionVote` as their own SQLite tables, independent of `account_state`.
- **Rationale**: A group is shared by multiple accounts (owner + invited/accepted members), and now also has a pending-invite state that the invitee must see and respond to independently of the inviter's session. `account_state` is a 1:1 blob per account; embedding any of this there would force the backend to duplicate the same data inside every member's JSON blob and keep N copies in sync on every invite, vote, or new prediction. Dedicated tables make each entity the single source of truth for all parties involved.
- **Alternatives considered**:
  - Embedding `predictionGroups` inside each account's `friends_json`-style blob (extending the original frontend mock shape): rejected for the duplication/sync problem above.
  - A generic key-value/document table for all new entities: rejected as unnecessary indirection for well-defined entities: normalized SQL tables are just as simple and match the existing `accounts` / `account_state` / `competition_sources` pattern in `database.py`.

## Decision 3: Dedicated `/social/*` endpoints instead of extending `PUT /account/me`

- **Decision**: Add `POST /social/friends`, `DELETE /social/friends/{friendAccountId}`, `POST /social/groups`, `GET /social/groups`, `GET /social/groups/{groupId}`, `POST /social/groups/{groupId}/members`, and `POST /social/groups/{groupId}/predictions` as new endpoints, rather than growing the existing `PUT /account/me` "replace whole state" endpoint.
- **Rationale**: `PUT /account/me` today accepts a full replacement array for `friends`, which cannot safely enforce self-add, duplicate, or membership checks server-side — the client would have to get those invariants right itself. `contracts/auth-api.md` from `002-base-de-datos` already anticipates this: "Additional account-state update endpoints can be added later if implementation splits profile, bets, and friends into separate operations."
- **Alternatives considered**:
  - Keep using `PUT /account/me` with a bigger payload that also carries groups: rejected because groups are not account-scoped state (see Decision 2), so they don't fit that endpoint's shape at all.

## Decision 4: Friend list sorting is computed client-side

- **Decision**: The elo-ascending, elo-descending, and alphabetical sort options (FR-007, FR-008) are implemented purely in the frontend, sorting the already-fetched friends array. No `?sort=` query parameter is added to the backend.
- **Rationale**: The mock-stage friend list is small (single local account, a handful of friends). Sorting client-side avoids adding request parameters, backend sort logic, and another thing to keep in sync, in line with the Simplicity principle.
- **Alternatives considered**:
  - Backend-driven sorting via a query parameter: rejected as unnecessary complexity for a dataset this size in the current phase; can be revisited if the friend list grows large enough to matter.

## Decision 5: Friend adds and group invites require accept/reject (revised 2026-07-12)

- **Decision**: `POST /social/friends` and `POST /social/groups/{groupId}/members` create a pending request/invite instead of an immediate friendship/membership. The target account must explicitly accept or reject via a separate endpoint before the relationship becomes active.
- **Rationale**: The original decision (immediate add, no consent step) was the first-pass simplification. User testing surfaced that one-sided adds don't match how a social feature should behave — the other person should get a say. This is a straightforward extension of the same status-column pattern already used for `PredictionGroup`/`GroupMembership` (Decision 2), not a new architectural concept.
- **Alternatives considered**:
  - Keep immediate adds and layer a "block" action on top: rejected because it inverts the expected default (opt-out instead of opt-in), which is not what was requested.
  - Add push notifications for incoming requests/invites: rejected as out of scope for this phase (see spec Assumptions) — the recipient sees pending items when they open the Social tab or the group screen during an active session, which is sufficient for the local-first mock stage.

## Decision 6: Votes are one-per-member-per-prediction, upsertable

- **Decision**: A `PredictionVote` row is unique per `(prediction_id, account_id)`. Casting a new vote for the same prediction updates the existing row instead of inserting a second one.
- **Rationale**: FR-023 requires a member to be able to change their vote without duplicating their participation in the tally. A unique constraint plus an upsert is the simplest way to guarantee "at most one active vote per member" without extra application-level bookkeeping.
- **Alternatives considered**:
  - Store a full vote history (append-only) and compute "current vote" as the latest row per member: rejected as unnecessary complexity — nothing in the spec needs vote history, only the current tally.

## Decision 7: Group detail screen lives inside the tab navigator, not as a separate stack route

- **Decision**: Move the group detail screen from a top-level `app/groups/[groupId].tsx` stack route to `app/(tabs)/groups/[groupId].tsx`, registered as a hidden `Tabs.Screen` (`href: null`) inside the existing `(tabs)/_layout.tsx` Tabs navigator, with a custom back-arrow control that calls `router.back()`.
- **Rationale**: FR-027 requires the bottom tab bar to stay visible while viewing a group, so the user can jump straight to Home/Profile/Social without first backing out. A screen registered directly on the root `Stack` (like `ranking/index` and `matches/index`) replaces the whole screen and drops the tab bar; nesting the route inside the `Tabs` navigator keeps the tab bar mounted for that screen while still not adding a fourth visible tab icon.
- **Alternatives considered**:
  - Keep the top-level stack route and add a custom bottom nav bar duplicated inside it: rejected as duplicated UI/logic that would drift from the real tab bar over time.
