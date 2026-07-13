# Contract: Social (Friends, Prediction Groups, and Voting)

## Purpose

Defines the local API surface the frontend uses to manage friends, prediction groups, and predictions from the "Social" tab and the group detail screen. Extends the account/session contract from `002-base-de-datos` (`contracts/auth-api.md`); all endpoints below require an active session, same as `GET /account/me`.

## Expected Behaviors

- A signed-in user can send a friend request by identifier, validated against a real registered account.
- The recipient of a friend request can accept or reject it; only an accepted request counts as a friendship.
- A signed-in user can remove an existing friend.
- The friends list always reflects each friend's current elo (no stale/duplicated values).
- A signed-in user can create a prediction group and becomes its owner and first member.
- A group member can invite one of their own friends into the group; the invitee must accept before becoming a member.
- A group member can propose a custom prediction, with a closing date, visible to every member of that group.
- A group member can vote on a custom prediction's options while it is open; voting again changes their vote.
- The prediction's author can resolve it (mark the correct option, at or before its closing date) or abort it (no correct option); once resolved or aborted, no further votes are accepted.
- The group detail view includes a ranking of members by number of correctly guessed (resolved) predictions.

## Endpoints

### `GET /social/friends`

Returns the requester's accepted friends, incoming pending requests, and outgoing pending requests.

**Response** (`200`):
```json
{
  "friends": [
    { "requestId": "freq_abc", "accountId": "acct_456", "displayName": "Alex", "avatarUrl": "...", "elo": 1240 }
  ],
  "incomingRequests": [
    { "id": "freq_def", "accountId": "acct_789", "displayName": "Bea", "avatarUrl": "...", "elo": 1500 }
  ],
  "outgoingRequests": [
    { "id": "freq_ghi", "accountId": "acct_321", "displayName": "Carla", "avatarUrl": "...", "elo": 1600 }
  ]
}
```

### `POST /social/friends`

Sends a friend request by identifier. The identifier must belong to an existing account, must not be the requester's own identifier, and must not already be a friend or have any pending request with the requester.

**Request**:
```json
{ "identifier": "alex" }
```

**Response** (`200`): same shape as `GET /social/friends`.

**Errors**:
- `400` missing/empty identifier, or identifier equals the requester's own identifier
- `404` no account found for that identifier
- `409` already friends, or a pending request already exists between the two accounts

### `POST /social/friends/requests/{requestId}/accept`

Accepts a pending friend request addressed to the requester.

**Response** (`200`): same shape as `GET /social/friends`.

**Errors**:
- `403` the request is not addressed to the requester
- `404` request does not exist
- `409` the request is no longer pending

### `POST /social/friends/requests/{requestId}/reject`

Rejects a pending friend request addressed to the requester.

**Response** (`200`): same shape as `GET /social/friends`.

**Errors**: same as accept.

### `DELETE /social/friends/{friendAccountId}`

Removes an accepted friendship with the given account.

**Response** (`200`): same shape as `GET /social/friends`.

**Errors**:
- `404` no accepted friendship with `friendAccountId`

### `POST /social/groups`

Creates a prediction group. The requester becomes the owner and first member (no invite needed for the owner).

**Request**:
```json
{ "name": "Friday Legends" }
```

**Response** (`201`): see `GET /social/groups/{groupId}` for the full group detail shape.

**Errors**:
- `400` missing/empty name

### `GET /social/groups`

Lists the prediction groups the requester is an active member of.

**Response** (`200`):
```json
{
  "groups": [
    { "id": "group_abc123", "name": "Friday Legends", "ownerAccountId": "acct_123", "memberCount": 3, "createdAt": "2026-07-12T10:00:00Z" }
  ]
}
```

### `GET /social/groups/invites`

Lists the requester's incoming pending group invites, across all groups.

**Response** (`200`):
```json
{
  "invites": [
    { "id": "ginv_abc", "groupId": "group_abc123", "groupName": "Friday Legends", "inviterAccountId": "acct_123", "inviterDisplayName": "Alex", "createdAt": "2026-07-12T10:01:00Z" }
  ]
}
```

### `GET /social/groups/{groupId}`

Returns full group detail: active members, pending invites (visible to members), custom predictions with vote tallies and the requester's own vote, and the group's ranking of members by number of correctly guessed predictions.

**Response** (`200`):
```json
{
  "id": "group_abc123",
  "name": "Friday Legends",
  "ownerAccountId": "acct_123",
  "createdAt": "2026-07-12T10:00:00Z",
  "members": [
    { "accountId": "acct_123", "displayName": "Alex", "elo": 1240 }
  ],
  "pendingInvites": [
    { "id": "ginv_abc", "accountId": "acct_789", "displayName": "Bea" }
  ],
  "predictions": [
    {
      "id": "pred_789",
      "question": "Who wins tonight?",
      "options": ["Home", "Away", "Draw"],
      "createdByAccountId": "acct_123",
      "createdAt": "2026-07-12T10:05:00Z",
      "closesAt": "2026-07-13T20:00:00Z",
      "status": "open",
      "resolvedOption": null,
      "resolvedAt": null,
      "votes": { "Home": 2, "Away": 0, "Draw": 1 },
      "totalVotes": 3,
      "myVote": "Home"
    }
  ],
  "ranking": [
    { "accountId": "acct_123", "displayName": "Alex", "correctCount": 3 },
    { "accountId": "acct_789", "displayName": "Bea", "correctCount": 1 }
  ]
}
```

