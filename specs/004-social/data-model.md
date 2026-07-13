# Data Model: Ventana Social (Amigos y Grupos de Predicciones)

## Overview

The feature adds shared, consent-based social state on top of the existing account aggregate (`002-base-de-datos`): (1) friend requests that become a symmetric friendship once accepted, (2) prediction groups with invite-based membership, and (3) votes on custom predictions. Elo shown for a friend or group member is always resolved live from that account's own `AccountProfile`, never duplicated. Nothing in this feature is stored inside the per-account `account_state` blob — every entity here is inherently shared between two or more accounts, so each lives in its own table.

## Entities

### FriendRequest

Represents a friend request between two accounts, and — once accepted — the friendship itself.

**Fields**:
- `id`
- `requester_account_id`: the account that sent the request
- `target_account_id`: the account that received the request
- `status`: `pending`, `accepted`, or `rejected`
- `created_at`
- `responded_at`: set when the target accepts or rejects

**Derived (not stored)**:
- `display_name`, `avatar_url`, `elo` for either party: read from that account's current `AccountProfile` when a friend/request list is served.

**Rules**:
- `requester_account_id` and `target_account_id` must reference existing accounts.
- `requester_account_id` MUST NOT equal `target_account_id` (no self-requesting).
- At most one non-rejected `FriendRequest` may exist for a given unordered pair of accounts at a time (no duplicate pending requests, no re-requesting an already-accepted friendship).
- A `status = accepted` row is a symmetric friendship: it appears in both accounts' friend lists.
- Removing a friend deletes the accepted `FriendRequest` row; it does not affect groups the two accounts already share (`FR-025`).

### PredictionGroup

Represents a group of predictions created by one account.

**Fields**:
- `id`
- `name`
- `owner_account_id`: creator of the group
- `created_at`

**Rules**:
- `name` MUST be non-empty.
- The owner is automatically added as a `GroupMembership` at creation time (no invite step for the owner).

### GroupInvite

Represents a pending invitation for a friend to join a `PredictionGroup`.

**Fields**:
- `id`
- `group_id`
- `inviter_account_id`: the existing member who sent the invite
- `invitee_account_id`: the account being invited
- `status`: `pending`, `accepted`, or `rejected`
- `created_at`
- `responded_at`: set when the invitee accepts or rejects

**Rules**:
- `invitee_account_id` MUST already be a friend (accepted `FriendRequest`) of `inviter_account_id` (`FR-014`).
- `inviter_account_id` MUST have an active `GroupMembership` for `group_id`.
- At most one `pending` `GroupInvite` may exist for a given `(group_id, invitee_account_id)` pair, and none if the invitee is already a member (`FR-017`).
- Accepting a `GroupInvite` creates the corresponding `GroupMembership`.

### GroupMembership

Represents one account's active membership in one `PredictionGroup`.

**Fields**:
- `id`
- `group_id`
- `account_id`
- `joined_at`

**Rules**:
- The pair `(group_id, account_id)` MUST be unique (no duplicate membership).
- Created only when a group is created (owner) or when a `GroupInvite` is accepted (`FR-016`).
- A membership row persists even if the underlying friendship between the two accounts is later removed (`FR-025`).

### CustomPrediction

Represents a custom prediction proposed inside a `PredictionGroup`.

**Fields**:
- `id`
- `group_id`
- `created_by_account_id`
- `question`
- `options`: ordered list of option strings
- `created_at`
- `closes_at`: closing date/time set at creation; MUST be in the future when the prediction is created (`FR-018`, `FR-028`)
- `status`: `open`, `resolved`, or `aborted` (default `open`)
- `resolved_option`: one of `options`, set only when `status = resolved`
- `resolved_at`: set only when `status` transitions to `resolved` or `aborted`

