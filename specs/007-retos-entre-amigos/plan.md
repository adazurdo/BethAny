# Implementation Plan: Retos entre amigos (reto 1v1 con Beths)

**Branch**: `[007-retos-entre-amigos]` | **Date**: 2026-07-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-retos-entre-amigos/spec.md`

## Summary

"Retos entre amigos" aparece en el README como funcionalidad MVP pero no existe ningún código para ella hoy: lo único parecido son los grupos de predicciones (`004-social`), que son un espacio compartido de N personas votando una pregunta, no un desafío directo 1 a 1 con Beths en juego. Esta feature añade un reto peer-to-peer entre dos amigos sobre un partido mock ya existente: quien reta elige un resultado (local/empate/visitante) y un importe de Beths; quien es retado puede aceptar (arriesgando el mismo importe, apostando implícitamente al resultado contrario) o rechazar. Al vencer la ventana de liquidación ya usada por las apuestas de partido (`006-elo`), el reto se liquida solo, sin scheduler, con el mismo resultado simulado determinista que ya usa `bet_repository.py`. No afecta al Elo de ninguna cuenta, igual que las predicciones de grupo.

## Technical Context

**Language/Version**: Python 3.11+ (stdlib only: `sqlite3`, `http.server`) para el backend; React + Expo (stack ya existente) para el frontend.

**Primary Dependencies**: Ninguna nueva. Reutiliza `bethany_mock.models`, `bethany_mock.account_repository` (débito/crédito de Beths), `bethany_mock.social_repository` (`is_friend`, `ConflictError`), `bethany_mock.bet_repository` (`SETTLEMENT_DELAY_MINUTES`), `bethany_mock.match_results`, `bethany_mock.mock_dataset_repository`, `bethany_mock.odds`, `bethany_mock.api`, y en frontend `data/social.ts` (lista de amigos ya cargada en la pantalla Social), `data/mockCompetitions.ts` (selector de partido), `data/auth.ts` (`requestJson`).

**Storage**: SQLite local (`backend/data/bethany.sqlite3`). Una tabla nueva (`friend_challenges`), sin ninguna migración `ALTER TABLE` sobre tablas existentes — a diferencia de `006-elo`, todos los campos de esta feature son propios de la tabla nueva, ninguno vive en el blob JSON de `AccountProfile`.

**Testing**: TDD sigue diferido. Validación manual/funcional vía `quickstart.md`, mismo patrón que el resto de specs.

**Target Platform**: Entorno de desarrollo local con preview web y validación móvil vía Expo, ya que la superficie nueva vive en la pantalla Social ya existente (móvil).

**Project Type**: Aplicación web con cliente móvil (misma forma que el resto de specs de este repo).

**Performance Goals**: Creación, respuesta y liquidación perezosa se resuelven en la misma petición local que ya existía (crear reto / listar retos), sin trabajo en segundo plano, igual que `_settle_due_bets`.

**Constraints**: Sin dinero real. Sin scheduler ni proceso en segundo plano. Sin cuota de mercado ni efecto en Elo (ver spec Clarifications). Sin negociación de importe ni de resultado por parte del retado (v1 estrictamente simétrico). Sin expiración automática de un reto pendiente.

**Scale/Scope**: Mismo entorno local de un puñado de cuentas y partidos que el resto del prototipo.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Simplicity: Una entidad nueva (`FriendChallenge`), un repositorio nuevo (`challenge_repository.py`) calcado del patrón de liquidación perezosa ya existente, ninguna entidad "Wallet"/"Escrow" separada (reutiliza `AccountProfile.beths`), ninguna reutilización forzada de `PlacedBet` ni de grupos de predicciones (ver `research.md` Decision 1).
- [x] Local-first: Todo persiste en el mismo SQLite local; sin dependencias de red nuevas.
- [x] Stack compliance: Python posee todo el cálculo/estado nuevo; React/Expo añade una sección y un modal dentro de una pantalla móvil ya existente; validación móvil incluida en `quickstart.md` paso 10.
- [x] TDD status: Diferido, consistente con el resto del proyecto.
- [x] Security scope: Sin dinero real, solo Beths (moneda de juego). El resultado simulado de partido reutilizado ya está documentado como simplificación mock-stage en `006-elo`; no se repite ni se presenta aquí como dato real.

## Project Structure

### Documentation (this feature)

```text
specs/007-retos-entre-amigos/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── challenges-api.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── bethany_mock/
│   ├── models.py                 # NEW: FriendChallenge dataclass
│   ├── database.py                # NEW: friend_challenges table (CREATE TABLE IF NOT EXISTS, sin ALTER)
│   ├── challenge_repository.py   # NEW: create/list/accept/decline/cancel + lazy settlement (mirrors bet_repository._settle_due_bets)
│   └── api.py                     # NEW routes: GET /challenges/mine, POST /challenges, POST /challenges/{id}/accept|decline|cancel

