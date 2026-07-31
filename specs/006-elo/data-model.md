# Data Model: Elo (Sistema de ELO y moneda del juego)

## Overview

Esta feature amplía el `AccountProfile` ya existente con un saldo de Beths (moneda renombrada desde "coins" el 2026-07-17) y los contadores necesarios para el ELO dinámico y los hitos, sin crear una entidad "Wallet" separada (Decision 1, `research.md`). Añade una entidad nueva de solo-auditoría (`EloMilestoneAward`) y una liquidación real sobre el `PlacedBet` ya existente de `005-combinada`. **Revisión 2026-07-17**: el ELO ya no depende de las predicciones de grupo — se recalcula únicamente al liquidar una apuesta (ver `EloUpdate` más abajo y `research.md` Decision 2-bis). **Revisión 2026-07-31**: la liquidación pasa de un resultado de partido simulado y no persistido a un resultado real consultado en la fuente y cacheado (ver `MatchResult` más abajo y `research.md`), y cada `PlacedBet` guarda el Elo exacto que ganó o perdió (`elo_delta`).

## Entities

### AccountProfile *(existente, ampliado)*

**Campos nuevos**:
- `beths: int` — saldo gastable de la cuenta, por defecto `500`.
- `beths_last_grant_at: str` — timestamp ISO 8601 del último cobro de renta periódica; cadena vacía si nunca se ha concedido (cuentas migradas). Expuesto como `bethsLastGrantAt` en `AccountProfile.to_dict()` (Revisión 2026-07-17) para que el cliente calcule y muestre una cuenta atrás hasta el próximo Beth, sin necesitar un endpoint dedicado.
- `highest_elo_milestone: int` — el hito de ELO (múltiplo de 100) más alto ya recompensado; por defecto el tramo de 100 en el que cae el ELO inicial de la cuenta (p. ej. `1700` para un ELO de `1768`).
- `elo_bets_settled: int` — número de apuestas liquidadas que ya movieron el ELO de esta cuenta (no todas las apuestas liquidadas, solo las que cayeron dentro del tope diario); por defecto `0`. Determina el K-factor del ELO y el estado "provisional" de cara a un futuro ranking.
- `elo_bets_counted_today: int` / `elo_bets_counted_date: str` — cuántas apuestas ya han movido el ELO de esta cuenta en la fecha UTC `elo_bets_counted_date`; se reinicia a `0` automáticamente en la primera liquidación de un día distinto.

Los tres campos anteriores se exponen como `eloBetsSettled`/`eloBetsCountedToday`/`eloBetsCountedDate` en `AccountProfile.to_dict()` (Revisión 2026-07-17), no para mostrarse directamente al usuario sino para que el cliente reproduzca la fórmula de ELO en `frontend/data/eloPreview.ts` y previsualice el resultado de una apuesta antes de colocarla, sin round-trip al backend.

**Campos existentes reutilizados sin cambio de forma**:
- `elo: int` — deja de ser un valor fijo asignado al crear la cuenta; a partir de esta feature solo lo modifica la liquidación de apuestas de partido (ver `EloUpdate` más abajo). El cliente ya no puede escribirlo (Decision 11).

**Campo retirado**:
- `predictions_resolved: int` — existía en la versión original de esta spec (contaba predicciones de grupo resueltas votadas); se retira en la revisión 2026-07-17 y se sustituye por `elo_bets_settled`. `account_repository._migrate_profile_payload` descarta esta clave silenciosamente si aparece en un blob JSON persistido antiguo.

**Reglas**:
- Todos los campos nuevos tienen valor por defecto en el `dataclass`, así que una fila ya persistida sin ellos (cuenta creada antes de esta feature) se rellena automáticamente al cargarse. El renombrado `coins`→`beths` sí requiere remapeo explícito de claves legadas (no solo un valor por defecto), ver Decision 1 en `research.md`.
- `elo` y `beths` son completamente independientes: ninguna función de esta feature actualiza ambos a la vez, salvo la recompensa de hito (que solo toca `beths`, nunca `elo`).

### EloUpdate *(derivado, no persistido como entidad propia)*

Representa el resultado de recalcular el ELO de una cuenta tras liquidar una de sus apuestas de partido.

**Campos conceptuales**:
- `account_id`
- `previous_elo`, `new_elo`
- `implied_probability` — `1 / combined_odds` de la apuesta liquidada, acotada a `[0.05, 0.95]` (la "dificultad")
- `stake_multiplier` — rendimientos decrecientes sobre el `stake` apostado (capado a `elo.MAX_ELO_STAKE = 1000`), acotado a `[0.8, 1.5]` (la "confianza")
- `result` — `1.0` si la apuesta se ganó, `0.0` si se perdió
- `k_factor` — derivado de `elo_bets_settled` antes de esta actualización (3 escalones: 32/16/8)

