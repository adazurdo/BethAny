# Contract: Bets (1X2 Market, Simple, and Combinada)

## Purpose

Defines the local API surface the frontend uses to see 1X2 odds on football matches, place simple and combinada bets, and review placed bets in "Mis apuestas". Extends the account/session contract from `002-base-de-datos` (`contracts/auth-api.md`) and the match endpoints from `003-datos-mock`; every endpoint below requires an active session, same as `GET /account/me`.

**Note (superseded by `006-elo`, 2026-07-17)**: `POST /bets/place` now also debits the placing account's coins balance (rejecting with `400 insufficient coins balance` if it doesn't cover the stake), and `GET /bets/mine` now settles due bets first, so `status` may also be `"ganada"`/`"perdida"` and each bet gains `settledAt`. See `specs/006-elo/contracts/elo-economy-api.md` for the full extension; both endpoints keep their request/response shape below otherwise unchanged.

## Expected Behaviors

- Every football match returned by the existing `/mock/competitions/*` endpoints now also carries its 1X2 odds (home/draw/away).
- A signed-in user can place one or more `simple` bets in a single request, each with its own stake, or one `combinada` bet combining 2+ selections from different matches with a single shared stake.
- The server recomputes each selection's odds from the match's current data and rejects the whole request if any included match is no longer open for betting (already started, finished, or otherwise not `scheduled`/`timed`).
- A signed-in user can list all bets they have placed, most recent first, each showing its type, stake, combined odds, potential winnings, and the full selection breakdown.

## Endpoints

### `GET /mock/competitions/{code}/matches` *(existing endpoint, extended response)*

No request change. This endpoint already returns raw snake_case match fields (unlike the hand-serialized camelCase `/social/*` and `/bets/*` responses below — the frontend's `mockCompetitions.ts` already converts snake_case to camelCase for every existing field). Each match object now includes three additional snake_case odds fields:

```json
{
  "id": "match-12345",
  "competition_code": "mundial-2026",
  "home_team_name": "Francia",
  "away_team_name": "Inglaterra",
  "kickoff_label": "Sat 18 Jul 23:00",
  "status": "scheduled",
  "home_odds": 2.05,
  "draw_odds": 3.70,
  "away_odds": 3.40
}
```

### `POST /bets/place`

Places one or more bets. The request shape depends on `betType`.

**Request (simple, one or more independent bets in a single call)**:
```json
{
  "betType": "simple",
  "selections": [
    { "matchId": "match-12345", "outcome": "local", "stake": 5 },
    { "matchId": "match-67890", "outcome": "empate", "stake": 2 }
  ]
}
```

**Request (combinada, one shared stake across all selections)**:
```json
{
  "betType": "combinada",
  "stake": 10,
  "selections": [
    { "matchId": "match-12345", "outcome": "local" },
    { "matchId": "match-67890", "outcome": "visitante" }
  ]
}
```

**Response** (`201`):
```json
{
  "placedBets": [
    {
      "id": "bet_abc123",
      "betType": "combinada",
      "stake": 10,
      "combinedOdds": 5.45,
      "potentialWinnings": 54.50,
      "status": "realizada",
      "createdAt": "2026-07-16T12:00:00Z",
      "settledAt": null,
      "selections": [
        { "matchId": "match-12345", "matchLabel": "Francia vs Inglaterra", "outcome": "local", "odds": 2.05 },
        { "matchId": "match-67890", "matchLabel": "Brasil vs Argentina", "outcome": "visitante", "odds": 3.40 }
      ]
    }
  ]
}
```

A `simple` request with N selections returns N entries in `placedBets`, each with exactly one selection.

**Errors**:
- `400` empty `selections`, `betType` not `simple`/`combinada`, a `combinada` with fewer than 2 selections, two selections referencing the same `matchId`, any `stake` that is missing, zero, negative, or non-numeric, or the account's coins balance doesn't cover the total stake (`006-elo`)
- `401` no active session
- `404` a `matchId` does not correspond to any known match
- `409` a `matchId` corresponds to a match that is no longer open for betting (status other than `scheduled`/`timed`); the response names the offending `matchId`

### `GET /bets/mine`

Returns every bet placed by the requester, most recent first.

**Response** (`200`):
```json
{
  "bets": [
    {
      "id": "bet_abc123",
      "betType": "combinada",
      "stake": 10,
      "combinedOdds": 5.45,
      "potentialWinnings": 54.50,
      "status": "realizada",
      "createdAt": "2026-07-16T12:00:00Z",
      "settledAt": null,
      "selections": [
        { "matchId": "match-12345", "matchLabel": "Francia vs Inglaterra", "outcome": "local", "odds": 2.05 },
        { "matchId": "match-67890", "matchLabel": "Brasil vs Argentina", "outcome": "visitante", "odds": 3.40 }
      ]
    }
  ]
}
```

An account with no placed bets gets `{ "bets": [] }` (`200`), rendered as the empty state in "Mis apuestas" (FR-023).