**Rules**:
- `question` MUST be non-empty.
- `options` MUST contain at least two non-empty entries (`FR-018`, `FR-019`).
- `closes_at` MUST be a valid future timestamp at creation time (`FR-018`, `FR-019`, `FR-028`).
- Only accounts with an active `GroupMembership` for `group_id` can create a `CustomPrediction` in that group.
- A `CustomPrediction` is visible to every current member of its group (`FR-020`), including `closes_at`, `status`, and — once resolved — `resolved_option` (`FR-028`).
- Only `created_by_account_id` may transition `status` away from `open` (`FR-030`, `FR-031`, `FR-032`, `FR-033`).
- Resolving (`status -> resolved`) requires setting `resolved_option` to one of `options`; this is allowed at or after `closes_at` (normal resolution, `FR-030`) or before `closes_at` (early finalization, `FR-031`) — the author-only, open-status check is identical in both cases, so both are the same operation.
- Aborting (`status -> aborted`) requires no `resolved_option` and is allowed any time before the prediction is resolved (`FR-032`).
- `status` MUST NOT transition once it is `resolved` or `aborted` (`FR-033`).

### PredictionVote

Represents one member's current vote on a `CustomPrediction`.

**Fields**:
- `id`
- `prediction_id`
- `account_id`
- `option`: must match one of the parent prediction's `options`
- `created_at`
- `updated_at`

**Rules**:
- The pair `(prediction_id, account_id)` MUST be unique — at most one active vote per member per prediction (`FR-021`, `FR-023`).
- Casting a new vote for a prediction the member already voted on updates `option`/`updated_at` on the existing row instead of inserting a new one.
- Only accounts with an active `GroupMembership` for the prediction's `group_id` can vote (`FR-022`).
- `option` MUST be one of the prediction's stored `options` (`FR-022`).
- A vote MUST NOT be cast or changed once the parent `CustomPrediction`'s `closes_at` has passed, or once its `status` is no longer `open` (`FR-029`).

### GroupRanking *(derived, not stored)*

A per-`PredictionGroup` view computed from existing rows — not a new table.

**Computation**:
- For each `GroupMembership` of the group, count the `CustomPrediction` rows in that group where `status = resolved` and the member has a `PredictionVote` with `option = resolved_option`.
- `aborted` predictions, and `open` (unresolved) predictions, contribute zero to every member's count (`FR-034`).
- Members with no matching votes appear with a count of `0`.

**Rules**:
- Ordered descending by count; ties broken alphabetically by `display_name` (`FR-035`, `FR-036`).

## Relationships

- One `UserAccount` may be `requester_account_id` or `target_account_id` on many `FriendRequest` rows; accepted rows in either role count as friends.
- One `UserAccount` owns zero or more `PredictionGroup` rows as `owner_account_id`.
- One `PredictionGroup` has many `GroupInvite` rows (pending/resolved invitations), many `GroupMembership` rows (its active members, including the owner), and many `CustomPrediction` rows.
- One `GroupInvite` references exactly one `PredictionGroup`, one inviting `UserAccount`, and one invited `UserAccount`; accepting it produces exactly one `GroupMembership`.
- One `GroupMembership` links exactly one `UserAccount` to exactly one `PredictionGroup`.
- One `CustomPrediction` belongs to exactly one `PredictionGroup` and references the `UserAccount` that created it.
- One `CustomPrediction` has many `PredictionVote` rows, at most one per member.

## Validation Rules

- Sending a friend request must reject an identifier that does not resolve to an existing account.
- Sending a friend request must reject the requester's own identifier.
- Sending a friend request must reject a target that is already a friend, or that has any pending request with the requester in either direction.
- Responding to a friend request must reject a request that is not `pending` or that does not belong to the responding account as `target_account_id`.
- Creating a group must reject an empty name.
- Inviting a member must reject an account that is not already a friend of the inviting member.
- Inviting a member must reject an account already a member of the group, or with a pending invite to that group.
- Responding to a group invite must reject an invite that is not `pending` or that does not belong to the responding account as `invitee_account_id`.
- Proposing a custom prediction must reject a missing question or fewer than two non-empty options.
- Proposing a custom prediction must reject requests from an account that is not a current group member.
- Casting a vote must reject an option not present in the prediction's `options`.
- Casting a vote must reject requests from an account that is not a current member of the prediction's group.
