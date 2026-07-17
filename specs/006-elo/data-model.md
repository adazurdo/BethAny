# Data Model: Elo (Sistema de ELO y moneda del juego)

## Overview

Esta feature amplía el `AccountProfile` ya existente con un saldo de coins y los contadores necesarios para el ELO dinámico y los hitos, sin crear una entidad "Wallet" separada (Decision 1, `research.md`). Añade una entidad nueva de solo-auditoría (`EloMilestoneAward`) y una liquidación real sobre el `PlacedBet` ya existente de `005-combinada`, apoyada en un resultado de partido simulado que no se persiste (igual patrón que `MatchOdds`).

## Entities

### AccountProfile *(existente, ampliado)*

**Campos nuevos**:
- `coins: int` — saldo gastable de la cuenta, por defecto `500` (`STARTING_COINS`).
- `coins_last_grant_at: str` — timestamp ISO 8601 del último cobro de renta periódica; cadena vacía si nunca se ha concedido (cuentas migradas).
- `predictions_resolved: int` — número de predicciones de grupo resueltas en las que esta cuenta votó; por defecto `0`. Determina el K-factor del ELO.
- `highest_elo_milestone: int` — el hito de ELO (múltiplo de 100) más alto ya recompensado; por defecto el tramo de 100 en el que cae el ELO inicial de la cuenta (p. ej. `1700` para un ELO de `1768`).

**Campos existentes reutilizados sin cambio de forma**:
- `elo: int` — deja de ser un valor fijo asignado al crear la cuenta; a partir de esta feature solo lo modifica la resolución de predicciones de grupo (ver `PredictionVote` → recálculo de ELO más abajo). El cliente ya no puede escribirlo (Decision 11).

**Reglas**:
- Todos los campos nuevos tienen valor por defecto en el `dataclass`, así que una fila ya persistida sin ellos (cuenta creada antes de esta feature) se rellena automáticamente al cargarse — no requiere migración de esquema (Decision 1).
- `elo` y `coins` son completamente independientes: ninguna función de esta feature actualiza ambos a la vez, salvo la recompensa de hito (que solo toca `coins`, nunca `elo`).

### EloUpdate *(derivado, no persistido como entidad propia)*

Representa el resultado de recalcular el ELO de un votante tras resolver una predicción.

**Campos conceptuales**:
- `account_id`
- `previous_elo`, `new_elo`
- `opponent_rating` — ELO medio del resto de votantes de esa predicción (excluyendo a este votante)
- `result` — `1.0` si acertó, `0.0` si falló
- `k_factor` — derivado de `predictions_resolved` antes de esta actualización

**Reglas**:
- Se calcula y aplica por cada voto de una predicción en el momento de `resolve_prediction`; no existe fuera de esa operación ni se persiste como fila propia (solo su efecto: el `elo` actualizado en `AccountProfile`).
- Si una predicción tiene un único votante, no se calcula ninguna `EloUpdate` para él (no hay `opponent_rating` posible).
- Nunca se calcula para `abort_prediction`.

### EloMilestoneAward *(nueva, tabla `elo_milestone_awards`)*

Registro de auditoría de cada recompensa de coins concedida por cruzar un hito de ELO.

**Campos**:
- `id`
- `account_id`
- `tier: int` — el hito cruzado (múltiplo de 100, p. ej. `1800`)
- `bonus_coins: int` — coins concedidas por este hito (`COINS_PER_ELO_TIER`)
- `awarded_at: str` — timestamp ISO 8601

**Reglas**:
- Una fila por hito cruzado y cuenta; si una única actualización de ELO cruza varios hitos de golpe, se inserta una fila por cada uno (Decision 5).
- "Visto/no visto" no es un campo propio de esta tabla: se deriva comparando contra `notification_seen` con `mark_key = f"elo_milestone:{tier}"` para esa `account_id` (Decision 6) — una fila sin marca de vista correspondiente es una recompensa pendiente de mostrar.
- Es puramente aditiva/histórica; nunca se actualiza ni se borra una fila ya insertada.

