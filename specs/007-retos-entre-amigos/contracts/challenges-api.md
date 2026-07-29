# API Contract: Retos entre amigos

Todas las rutas requieren sesión activa (mismo patrón `_require_session` ya usado por `/social/*` y `/bets/*`). Todos los errores siguen el formato ya establecido: `{"error": "<mensaje>"}` con el status HTTP correspondiente (400 `ValueError`, 403 `PermissionError`, 404 `LookupError`, 409 `ConflictError`).

## `GET /challenges/mine`

Devuelve los retos de la cuenta activa, agrupados y ya liquidados de forma perezosa (equivalente a `_settle_due_bets` antes de listar).

**Response 200**:

```json
{
  "incoming": [ChallengeView, ...],
  "outgoing": [ChallengeView, ...],
  "active": [ChallengeView, ...],
  "resolved": [ChallengeView, ...]
}
```

- `incoming`: `status == "pending"` y `opponentAccountId == me`.
- `outgoing`: `status == "pending"` y `challengerAccountId == me`.
- `active`: `status == "accepted"` y (`challengerAccountId == me` o `opponentAccountId == me`).
- `resolved`: `status in ("settled", "declined", "cancelled")` y (`challengerAccountId == me` o `opponentAccountId == me`), ordenados por `respondedAt`/`settledAt` descendente.

### `ChallengeView`

```json
{
  "id": "challenge_ab12cd34ef56",
  "challengerAccountId": "acct_...",
  "challengerDisplayName": "bethany_fox",
  "opponentAccountId": "acct_...",
  "opponentDisplayName": "otro_usuario",
  "matchId": "match_...",
  "matchLabel": "Real Madrid vs Barcelona",
  "outcome": "local",
  "stake": 120,
  "status": "pending",
  "createdAt": "2026-07-27T10:00:00+00:00",
  "respondedAt": null,
  "settledAt": null,
  "result": null,
  "winnerAccountId": null
}
```

## `POST /challenges`

**Request**:

```json
{ "opponentAccountId": "acct_...", "matchId": "match_...", "outcome": "local", "stake": 120 }
```

**Errores**:

- 400 `ValueError` — `outcome` inválido, `stake` no numérico o `<= 0`, o saldo insuficiente (`"insufficient beths balance"`).
- 403 `PermissionError` — `opponentAccountId` no es amigo de la cuenta activa.
- 404 `LookupError` — `matchId` no existe.
- 409 `ConflictError` — el partido ya no está abierto a apuestas.

**Response 201**: `ChallengeView` del reto recién creado (`status: "pending"`).

## `POST /challenges/{challengeId}/accept`

Solo el `opponentAccountId` del reto puede llamarla, y solo si `status == "pending"`.

**Errores**: 403 `PermissionError` (no eres el retado), 409 `ConflictError` (ya no está pendiente), 400 `ValueError` (saldo insuficiente), 404 `LookupError` (reto no existe).

**Response 200**: `ChallengeView` actualizado (`status: "accepted"`).

## `POST /challenges/{challengeId}/decline`

Solo el `opponentAccountId`, solo si `status == "pending"`. Devuelve el importe retenido a `challengerAccountId`.

**Errores**: igual forma que `accept`, salvo que no hay comprobación de saldo.

**Response 200**: `ChallengeView` actualizado (`status: "declined"`).

## `POST /challenges/{challengeId}/cancel`

Solo el `challengerAccountId`, solo si `status == "pending"`. Devuelve el importe retenido a sí mismo.

**Errores**: 403 `PermissionError` (no eres quien retó), 409 `ConflictError` (ya no está pendiente), 404 `LookupError`.

**Response 200**: `ChallengeView` actualizado (`status: "cancelled"`).
