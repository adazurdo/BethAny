# Data Model: Verificación de correo electrónico

## `UserAccount` (existente, extendido)

Vive en `backend/bethany_mock/models.py`, persistida en la tabla ya existente `accounts` (no se crea ninguna tabla nueva).

| Campo | Tipo | Notas |
|---|---|---|
| `identifier` | `str` | Ya existente. A partir de esta feature, `register_account` exige que sea un email sintácticamente válido (FR-001); cuentas ya existentes con un `identifier` no-email no se tocan y siguen pudiendo hacer login. |
| `status` | `str` | Ya existente. Gana el valor `"pending_verification"` junto al único valor usado hasta ahora, `"active"`. Nuevas cuentas nacen en `"pending_verification"`; cuentas creadas antes de esta feature permanecen `"active"` sin migración (Decision 5). |
| `verification_code_hash` | `str \| None` | **Nuevo.** Hash (mismo mecanismo que `password_hash`) del código de 6 dígitos vigente. `None` cuando la cuenta está `"active"` o aún no se generó ningún código. |
| `verification_code_sent_at` | `str \| None` | **Nuevo.** ISO 8601 UTC del último envío/reenvío. Controla tanto la expiración (24h, FR-007) como el cooldown de reenvío (60s, FR-006). |
| `verification_attempts_remaining` | `int` | **Nuevo.** Por defecto `5` (FR-008). Se decrementa en cada intento de código incorrecto; se restablece a `5` en cada reenvío. |

### Transiciones de estado (`status`)

```
pending_verification --(código correcto antes de expirar)--> active
pending_verification --(nuevo registro reclama el identifier,
                         código ya expirado, ver FR-012)-----> (fila borrada, se inserta una cuenta nueva)
```

No hay transición `active -> pending_verification` (una vez verificada, una cuenta no vuelve a pedir verificación; cambiar de email queda fuera de alcance, ver spec Assumptions).

### Invariantes

- Mientras `status == "pending_verification"`: `verification_code_hash` y `verification_code_sent_at` MUST estar ambos presentes (se generan atómicamente al registrar o reenviar).
- `verification_attempts_remaining` MUST estar entre `0` y `5`; al llegar a `0`, cualquier intento de verificar con un código MUST rechazarse (`ConflictError`) hasta que se pida un reenvío.
- Un reenvío SIEMPRE genera un `verification_code_hash` nuevo (invalidando el anterior) y restablece `verification_attempts_remaining = 5`, sujeto al cooldown de 60s desde el `verification_code_sent_at` previo.
- Al pasar a `status == "active"`, las tres columnas nuevas MUST limpiarse (`NULL`/`5`) — no queda ningún código usado en la fila.
- `GET /account/me` y cualquier vista de perfil NUNCA exponen `verification_code_hash` (mismo criterio ya aplicado a `password_hash`/`salt`, que tampoco viajan en `to_dict()`).

## Reutilizado sin cambios

- `account_repository._hash_password`/`_verify_password` (mecanismo de hash+salt) — se reutiliza para el código de verificación (Decision 3), sin nueva dependencia de criptografía.
- `secrets` (ya importado en `account_repository.py` para tokens de sesión/salts) — genera el código de 6 dígitos.
- `session.require_session` — base sobre la que se construye la nueva dependencia `require_verified_session` (ver `contracts/`).
- `list_all_accounts()` (`WHERE status = 'active'`) — sigue funcionando sin cambios; ahora naturalmente excluye cuentas pendientes de verificación del ranking, sin tocar su código.

## Esquema SQL (migración sobre tabla existente)

```sql
-- accounts ya existe (database.py); se añaden 3 columnas vía _ensure_column,
-- mismo patrón idempotente ya usado para placed_bets/competition_sources.
ALTER TABLE accounts ADD COLUMN verification_code_hash TEXT;
ALTER TABLE accounts ADD COLUMN verification_code_sent_at TEXT;
ALTER TABLE accounts ADD COLUMN verification_attempts_remaining INTEGER NOT NULL DEFAULT 5;
```

Ninguna tabla nueva; ninguna FK nueva. Filas existentes reciben `verification_attempts_remaining = 5` por el `DEFAULT`, pero como su `status` sigue siendo `"active"`, ese valor nunca se consulta (Decision 5).