`status` is one of `open`, `resolved`, `aborted`. `resolvedOption` and `resolvedAt` are `null` unless `status = resolved` (or, for `resolvedAt` only, `status = aborted`). `ranking` includes every current member, ordered by `correctCount` descending with an alphabetical tie-break on `displayName`; members with zero correct predictions are included with `correctCount: 0`.

**Errors**:
- `403` requester is not a member of the group
- `404` group does not exist

### `POST /social/groups/{groupId}/members`

Invites a friend into the group. Creates a pending `GroupInvite`; the invitee must accept before becoming a member. The invited account must already be a friend of the requester.

**Request**:
```json
{ "friendAccountId": "acct_456" }
```

**Response** (`200`): same shape as `GET /social/groups/{groupId}` (the invite appears in `pendingInvites`).

**Errors**:
- `400` `friendAccountId` is not a friend of the requester
- `403` requester is not a member of the group
- `404` group or friend account does not exist
- `409` `friendAccountId` is already a member, or already has a pending invite to this group

### `POST /social/groups/invites/{inviteId}/accept`

Accepts a pending group invite addressed to the requester; creates the corresponding membership.

**Response** (`200`): the group detail (see `GET /social/groups/{groupId}`) for the now-joined group.

**Errors**:
- `403` the invite is not addressed to the requester
- `404` invite does not exist
- `409` the invite is no longer pending

### `POST /social/groups/invites/{inviteId}/reject`

Rejects a pending group invite addressed to the requester.

**Response** (`200`):
```json
{ "ok": true }
```

**Errors**: same as accept.

### `POST /social/groups/{groupId}/predictions`

Proposes a custom prediction inside the group. Requires the requester to be a current member.

**Request**:
```json
{ "question": "Who wins tonight?", "options": ["Home", "Away", "Draw"], "closesAt": "2026-07-13T20:00:00Z" }
```

**Response** (`201`): same shape as `GET /social/groups/{groupId}`.

**Errors**:
- `400` empty question, fewer than two non-empty options, or `closesAt` missing/not a valid future timestamp
- `403` requester is not a member of the group
- `404` group does not exist

### `POST /social/groups/{groupId}/predictions/{predictionId}/votes`

Casts (or changes) the requester's vote on a custom prediction. Requires the requester to be a current member of the prediction's group, and the prediction must still be `open` and not past its `closesAt`.

**Request**:
```json
{ "option": "Home" }
```

**Response** (`200`): same shape as `GET /social/groups/{groupId}`.

**Errors**:
- `400` `option` is not one of the prediction's options
- `403` requester is not a member of the group
- `404` group or prediction does not exist
- `409` the prediction is no longer `open` (resolved, aborted, or past its `closesAt`)

### `POST /social/groups/{groupId}/predictions/{predictionId}/resolve`

Marks the correct option for a custom prediction. Only the prediction's author may call this; it works identically whether called at/after `closesAt` (normal resolution) or before it (early finalization) — both are the same "mark it resolved now" operation. Requires the prediction to currently be `open`.

**Request**:
```json
{ "option": "Home" }
```

**Response** (`200`): same shape as `GET /social/groups/{groupId}`.

**Errors**:
- `400` `option` is not one of the prediction's options
- `403` requester is not the prediction's author
- `404` group or prediction does not exist
- `409` the prediction is not `open` (already resolved or aborted)

### `POST /social/groups/{groupId}/predictions/{predictionId}/abort`

Aborts a custom prediction without marking any option as correct. Only the prediction's author may call this. Requires the prediction to currently be `open`.

**Response** (`200`): same shape as `GET /social/groups/{groupId}`.

**Errors**:
- `403` requester is not the prediction's author
- `404` group or prediction does not exist
- `409` the prediction is not `open` (already resolved or aborted)

## Notes

- All endpoints require an active session (`401` with `{ "error": "no active session" }` otherwise), matching the existing `/account/me` behavior in `bethany_mock/api.py`.
- This contract is local-first: the backend owns persistence in the same SQLite database used for accounts (`backend/data/bethany.sqlite3`).
- Friend, member, and voter display data (`displayName`, `elo`) is always resolved live from the referenced account's current profile; it is never cached or duplicated in the response payload's underlying storage.
- No push notifications are sent for incoming requests/invites; the recipient sees pending items when they open the Social tab or the group screen during an active session (see spec Assumptions).
- `ranking` is computed on every `GET /social/groups/{groupId}` call from existing `custom_predictions` and `prediction_votes` rows; it is not a separately stored or cached entity.
