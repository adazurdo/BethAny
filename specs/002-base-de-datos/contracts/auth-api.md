# Contract: Authentication and Account State

## Purpose

Defines the local account interface used by the frontend to register, sign in, sign out, and restore account-owned data.

## Expected Behaviors

- The access screen is the first user-facing state on app entry.
- A user can register a new account with an identifier and password.
- A user can sign in with an existing account.
- A user can sign out and return to the access screen.
- A signed-in account can be restored with its saved profile, elo, bets, and friendships.

## Endpoints

### `POST /auth/register`

Creates a new local account.

**Request**:
```json
{
  "identifier": "alex",
  "password": "secret123",
  "displayName": "Alex"
}
```

**Response**:
```json
{
  "accountId": "acct_123",
  "identifier": "alex",
  "displayName": "Alex"
}
```

**Errors**:
- `400` invalid or incomplete credentials
- `409` identifier already exists

### `POST /auth/login`

Authenticates an existing local account.

**Request**:
```json
{
  "identifier": "alex",
  "password": "secret123"
}
```

**Response**:
```json
{
  "accountId": "acct_123",
  "profile": {
    "displayName": "Alex",
    "avatar": "...",
    "elo": 1240
  },
  "bets": [],
  "friends": []
}
```

**Errors**:
- `400` invalid request body
- `401` invalid credentials
- `404` account not found

### `POST /auth/logout`

Clears the active session for the current app run.

**Response**:
```json
{ "ok": true }
```

### `GET /account/me`

Returns the currently signed-in account and its saved state.

**Response**:
```json
{
  "accountId": "acct_123",
  "identifier": "alex",
  "profile": {
    "displayName": "Alex",
    "avatar": "...",
    "elo": 1240
  },
  "bets": [],
  "friends": []
}
```

## Notes

- The contract is local-first and does not require cloud authentication.
- The backend owns persistence; the frontend only consumes and renders the contract.
- Additional account-state update endpoints can be added later if implementation splits profile, bets, and friends into separate operations.