**Reglas**:
- Se calcula y aplica al liquidar cada apuesta pendiente (`bet_repository._settle_due_bets` → `_apply_elo_for_settlement`); no existe fuera de esa operación ni se persiste como fila propia (solo su efecto: el `elo` actualizado en `AccountProfile`).
- No se calcula si la cuenta ya alcanzó `elo.DAILY_ELO_COUNTED_BETS` (5) apuestas contadas para ELO ese mismo día UTC — la apuesta se liquida y paga Beths igualmente, pero sin efecto en el ELO.
- Nunca se calcula para predicciones de grupo (`resolve_prediction`/`abort_prediction`), que no tienen relación alguna con el ELO tras la revisión 2026-07-17.

### EloMilestoneAward *(nueva, tabla `elo_milestone_awards`)*

Registro de auditoría de cada recompensa de Beths concedida por cruzar un hito de ELO.

**Campos**:
- `id`
- `account_id`
- `tier: int` — el hito cruzado (múltiplo de 100, p. ej. `1800`)
- `bonus_beths: int` — Beths concedidas por este hito (`elo.BETHS_PER_ELO_TIER`)
- `awarded_at: str` — timestamp ISO 8601

**Reglas**:
- Una fila por hito cruzado y cuenta; si una única actualización de ELO cruza varios hitos de golpe, se inserta una fila por cada uno (Decision 5).
- "Visto/no visto" no es un campo propio de esta tabla: se deriva comparando contra `notification_seen` con `mark_key = f"elo_milestone:{tier}"` para esa `account_id` (Decision 6) — una fila sin marca de vista correspondiente es una recompensa pendiente de mostrar.
- Es puramente aditiva/histórica; nunca se actualiza ni se borra una fila ya insertada.

### MatchResult *(real, cacheado tras la Revisión 2026-07-31 — ver `research.md`)*

El resultado real de un partido, consultado directamente en su propia fuente (football-data.org o PandaScore).

**Campos**:
- `match_id`
- `outcome: "local" | "empate" | "visitante"`

**Reglas (revisadas 2026-07-31)**:
- `match_results.resolve_match_result(match_id)` consulta `GET /matches/{id}` de la fuente correspondiente (football-data.org para `"match-{id}"`, PandaScore para `"esports-match-{id}"`) y deriva el resultado del campo real de la fuente (`score.winner` o `winner_id` contra `opponents[0]`). Devuelve `None` mientras la fuente no marque el partido como terminado, o si la consulta falla (token no configurado, red, límite de tasa) — nunca se inventa un resultado.
- Una vez resuelto (no `None`), se persiste en la tabla nueva `match_results` (`match_id` PK, `outcome`, `resolved_at`) y no se vuelve a consultar la fuente para ese `match_id` — un resultado final no cambia, a diferencia de las cuotas (`MatchOdds`, que siguen siendo puramente derivadas y sin persistir).
- Sustituye por completo al resultado simulado determinista de la Decision 8 original (`research.md`), que ya no existe en el código.

### PlacedBet *(existente de `005-combinada`, ampliado)*

**Campos nuevos**:
- `settled_at: str | None` — timestamp ISO 8601 de cuándo se liquidó; `None` mientras está pendiente.
- `elo_delta: int | None` *(Revisión 2026-07-31)* — el cambio de Elo exacto que esta apuesta aplicó a la cuenta al liquidarse (`new_elo - old_elo`, tras el suelo y el redondeo de `elo.update_elo_from_bet`); `None` mientras está pendiente, y también `None` una vez liquidada si en ese momento ya se había alcanzado el tope diario de apuestas que cuentan para Elo (Decision de anti-abuso) — la apuesta se liquida y paga Beths igual, solo sin efecto en Elo. Expuesto como `eloDelta` en `GET /bets/mine` (ver Decision 13, `research.md`).

**Cambio de significado del campo existente `status`**:
- `"realizada"` — pendiente de liquidar (estado inicial, sin cambios respecto a `005-combinada`).
- `"ganada"` — liquidada, el resultado real (`MatchResult`) coincidió con la selección (o con todas las selecciones, si es combinada); `potential_winnings` ya se acreditó al saldo de Beths de la cuenta.
- `"perdida"` — liquidada, el resultado real no coincidió; no se acredita nada (el `stake` ya se había debitado al colocarla).

