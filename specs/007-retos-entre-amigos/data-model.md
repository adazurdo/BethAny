# Data Model: Retos entre amigos

## `FriendChallenge` (nuevo)

Vive en `backend/bethany_mock/models.py`, persistida en la tabla nueva `friend_challenges` (no en el blob JSON de `AccountProfile` — es una relación entre dos cuentas, no un dato propio de una sola cuenta, igual que `FriendRequest`).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `str` | `challenge_<uuid12>` |
| `challenger_account_id` | `str` | Quien lanza el reto. FK a `accounts.id`. |
| `opponent_account_id` | `str` | Quien lo recibe. FK a `accounts.id`. |
| `match_id` | `str` | Igual que `PlacedBetSelection.match_id`. |
| `match_label` | `str` | Copia denormalizada de `"{home} vs {away}"`, igual que `PlacedBetSelection.match_label`, para que el reto siga siendo mostrable aunque el partido cambie o desaparezca del dataset mock. |
| `outcome` | `str` | Uno de `"local" \| "empate" \| "visitante"` — el resultado elegido por `challenger_account_id`. |
| `stake` | `int` | Beths igualadas por cada lado (no por ambos sumados). |
| `status` | `str` | `"pending" \| "accepted" \| "declined" \| "cancelled" \| "settled"`. Por defecto `"pending"`. |
| `created_at` | `str` | ISO 8601 UTC. |
| `responded_at` | `str \| None` | Cuándo se aceptó/rechazó/canceló. |
| `settled_at` | `str \| None` | Cuándo se liquidó. |
| `result` | `str \| None` | Resultado simulado del partido, solo tras liquidarse. |
| `winner_account_id` | `str \| None` | `challenger_account_id` u `opponent_account_id`, solo tras liquidarse. |

### Transiciones de estado

```
pending --(opponent acepta)--> accepted --(partido vence)--> settled
pending --(opponent rechaza)-------------> declined
pending --(challenger cancela)-----------> cancelled
```

No hay transición hacia atrás; una vez fuera de `pending`, el reto es terminal salvo `accepted -> settled`.

### Invariantes

- Mientras `status == "pending"`, el importe `stake` ya está descontado del saldo de `challenger_account_id` (no de `opponent_account_id`).
- En `status == "accepted"`, el importe `stake` está descontado de **ambas** cuentas.
- En `status in ("declined", "cancelled")`, ningún saldo permanece retenido por este reto: se devolvió a `challenger_account_id` en el momento de la transición.
- En `status == "settled"`, `winner_account_id` recibió exactamente `2 * stake` (su propio importe retenido más el del perdedor); el perdedor no recibe nada.
- `challenger_account_id != opponent_account_id` siempre (no se puede retar a uno mismo — implícito al exigir amistad, `is_friend` ya excluye la propia cuenta).

## Reutilizado sin cambios

- `AccountProfile.beths` — mismo saldo ya usado por `bet_repository.py` y `social_repository.py` (recompensas de hito); ningún campo nuevo en `AccountProfile`.
- `match_results.generate_match_result(match_id)` — mismo resultado simulado que liquida `PlacedBet`.
- `bet_repository.SETTLEMENT_DELAY_MINUTES` — misma ventana de 90 minutos, importada, no duplicada.
- `social_repository.is_friend(account_id, other_account_id)` — misma comprobación de amistad ya usada en la pantalla Social.
- `mock_dataset_repository.find_match_by_id` / `odds.is_open_for_betting` — misma validación de partido ya usada por `bet_repository._resolve_selection`.

## Esquema SQL (nuevo)

```sql
CREATE TABLE IF NOT EXISTS friend_challenges (
    id TEXT PRIMARY KEY,
    challenger_account_id TEXT NOT NULL,
    opponent_account_id TEXT NOT NULL,
    match_id TEXT NOT NULL,
    match_label TEXT NOT NULL,
    outcome TEXT NOT NULL,
    stake INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    responded_at TEXT,
    settled_at TEXT,
    result TEXT,
    winner_account_id TEXT,
    FOREIGN KEY(challenger_account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY(opponent_account_id) REFERENCES accounts(id) ON DELETE CASCADE
)
```

Se añade con `CREATE TABLE IF NOT EXISTS` en `initialize_database()`, igual que el resto de tablas — ninguna migración `ALTER TABLE` necesaria (tabla enteramente nueva).