frontend/
├── data/
│   └── challenges.ts             # NEW: typed API client (mirrors data/social.ts)
├── components/
│   ├── ChallengeModal.tsx        # NEW: create-challenge modal (friend + match + outcome + stake), mirrors CreateGroupModal.tsx
│   └── ChallengeRow.tsx          # NEW: one challenge card with contextual actions (accept/decline/cancel), mirrors FriendRow.tsx
└── app/
    └── (tabs)/
        └── social.tsx             # Gains a new "Retos" SectionCard (incoming/outgoing/active/resolved) + "Nuevo reto" button opening ChallengeModal
```

**Structure Decision**: Se extiende el paquete `bethany_mock` ya existente (ningún servicio nuevo, ningún framework nuevo) y la pantalla Social ya existente (ninguna pestaña de navegación nueva — ver `research.md` Decision 8). El único componente de UI genuinamente nuevo es el modal de creación de reto; el resto son filas/tarjetas del mismo estilo que `FriendRow`/`GroupCard` ya existentes.

## Phase 0: Research Findings

See [research.md](./research.md) for full rationale. Summary of decisions:

- Entidad y tabla nuevas en vez de forzar `PlacedBet` a modelar dos cuentas (Decision 1).
- Sin cuota de mercado, sin efecto en Elo, mismo precedente que las predicciones de grupo (Decision 2).
- Reutiliza `match_results.generate_match_result` y `SETTLEMENT_DELAY_MINUTES` de `006-elo` sin cambios, para que el resultado de un partido nunca diverja entre una apuesta normal y un reto sobre el mismo `match_id` (Decision 3).
- Liquidación perezosa en el punto de lectura, sin scheduler, mismo patrón que `_settle_due_bets`/`_grant_periodic_income`/`_group_has_unseen_update` (Decision 4).
- Débito de quien reta en el momento de crear el reto; débito de quien acepta solo al aceptar (Decision 5).
- Sin negociación de importe/resultado por el retado en v1 (Decision 6).
- Sin expiración automática de un reto pendiente en v1 (Decision 7).
- Frontend: nueva sección dentro de la pantalla Social ya existente, no una pestaña nueva; selector de partido ligero reutilizando los datos mock ya cargados en otras pantallas (Decision 8).

## Phase 1: Design Outputs

### Data Model

See [data-model.md](./data-model.md) for `FriendChallenge`, sus transiciones de estado, sus invariantes de saldo, y el esquema SQL de `friend_challenges`.

### Interface Contract

See [contracts/challenges-api.md](./contracts/challenges-api.md) for `GET /challenges/mine`, `POST /challenges`, `POST /challenges/{id}/accept`, `POST /challenges/{id}/decline`, `POST /challenges/{id}/cancel`.

### Validation Guide

See [quickstart.md](./quickstart.md) for the friendship-gate, debit-on-create, insufficient-funds, accept/decline/cancel, lazy-settlement, and Elo-untouched validation flow, plus Expo validation.

## Re-evaluate Constitution Check After Design

- [x] Simplicity remains intact: one new table, one new repository module, zero changes required to `bet_repository.py`, `social_repository.py`, or `elo.py` (only imports from them).
- [x] Local-first remains intact: everything still persists to the same local SQLite file; no scheduler or background process introduced.
- [x] Stack compliance remains intact: Python backend, React/Expo frontend, mobile validation covered in quickstart.
- [x] TDD remains deferred.
- [x] Security scope remains within the mock-stage boundary: no money/payment data; reuses the already-documented simulated match result, doesn't introduce a new one.

## Complexity Tracking

No constitution exceptions are required for this feature.
