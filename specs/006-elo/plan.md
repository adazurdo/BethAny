# Implementation Plan: Elo (Sistema de ELO y moneda del juego)

**Branch**: `[006-elo]` | **Date**: 2026-07-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-elo/spec.md`

> **Nota (2026-07-17)**: este plan describe la primera versión implementada de la feature (ELO desde predicciones de grupo, moneda "coins", renta semanal). Dos revisiones posteriores el mismo día cambiaron el diseño de fondo — ELO ahora solo desde apuestas de partido, moneda renombrada a "Beths", renta continua de 5 minutos, vista previa de ELO en cliente — sin volver a pasar por planificación formal. El plan se conserva tal cual como registro histórico de lo que se construyó primero; **`research.md` es la fuente de verdad actualizada** (secciones "Revisión 2026-07-17"), junto con `spec.md`, `data-model.md` y `contracts/elo-economy-api.md`, todos ya actualizados a los nuevos nombres y comportamiento.

## Summary

Hoy `AccountProfile.elo` es un número fijo asignado al crear la cuenta (`create_default_profile`, siempre `1768`) y editable a mano desde la pantalla de perfil; no existe ningún saldo gastable, ninguna renta, ninguna recompensa, y las apuestas de partido (`PlacedBet`, de `005-combinada`) se persisten pero nunca se liquidan. Esta feature hace dinámico el ELO (recalculado solo al resolver predicciones de grupo, comparando cada votante contra el ELO medio del resto de votantes — fórmula estándar de ajedrez generalizada a N jugadores), añade un saldo de coins completamente independiente del ELO con renta periódica para que nunca llegue a bloquear a nadie, liquida las apuestas de partido ya existentes contra un resultado de partido simulado de forma determinista (no existe ningún resultado real en el sistema hoy — ver spec Clarifications), y añade una recompensa puntual de coins cada vez que el ELO de una cuenta cruza un hito redondo hacia arriba. Todo se apoya en infraestructura ya existente (el blob JSON de `AccountProfile`, el patrón de comprobación perezosa por timestamp ya usado para notificaciones de grupo, la tabla `notification_seen`) en vez de introducir un servicio de economía o un scheduler nuevos.

## Technical Context

**Language/Version**: Python 3.11+ (stdlib only: `sqlite3`, `http.server`) para el backend; React + Expo (stack ya existente) para el frontend.

**Primary Dependencies**: Ninguna nueva. Reutiliza `bethany_mock.models`, `bethany_mock.account_repository`, `bethany_mock.social_repository`, `bethany_mock.bet_repository`, `bethany_mock.odds`, `bethany_mock.api`, y `frontend/components/ProfileSummary.tsx` / `frontend/app/(tabs)/profile.tsx`.

**Storage**: SQLite local (`backend/data/bethany.sqlite3`, **contiene cuentas reales, no debe borrarse ni recrearse**). Una tabla nueva (`elo_milestone_awards`); una columna nueva sobre una tabla ya existente (`placed_bets.settled_at`, vía `ALTER TABLE` seguro — ver `research.md` Decision 12); el resto de campos nuevos viven dentro del blob JSON ya existente de `AccountProfile`, sin migración de esquema.

**Testing**: TDD sigue diferido. Validación manual/funcional vía `quickstart.md`, mismo patrón que `004-social`/`005-combinada`.

**Target Platform**: Entorno de desarrollo local con preview web y validación móvil vía Expo, ya que el saldo de coins, el ELO y el aviso de hito se muestran en la pantalla de perfil (superficie ya móvil).

**Project Type**: Aplicación web con cliente móvil (misma forma que `002-base-de-datos`, `004-social`, `005-combinada`).

**Performance Goals**: El recálculo de ELO al resolver una predicción, el débito/crédito de coins y la liquidación perezosa de apuestas se resuelven en la misma petición local que ya existía (resolver predicción / listar apuestas), sin trabajo en segundo plano.

**Constraints**: Sin dinero real ni pagos. Sin scheduler ni proceso en segundo plano (todo lo dependiente del tiempo se resuelve de forma perezosa en el punto de lectura, igual que `_group_has_unseen_update` ya hace). Sin integración con resultados reales de partido (simulados de forma determinista, decisión explícita del usuario — ver spec Clarifications). Sin ranking global real (sigue fuera de alcance). Sin nueva migración de esquema salvo la imprescindible `ALTER TABLE placed_bets ADD COLUMN settled_at` sobre la base de datos real ya existente.

**Scale/Scope**: Mismo entorno local de un puñado de cuentas y partidos que el resto del prototipo.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Simplicity: Reutiliza `AccountProfile` (un solo perfil, sin entidad "Wallet" separada), el flujo ya existente de `resolve_prediction` y `place_bet`, y la tabla `notification_seen` ya existente para "visto/no visto" de hitos. Solo una tabla nueva (`elo_milestone_awards`) y una columna nueva sobre una tabla ya existente.
- [x] Local-first: Todo el cálculo (ELO, saldo, renta, resultado simulado, liquidación) es local y determinista; no se añade ninguna dependencia de red.
- [x] Stack compliance: Python posee todo el cálculo nuevo; React/Expo muestra el saldo, el ELO de solo lectura y el aviso de hito; validación móvil incluida en `quickstart.md`.
- [x] TDD status: Diferido, consistente con el resto del proyecto.
- [x] Security scope: Sin dinero real. La simulación determinista de resultados de partido se documenta explícitamente como tal (spec Clarifications, `research.md` Decision 8), no se presenta como un dato real.

## Project Structure

### Documentation (this feature)

```text
specs/006-elo/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── elo-economy-api.md
└── tasks.md             # Created later by /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── bethany_mock/
│   ├── models.py                 # AccountProfile gains coins/coins_last_grant_at/predictions_resolved/highest_elo_milestone; PlacedBet gains settled_at; new EloMilestoneAward dataclass
│   ├── database.py               # NEW: elo_milestone_awards table; safe ALTER TABLE for placed_bets.settled_at
│   ├── elo.py                    # NEW: expected_score, k_factor, update_elo, milestone_tier (pure functions)
│   ├── match_results.py          # NEW: generate_match_result(match_id) -> outcome, deterministic, shares probabilities with odds.py
│   ├── odds.py                   # Factor out shared probability helper reused by match_results.py
│   ├── account_repository.py     # NEW: periodic coin income grant on account load; STARTING_COINS default
│   ├── social_repository.py      # resolve_prediction recalculates elo per voter, awards milestones; NEW: list_unseen_elo_milestones, ack_elo_milestones
│   ├── bet_repository.py         # place_bet debits coins balance (rejects if insufficient); NEW: lazy settlement of due bets in list_placed_bets
│   └── api.py                    # /account/me response gains unseenEloMilestones; PUT /account/me ignores client elo/coins; NEW: POST /account/me/milestones/ack; /bets/place surfaces insufficient-funds error

