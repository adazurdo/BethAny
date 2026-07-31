# Contract: Elo Economy (ELO dinámico, saldo de Beths, hitos, liquidación de apuestas)

## Purpose

Documenta los cambios sobre el contrato de cuenta ya existente (`002-base-de-datos/contracts/auth-api.md`, `GET`/`PUT /account/me`), sobre el contrato de grupos/predicciones (`004-social`, `POST /social/groups/{groupId}/predictions/{predictionId}/resolve`) y sobre el contrato de apuestas (`005-combinada/contracts/bets-api.md`, `POST /bets/place`, `GET /bets/mine`), más dos endpoints nuevos para los hitos de ELO. Todos los endpoints de aquí abajo requieren una sesión activa, igual que el resto de la API.

## Expected Behaviors

- `GET /account/me` (y cualquier respuesta que serialice una cuenta) siempre refleja el ELO y el saldo de Beths ya calculados por el servidor, nunca lo último que el cliente intentó guardar.
- Cargar una cuenta (login o `GET /account/me`) concede automáticamente la renta periódica de Beths si ha vencido, sin ninguna acción explícita del cliente.
- `PUT /account/me` ignora cualquier `elo` o `Beths` que llegue en el payload; el perfil guardado conserva siempre los valores calculados por el servidor para esos dos campos.
- Resolver una predicción de grupo (`POST /social/groups/{groupId}/predictions/{predictionId}/resolve`) **no** recalcula el ELO de nadie (revisión 2026-07-17); solo actualiza el estado de la predicción, igual que antes de esta feature. Su respuesta (`serialize_group_detail`) no cambia de forma.
- `POST /bets/place` puede rechazar la colocación por saldo insuficiente o por superar el importe máximo de apuesta, además de los rechazos ya existentes (partido cerrado, selección inválida).
- `GET /bets/mine` liquida de forma perezosa cualquier apuesta pendiente cuyo tiempo de liquidación ya haya pasado, antes de devolver la lista — esa liquidación es ahora también el único punto donde puede cambiar el ELO de la cuenta y generarse una recompensa de hito.
- Un nuevo par de endpoints permite consultar y confirmar la lectura de recompensas de hito de ELO pendientes.

## Endpoints

### `GET /account/me` *(existente, respuesta ampliada)*

**Response** (`200`) — `profile` gana `beths`, `bethsLastGrantAt`, `eloBetsSettled`, `eloBetsCountedToday` y `eloBetsCountedDate`; la respuesta de cuenta gana `unseenEloMilestones`. Los cuatro campos nuevos de `profile` distintos de `beths` no están pensados para mostrarse directamente: `bethsLastGrantAt` alimenta la cuenta atrás del cliente hasta el próximo Beth (uno cada `INCOME_INTERVAL_SECONDS` = 300s) y los tres `eloBets*` alimentan la vista previa de ELO del boleto de apuestas (revisión 2026-07-17, ver `research.md`):

```json
{
  "accountId": "acct_abc123",
  "identifier": "bethany_fox",
  "profile": {
    "displayName": "bethany_fox",
    "avatarUrl": "https://...",
    "elo": 1812,
    "beths": 640,
    "bethsLastGrantAt": "2026-07-17T10:58:12+00:00",
    "rankLabel": "Prediction Captain",
    "winRate": "68% win rate",
    "streak": "5 wins in a row",
    "bio": "...",
    "eloBetsSettled": 34,
    "eloBetsCountedToday": 2,
    "eloBetsCountedDate": "2026-07-17"
  },
  "bets": [ ],
  "unseenEloMilestones": [
    { "tier": 1800, "bonusBeths": 50, "awardedAt": "2026-07-17T10:00:00+00:00" }
  ]
}
```

### `PUT /account/me` *(existente, comportamiento restringido)*

**Request**: sin cambio de forma; `profile.elo`, `profile.beths` y el resto de campos server-only expuestos en la respuesta (`bethsLastGrantAt`, `eloBetsSettled`, `eloBetsCountedToday`, `eloBetsCountedDate`), si se envían, se ignoran. `highest_elo_milestone` es puramente interno: ni se expone en `GET`/`PUT /account/me` ni el cliente puede enviarlo.

**Response** (`200`): mismo formato que `GET /account/me`; esos campos en la respuesta son siempre los valores ya persistidos por el servidor, no los del payload enviado.

### `POST /account/me/milestones/ack` *(nuevo)*

Marca como vistas todas las recompensas de hito de ELO pendientes de la cuenta activa.

**Request**: sin cuerpo.

**Response** (`200`):
```json
{ "ok": true }
```

**Errores**:
- `401` si no hay sesión activa.

### `POST /social/groups/{groupId}/predictions/{predictionId}/resolve` *(existente, sin cambios)*

Sin cambios de comportamiento respecto a `004-social`: resolver una predicción actualiza su `resolvedOption`/`resolvedAt` y el ranking de aciertos del grupo. No toca el `elo` ni el `beths` de ningún miembro (revisión 2026-07-17).

### `POST /bets/place` *(existente, nuevos motivos de rechazo)*

Sin cambios de request/response en el caso de éxito. Nuevos casos de error:

**Response** (`400`, saldo insuficiente):
```json
{ "error": "insufficient beths balance" }
```

**Response** (`400`, importe por encima del tope):
```json
{ "error": "stake cannot exceed 1000 beths" }
```

### `GET /bets/mine` *(existente, respuesta ampliada + efecto de liquidación)*

Antes de responder, liquida cualquier apuesta de la cuenta en estado `realizada` cuyo partido ya sea suficientemente antiguo **y** cuyo resultado real ya esté confirmado por su fuente (football-data.org/PandaScore — revisión 2026-07-31, ver `research.md`; antes de esa revisión bastaba con que hubiera pasado el tiempo configurado) — y con ella, recalcula el ELO de la cuenta según la cuota y el stake de esa apuesta (siempre que no se haya alcanzado ya el tope diario de apuestas que cuentan para ELO) y concede cualquier recompensa de hito cruzada. Cada `PlacedBet` en la respuesta gana `settledAt` y `eloDelta` (2026-07-31: el cambio de Elo exacto que esa apuesta aplicó, `null` mientras está pendiente o si no tuvo efecto por el tope diario), y `status` puede valer ahora `"realizada" | "ganada" | "perdida"`:

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
      "eloDelta": 12,
      "selections": [
        { "matchId": "match-12345", "matchLabel": "Francia vs Inglaterra", "outcome": "local", "odds": 2.05, "result": "local", "won": true, "matchStatus": null },
        { "matchId": "match-67890", "matchLabel": "Brasil vs Argentina", "outcome": "visitante", "odds": 3.40, "result": "visitante", "won": true, "matchStatus": null }
      ]
    }
  ]
}
```

Una apuesta cuyo partido ya pasó el tiempo configurado pero cuya fuente todavía no reporta un resultado final (partido pospuesto, fuente caída, token no configurado) permanece con `status: "realizada"`, `settledAt: null` y `eloDelta: null` — no se liquida hasta que el resultado real esté disponible.

## Error Summary

| Endpoint | Status | Condición |
|---|---|---|
| `POST /bets/place` | 400 | Saldo de Beths insuficiente para el importe total del lote |
| `POST /bets/place` | 400 | Alguna selección apuesta más de 1000 Beths |
| `POST /account/me/milestones/ack` | 401 | Sin sesión activa |
