# Data Model: base de datos

## Overview

The feature centers on a local account aggregate. Each account owns its credentials, profile identity, elo, bets, and friendships. The main requirement is that the full account state can be restored after a later sign-in.

## Entities

### UserAccount

Represents one local account that can sign in to the app.

**Fields**:
- `id`: stable internal identifier
- `identifier`: email or username used to sign in
- `password_hash`: stored credential secret representation
- `created_at`: account creation timestamp
- `last_login_at`: most recent successful sign-in timestamp
- `status`: active or disabled state

**Rules**:
- Identifier must be unique.
- Password must satisfy the minimum validation agreed for the first version.
- The record must survive app restarts.

### AccountProfile

Represents the public-facing identity shown after login.

**Fields**:
- `account_id`: owner account reference
- `display_name`
- `avatar`
- `bio` or profile summary
- `elo`
- `updated_at`

**Rules**:
- Each account has one active profile snapshot for the first version.
- Missing optional display fields should fall back to safe defaults.

### BetRecord

Represents a saved bet or prediction item owned by the account.

**Fields**:
- `id`
- `account_id`
- `title`
- `market`
- `selection`
- `status`
- `created_at`
- `updated_at`

**Rules**:
- Bets belong to exactly one account.
- Saved bets must be restored with the account after sign-in.

### FriendshipData

Represents social contacts associated with the account.

**Fields**:
- `id`
- `account_id`
- `friend_identifier`
- `display_name`
- `is_selected`
- `created_at`
- `updated_at`

**Rules**:
- Friends are scoped to the owning account.
- Friend selection state must be preserved across sessions.

### SessionState

Represents the current signed-in account for the active app run.

**Fields**:
- `active_account_id`
- `authenticated_at`
- `logout_at`

**Rules**:
- Session state is ephemeral in the first version.
- The access screen is shown again when the session ends or the app restarts.

## Relationships

- One `UserAccount` has one `AccountProfile`.
- One `UserAccount` has many `BetRecord` entries.
- One `UserAccount` has many `FriendshipData` entries.
- One `UserAccount` can become the active `SessionState` during a login session.

## Validation Rules

- Registration must reject duplicate identifiers.
- Login must reject unknown identifiers and invalid credentials.
- Missing account-owned data must not prevent sign-in; safe defaults should be shown instead.
- A sign-in must restore the same account aggregate that was last stored.