### MatchResult *(derivado, no persistido)*

El resultado simulado de un partido, análogo a `MatchOdds` (`005-combinada`).

**Campos**:
- `match_id`
- `outcome: "local" | "empate" | "visitante"`

**Reglas**:
- Determinista a partir de `match_id`, ponderado por las mismas probabilidades usadas para generar sus cuotas (Decision 8); el mismo `match_id` siempre produce el mismo resultado.
- No se almacena en ninguna tabla ni columna; se recalcula cada vez que se liquida una apuesta sobre ese partido, igual que las cuotas se recalculan en cada lectura.

### PlacedBet *(existente de `005-combinada`, ampliado)*

**Campo nuevo**:
- `settled_at: str | None` — timestamp ISO 8601 de cuándo se liquidó; `None` mientras está pendiente.

**Cambio de significado del campo existente `status`**:
- `"realizada"` — pendiente de liquidar (estado inicial, sin cambios respecto a `005-combinada`).
- `"ganada"` — liquidada, el resultado simulado coincidió con la selección (o con todas las selecciones, si es combinada); `potential_winnings` ya se acreditó al saldo de coins de la cuenta.
- `"perdida"` — liquidada, el resultado simulado no coincidió; no se acredita nada (el `stake` ya se había debitado al colocarla).

**Reglas nuevas**:
- Una apuesta pasa de `"realizada"` a `"ganada"`/`"perdida"` exactamente una vez, cuando `now >= created_at + SETTLEMENT_DELAY_MINUTES` (Decision 9), evaluado de forma perezosa al listar las apuestas de una cuenta.
- Una `combinada` es `"ganada"` solo si el `MatchResult` de **todas** sus `selections` coincide con su `outcome` (Decision 10); si cualquiera falla, es `"perdida"` en bloque.
- El `stake` ya se debitó del saldo de coins al colocar la apuesta (ver "Colocar una apuesta" más abajo); la liquidación solo puede sumar (`"ganada"`) o no hacer nada más (`"perdida"`), nunca vuelve a restar.

### "Colocar una apuesta" *(flujo, no entidad)*

**Regla nueva sobre el flujo ya existente de `place_bet`**:
- Antes de persistir ninguna fila, se calcula el importe total a debitar (suma de los `stake` de todas las apuestas simples del lote, o el `stake` compartido de una combinada) y se compara contra `AccountProfile.coins`. Si el saldo no alcanza, la operación entera se rechaza sin persistir nada y sin debitar nada (Decision 10).
- Si alcanza, se debita el total una sola vez del saldo antes de persistir las apuestas.

## Relationships

```text
AccountProfile (1) ──── (N) EloMilestoneAward
AccountProfile (1) ──── (N) PlacedBet
CustomPrediction (1) ──── (N) PredictionVote ──resuelve──▶ EloUpdate (aplicado a AccountProfile.elo)
PlacedBet (1) ──── (N) PlacedBetSelection ──liquida contra──▶ MatchResult (derivado de match_id)
```

## Constantes de configuración (no editables por el usuario, FR-010/FR-011/Assumptions)

| Constante | Valor | Uso |
|---|---|---|
| `STARTING_COINS` | 500 | Saldo inicial de toda cuenta (nueva o migrada) |
| `WEEKLY_INCOME_AMOUNT` | 100 | Renta periódica |
| `INCOME_INTERVAL_DAYS` | 7 | Periodo de la renta |
| `ELO_FLOOR` | 100 | Suelo mínimo de ELO |
| `ELO_TIER_SIZE` | 100 | Tamaño de cada hito de ELO |
| `COINS_PER_ELO_TIER` | 50 | Recompensa por hito cruzado |
| `K_FACTOR_NEW` / `K_FACTOR_ESTABLISHED` | 32 / 16 | Antes/después de 30 predicciones resueltas |
| `SETTLEMENT_DELAY_MINUTES` | 90 | Tiempo tras colocar una apuesta hasta poder liquidarla |
