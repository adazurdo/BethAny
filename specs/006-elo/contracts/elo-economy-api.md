# Contract: Elo Economy (ELO dinámico, saldo de coins, hitos, liquidación de apuestas)

## Purpose

Documenta los cambios sobre el contrato de cuenta ya existente (`002-base-de-datos/contracts/auth-api.md`, `GET`/`PUT /account/me`), sobre el contrato de grupos/predicciones (`004-social`, `POST /social/groups/{groupId}/predictions/{predictionId}/resolve`) y sobre el contrato de apuestas (`005-combinada/contracts/bets-api.md`, `POST /bets/place`, `GET /bets/mine`), más dos endpoints nuevos para los hitos de ELO. Todos los endpoints de aquí abajo requieren una sesión activa, igual que el resto de la API.

## Expected Behaviors

- `GET /account/me` (y cualquier respuesta que serialice una cuenta) siempre refleja el ELO y el saldo de coins ya calculados por el servidor, nunca lo último que el cliente intentó guardar.
- Cargar una cuenta (login o `GET /account/me`) concede automáticamente la renta periódica de coins si ha vencido, sin ninguna acción explícita del cliente.
- `PUT /account/me` ignora cualquier `elo` o `coins` que llegue en el payload; el perfil guardado conserva siempre los valores calculados por el servidor para esos dos campos.
- Resolver una predicción de grupo (`POST /social/groups/{groupId}/predictions/{predictionId}/resolve`) recalcula el ELO de cada votante y puede generar recompensas de hito; la respuesta del endpoint no cambia de forma (sigue siendo `serialize_group_detail`), pero los `elo` de `members` reflejan ya los nuevos valores.
- `POST /bets/place` puede rechazar la colocación por saldo insuficiente, además de los rechazos ya existentes (partido cerrado, selección inválida).
- `GET /bets/mine` liquida de forma perezosa cualquier apuesta pendiente cuyo tiempo de liquidación ya haya pasado, antes de devolver la lista.
- Un nuevo par de endpoints permite consultar y confirmar la lectura de recompensas de hito de ELO pendientes.

## Endpoints

### `GET /account/me` *(existente, respuesta ampliada)*

**Response** (`200`) — `profile` gana `coins`; la respuesta de cuenta gana `unseenEloMilestones`:

```json
{
  "accountId": "acct_abc123",
  "identifier": "bethany_fox",
  "profile": {
    "displayName": "bethany_fox",
    "avatarUrl": "https://...",
    "elo": 1812,
    "coins": 640,
    "rankLabel": "Prediction Captain",
    "winRate": "68% win rate",
    "streak": "5 wins in a row",
    "bio": "..."
  },
  "bets": [ ],
  "unseenEloMilestones": [
    { "tier": 1800, "bonusCoins": 50, "awardedAt": "2026-07-17T10:00:00+00:00" }
  ]
}
```

### `PUT /account/me` *(existente, comportamiento restringido)*

**Request**: sin cambio de forma; `profile.elo` y `profile.coins`, si se envían, se ignoran.

**Response** (`200`): mismo formato que `GET /account/me`; `profile.elo` y `profile.coins` en la respuesta son siempre los valores ya persistidos por el servidor, no los del payload enviado.

### `POST /account/me/milestones/ack` *(nuevo)*

Marca como vistas todas las recompensas de hito de ELO pendientes de la cuenta activa.

**Request**: sin cuerpo.

**Response** (`200`):
```json
{ "ok": true }
```

**Errores**:
- `401` si no hay sesión activa.

### `POST /social/groups/{groupId}/predictions/{predictionId}/resolve` *(existente, efecto ampliado)*

Sin cambios en el request. Efecto añadido: por cada `PredictionVote` de esa predicción, se recalcula el `elo` de la cuenta votante (ver `research.md` Decision 2) y, si cruza uno o más hitos, se acredita `coins` y se inserta el `EloMilestoneAward` correspondiente. La respuesta sigue siendo `serialize_group_detail(group, account_id)` sin cambios de forma; los `elo` dentro de `members` ya reflejan los nuevos valores.

### `POST /bets/place` *(existente, nuevo motivo de rechazo)*

Sin cambios de request/response en el caso de éxito. Nuevo caso de error:

**Response** (`400`, saldo insuficiente):
```json
{ "error": "insufficient coins balance" }
```

### `GET /bets/mine` *(existente, respuesta ampliada + efecto de liquidación)*

Antes de responder, liquida cualquier apuesta de la cuenta en estado `realizada` cuyo tiempo de liquidación ya haya pasado. Cada `PlacedBet` en la respuesta gana `settledAt` y `status` puede valer ahora `"realizada" | "ganada" | "perdida"`:

```json
{
  "bets": [
    {
      "id": "bet_abc123",
      "betType": "combinada",
      "stake": 10,
      "combinedOdds": 5.45,
      "potentialWinnings": 54.50,
      "status": "ganada",
      "createdAt": "2026-07-17T09:00:00+00:00",
      "settledAt": "2026-07-17T10:30:00+00:00",
      "selections": [
        { "matchId": "match-12345", "matchLabel": "Francia vs Inglaterra", "outcome": "local", "odds": 2.05 },
        { "matchId": "match-67890", "matchLabel": "Brasil vs Argentina", "outcome": "visitante", "odds": 3.40 }
      ]
    }
  ]
}
```

## Error Summary

| Endpoint | Status | Condición |
|---|---|---|
| `POST /bets/place` | 400 | Saldo de coins insuficiente para el importe total del lote |
| `POST /account/me/milestones/ack` | 401 | Sin sesión activa |