**Reglas nuevas**:
- Una apuesta pasa de `"realizada"` a `"ganada"`/`"perdida"` exactamente una vez, cuando `now >= created_at + SETTLEMENT_DELAY_MINUTES` **y**, para cada una de sus `selections`, `MatchResult` ya tiene un resultado real confirmado (Decision 9, revisada 2026-07-31) — si falta el resultado de cualquier selección, la apuesta permanece `"realizada"` y se reintenta en la siguiente lectura. Evaluado de forma perezosa al listar las apuestas de una cuenta.
- Una `combinada` es `"ganada"` solo si el `MatchResult` de **todas** sus `selections` coincide con su `outcome` (Decision 10); si cualquiera falla, es `"perdida"` en bloque.
- El `stake` ya se debitó del saldo de Beths al colocar la apuesta (ver "Colocar una apuesta" más abajo); la liquidación solo puede sumar (`"ganada"`) o no hacer nada más (`"perdida"`), nunca vuelve a restar.

### "Colocar una apuesta" *(flujo, no entidad)*

**Regla nueva sobre el flujo ya existente de `place_bet`**:
- Antes de persistir ninguna fila, se calcula el importe total a debitar (suma de los `stake` de todas las apuestas simples del lote, o el `stake` compartido de una combinada) y se compara contra `AccountProfile.beths`. Si el saldo no alcanza, la operación entera se rechaza sin persistir nada y sin debitar nada (Decision 10). Además, cada `stake` individual se rechaza si supera `elo.MAX_ELO_STAKE` (1000), antes incluso de comprobar el saldo.
- Si alcanza, se debita el total una sola vez del saldo antes de persistir las apuestas.

## Relationships

```text
AccountProfile (1) ──── (N) EloMilestoneAward
AccountProfile (1) ──── (N) PlacedBet
PlacedBet ──liquida──▶ EloUpdate (aplicado a AccountProfile.elo, dentro del tope diario)
PlacedBet (1) ──── (N) PlacedBetSelection ──liquida contra──▶ MatchResult (real, consultado y cacheado por match_id)
CustomPrediction (1) ──── (N) PredictionVote ──resuelve──▶ ranking de grupo por aciertos (sin relación con AccountProfile.elo)
```

## Constantes de configuración (no editables por el usuario, FR-010/FR-011/Assumptions)

| Constante | Valor | Uso |
|---|---|---|
| `AccountProfile.beths` default | 500 | Saldo inicial de toda cuenta (nueva o migrada) |
| `INCOME_AMOUNT_BETHS` | 1 | Renta continua concedida por intervalo vencido |
| `INCOME_INTERVAL_SECONDS` | 300 | Periodo de la renta (1 Beth cada 5 minutos, con acumulación de intervalos vencidos) |
| `elo.ELO_FLOOR` | 100 | Suelo mínimo de ELO |
| `elo.ELO_TIER_SIZE` | 100 | Tamaño de cada hito de ELO |
| `elo.BETHS_PER_ELO_TIER` | 50 | Recompensa por hito cruzado |
| `elo.K_FACTOR_NEW` / `K_FACTOR_ESTABLISHED` / `K_FACTOR_VETERAN` | 32 / 16 / 8 | Bajo 30 / 30–199 / 200+ apuestas liquidadas que movieron ELO |
| `elo.P_IMPLIED_MIN` / `P_IMPLIED_MAX` | 0.05 / 0.95 | Tope de la probabilidad implícita de una cuota |
| `elo.STAKE_MULT_MIN` / `STAKE_MULT_MAX` | 0.8 / 1.5 | Tope del multiplicador de confianza por Beths apostados |
| `elo.MAX_ELO_STAKE` | 1000 | Tope de Beths por apuesta individual |
| `elo.DAILY_ELO_COUNTED_BETS` | 5 | Apuestas liquidadas por día y cuenta que mueven el ELO |
| `elo.PROVISIONAL_COUNTED_BETS` | 20 | Umbral de apuestas liquidadas bajo el cual el ranking se considera "provisional" |
| `SETTLEMENT_DELAY_MINUTES` | 90 | Tiempo tras el kickoff real (o tras colocar la apuesta si no se conoce) antes de empezar a consultar el resultado real *(Revisión 2026-07-31: throttle, ya no única condición — ver Decision 9)* |

## Esquema SQL nuevo (Revisión 2026-07-31)

```sql
CREATE TABLE IF NOT EXISTS match_results (
    match_id TEXT PRIMARY KEY,
    outcome TEXT NOT NULL,
    resolved_at TEXT NOT NULL
)
```

Caché de resultados reales ya resueltos (Decision 8 revisada); `placed_bets` gana además la columna `elo_delta INTEGER` (Decision 13) vía la misma migración `_ensure_column` que `settled_at`.
