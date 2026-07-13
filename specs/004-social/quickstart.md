# Quickstart: Ventana Social (Amigos y Grupos de Predicciones)

## Goal

Validate that a signed-in user can send/accept/reject friend requests, sort friends, create a prediction group with invite-based membership, propose custom predictions with a closing date, vote on them, resolve or abort them as the author, and see the group's ranking of members by correct predictions.

## Prerequisites

- The repo is checked out locally.
- The local Python backend and Expo frontend can both be started from the workspace (`npm run dev`).
- At least two local accounts exist (register a second account, e.g. `alex`, to act as a friend). Since this backend supports one active session at a time, use `account_repository.register_account(...)` directly (not the HTTP endpoint) to create a second test account without disrupting the currently signed-in session.
- The device or emulator used for mobile validation can reach the local development environment.

## Validation Flow

### 1. Open the Social tab

Sign in and navigate to the "Social" tab.

**Expected result**: The friends list, incoming/outgoing friend requests, and prediction groups sections are visible.

### 2. Send a friend request

Send a friend request using the identifier of a second, previously registered account.

**Expected result**: The request appears as an outgoing pending request; it does not yet appear as a friend.

### 3. Accept a friend request

Sign in as the target account (or inspect its pending requests) and accept the incoming request.

**Expected result**: Both accounts now see each other in their friends list, with real display name and current elo.

### 4. Reject invalid friend actions

Try requesting your own identifier, then try requesting the same account again while a request is already pending or already a friend.

**Expected result**: Both attempts are rejected with a clear message; no duplicate request or friendship is created.

### 5. Reject a friend request

Send a second friend request (from a third account, if available) and reject it.

**Expected result**: The request disappears from both accounts' pending lists and no friendship is created.

### 6. Sort the friends list

With two or more friends of different elo, switch between elo ascending, elo descending, and alphabetical sorting.

**Expected result**: The displayed order changes correctly for each option; a tie in elo falls back to alphabetical order.

### 7. Remove a friend

Remove one of the accepted friends.

**Expected result**: The friend disappears from both accounts' friends lists immediately.

### 8. Create a prediction group and invite a friend

Create a new prediction group with a name, then invite a friend into it.

**Expected result**: The group is created with you as owner and sole member; the invite appears as pending, not as an immediate membership.

### 9. Accept a group invite

From the invited account, accept the pending group invite.

**Expected result**: The invited account now appears in the group's member list, from both accounts' view of the group.

### 10. Navigate the group detail screen

Open a group from the Social tab, then use the back button to return.

**Expected result**: A back arrow is visible at the top of the group screen; using it returns to the Social tab. The bottom tab bar (Home/Profile/Social) stays visible the whole time, including while inside the group screen.

### 11. Propose a custom prediction and vote

Inside the group, propose a custom prediction with a question, at least two options, and a closing date, then have members vote on one of the options.

**Expected result**: The prediction (with its closing date and `open` status) and its live vote tally are visible from any member's view of the group; each member's own vote is indicated; voting again for the same member changes their vote instead of adding a second one.

### 12. Reject invalid group/voting actions

Try creating a group with an empty name, inviting a non-friend account, inviting the same friend twice, proposing a prediction with a single option or no closing date, and voting for an option that doesn't belong to the prediction, or voting while not a group member.

**Expected result**: Each attempt is rejected with a clear message and no partial state is created.

### 13. Finalize a prediction early

As the author of an open prediction with votes from more than one member, resolve it before its closing date, marking one option as correct.

**Expected result**: The prediction immediately shows `status: resolved` and the chosen option as `resolvedOption`, before its closing date has passed; further votes on it are rejected.

### 14. Resolve a prediction after its closing date

As the author of a different open prediction, wait until (or simulate) its closing date passing, then resolve it by marking the correct option.

**Expected result**: The prediction shows `status: resolved` with the chosen `resolvedOption`; votes were already rejected once the closing date passed, even before resolving.

### 15. Abort a prediction

As the author of a third open prediction, abort it instead of resolving it.

**Expected result**: The prediction shows `status: aborted` with no `resolvedOption`; no member's vote on it counts toward the group ranking.

### 16. Reject invalid resolution actions

Try resolving or aborting a prediction as a non-author member, and try resolving or aborting a prediction that is already `resolved` or `aborted`.

**Expected result**: Each attempt is rejected with a clear message and the prediction's status does not change.

### 17. View the group ranking

Open the group detail screen after at least one prediction has been resolved with votes from multiple members.

**Expected result**: A ranking section lists every current member with their count of correctly guessed (resolved) predictions, ordered from most to fewest correct, with members tied on count ordered alphabetically; members with zero correct predictions are still listed with a count of 0; the aborted prediction from step 15 does not affect anyone's count.

## Recommended Checks

- Verify a friend's elo shown in the list updates if that friend's own profile elo changes (no stale value).
- Verify removing a friend does not remove a prediction group you already share with them.
- Verify only current group members can see and propose custom predictions or vote for that group.
- Verify rejecting a friend request or a group invite leaves no residual pending state.
- Verify only the prediction's author sees/can use its resolve and abort controls.
- Verify the ranking updates immediately after a resolve action, for every member's view of the group.

## Mobile Validation

Since the "Social" tab and the group detail screen are part of the mobile tab bar navigation, validate friend requests (send/accept/reject), sorting, group creation, invites (send/accept/reject), proposing a custom prediction with a closing date, voting, resolving/aborting a prediction as its author, the group ranking section, and the group screen's back button through Expo on a real device or simulator, confirming all controls remain usable at mobile width and the tab bar stays visible inside the group screen.

## Local Database Reset

The `custom_predictions` table gained new columns (`closes_at`, `status`, `resolved_option`, `resolved_at`) in this update. Since the project has no migration mechanism (see `research.md` Decision 12), delete the existing local `backend/data/bethany.sqlite3` before validating this flow so it gets recreated with the new schema.