frontend/
├── app/
│   └── (tabs)/
│       ├── profile.tsx           # ELO becomes read-only; new "Wallet" section showing coins; milestone toast wired to unseenEloMilestones + ack
│       └── bets/index.tsx        # Shows ganada/perdida/realizada status and settledAt (already exists from 005-combinada)
├── components/
│   └── ProfileSummary.tsx        # Gains a coins display
└── data/
    └── auth.ts                   # Account/profile types gain coins, unseenEloMilestones; new ackEloMilestones() request helper
```

**Structure Decision**: Se extiende el paquete `bethany_mock` ya existente (ningún servicio nuevo) y la pantalla de perfil ya existente (ninguna pantalla nueva); el único elemento de UI nuevo es un aviso/toast de hito de ELO dentro de `profile.tsx`, siguiendo el mismo patrón ya usado para el resto de notificaciones sociales (`SocialNotificationsContext`) pero sin necesidad de reutilizar ese contexto concreto, ya que los hitos son un evento puntual del propio perfil, no un contador vivo de badges de navegación.

## Phase 0: Research Findings

See [research.md](./research.md) for full rationale. Summary of decisions:

- ELO y coins viven en el mismo `AccountProfile`, como campos independientes con valores por defecto — sin migración de esquema, sin entidad "Wallet" separada (Decision 1).
- El ELO se recalcula solo dentro de `resolve_prediction`, comparando cada votante contra el ELO medio del resto de votantes de esa misma predicción (Decision 2), con K-factor que baja de 32 a 16 tras 30 predicciones resueltas (Decision 3) y un suelo mínimo de 100 (Decision 4).
- Los hitos de ELO se recompensan comparando contra un puntero "hito más alto ya recompensado" (Decision 5), y su estado de visto/no visto reutiliza la tabla `notification_seen` ya existente (Decision 6).
- El saldo inicial y la renta periódica de coins se conceden de forma perezosa al cargar la cuenta, sin scheduler (Decision 7).
- El resultado de cada partido para liquidar apuestas es simulado, determinista y sembrado por `match_id`, reutilizando las mismas probabilidades ya usadas para las cuotas (Decision 8) — decisión confirmada explícitamente por el usuario tras descubrir que no existe ningún resultado real en el sistema.
- Una apuesta se considera liquidable un tiempo fijo tras colocarse (90 minutos), no según el estado real del partido, que no es fiable como señal (Decision 9).
- `place_bet` debita el saldo antes de persistir y rechaza si no alcanza; una combinada solo gana si ganan todas sus selecciones (Decision 10).
- El servidor ignora cualquier ELO/coins que llegue en `PUT /account/me` (Decision 11).
- `placed_bets.settled_at` es la única columna que necesita una migración `ALTER TABLE` real, porque esa tabla no vive en un blob JSON como el resto (Decision 12).

## Phase 1: Design Outputs

### Data Model

See [data-model.md](./data-model.md) for the extended `AccountProfile`, the new `EloMilestoneAward`/derived `EloUpdate`/`MatchResult` entities, and the extended `PlacedBet`.

### Interface Contract

See [contracts/elo-economy-api.md](./contracts/elo-economy-api.md) for the extended `/account/me` (`GET`/`PUT`), the new `POST /account/me/milestones/ack`, and the extended `/bets/place`/`/bets/mine`.

### Validation Guide

See [quickstart.md](./quickstart.md) for the elo-recalculation, wallet-debit, settlement, periodic-income, milestone-reward, and profile-integrity validation flow.

## Re-evaluate Constitution Check After Design

- [x] Simplicity remains intact: one new table, one new pure-function module (`elo.py`) plus one small derived-result module (`match_results.py`), reusing `notification_seen` instead of a parallel seen/ack table.
- [x] Local-first remains intact: everything still persists to the same local SQLite file; no scheduler or background process introduced.
- [x] Stack compliance remains intact: Python backend, React/Expo frontend, mobile validation covered in quickstart.
- [x] TDD remains deferred.
- [x] Security scope remains within the mock-stage boundary: no money/payment data; the simulated match result is explicitly documented as a mock-stage simplification, not presented as real.

## Complexity Tracking

No constitution exceptions are required for this feature.
