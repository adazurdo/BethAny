# Tasks: Elo (Sistema de ELO y moneda del juego)

**Input**: Design documents from `/specs/006-elo/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/elo-economy-api.md, quickstart.md

**Tests**: TDD sigue diferido en este proyecto (`.specify/memory/constitution.md`); no se generan tareas de test.

**Organization**: Tareas agrupadas por historia de usuario para poder implementarse y probarse de forma independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivo distinto, sin dependencia de otra tarea sin terminar)
- **[Story]**: A qué historia de usuario pertenece (US1–US4)

## Path Conventions

Aplicación web existente: `backend/bethany_mock/` (Python) y `frontend/` (React/Expo).

---

## Phase 1: Setup

**Purpose**: Confirmar que no hace falta ninguna dependencia ni estructura nueva antes de tocar código.

- [X] T001 Confirmar que el backend (`cd backend && python -m bethany_mock.scripts.run_local_api` o `npm run dev` desde la raíz) y el frontend Expo arrancan hoy sin cambios, como línea base antes de empezar (no se añade ninguna dependencia nueva a `backend/` ni a `frontend/package.json`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Esquema de datos y funciones puras que todas las historias necesitan.

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta que esta fase esté completa.

- [X] T002 [P] Añadir a `AccountProfile` en `backend/bethany_mock/models.py` los campos `coins: int = 500`, `coins_last_grant_at: str = ""`, `predictions_resolved: int = 0`, `highest_elo_milestone: int = 1700`, con `to_dict()` incluyendo `"coins"`; actualizar `create_default_profile()` para fijar el mismo `coins=500` explícito
- [X] T003 [P] En `backend/bethany_mock/models.py`, añadir `settled_at: str | None = None` a `PlacedBet` y una nueva dataclass `EloMilestoneAward` (`id`, `account_id`, `tier`, `bonus_coins`, `awarded_at`) con `to_dict()`
- [X] T004 En `backend/bethany_mock/database.py: initialize_database()`, añadir `CREATE TABLE IF NOT EXISTS elo_milestone_awards (id TEXT PRIMARY KEY, account_id TEXT NOT NULL, tier INTEGER NOT NULL, bonus_coins INTEGER NOT NULL, awarded_at TEXT NOT NULL, FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE)` (depende de T003)
- [X] T005 En `backend/bethany_mock/database.py: initialize_database()`, añadir una migración segura (`PRAGMA table_info(placed_bets)` para comprobar si `settled_at` ya existe antes de `ALTER TABLE placed_bets ADD COLUMN settled_at TEXT`) — **no borrar ni recrear `backend/data/bethany.sqlite3`, ya contiene cuentas reales** (depende de T003)
- [X] T006 [P] Crear `backend/bethany_mock/elo.py` con las constantes `K_FACTOR_NEW = 32`, `K_FACTOR_ESTABLISHED = 16`, `ELO_FLOOR = 100`, `ELO_TIER_SIZE = 100`, `COINS_PER_ELO_TIER = 50`, y las funciones puras `expected_score(rating, opponent_rating) -> float`, `k_factor(games_played) -> int`, `update_elo(rating, opponent_rating, result, games_played) -> int` (aplica el suelo `ELO_FLOOR`), `milestone_tier(elo, tier_size=ELO_TIER_SIZE) -> int`
- [X] T007 En `backend/bethany_mock/api.py`, hacer que `PUT /account/me` ignore cualquier `elo`/`coins` del payload del cliente: tras construir el perfil con `_coerce_profile`, sobrescribir `profile.elo` y `profile.coins` con los valores ya persistidos en `account.profile` antes de llamar a `replace_account_state` (depende de T002)

**Checkpoint**: Esquema y funciones puras listos — las historias de usuario ya pueden implementarse.

---

## Phase 3: User Story 1 - Mi ELO sube o baja según acierte o falle en predicciones de grupo (Priority: P1) 🎯 MVP

**Goal**: Resolver una predicción de grupo recalcula el ELO de cada votante usando `elo.py`.

**Independent Test**: Ver `quickstart.md` pasos 1–2.

### Implementation for User Story 1

- [X] T008 [US1] En `backend/bethany_mock/social_repository.py: resolve_prediction`, tras marcar la predicción como resuelta, recorrer `list_votes(prediction_id)`: para cada voto, calcular `opponent_rating` como la media del `elo` del resto de votantes (excluir al propio votante); si no hay resto (único votante), no actualizar su ELO; si hay resto, llamar a `elo.update_elo(voter_elo, opponent_rating, 1.0 si acertó si no 0.0, voter.profile.predictions_resolved)`, incrementar `predictions_resolved` en 1, y persistir el perfil actualizado vía `account_repository.get_account_by_id` + `save_account_state`
- [X] T009 [US1] Verificar en `backend/bethany_mock/social_repository.py: abort_prediction` que ningún ELO se recalcula (no debe requerir cambio, solo confirmar que la ruta de abort no toca perfiles)
- [X] T010 [US1] En `frontend/app/(tabs)/profile.tsx`, quitar el `TextInput` de ELO editable del formulario "Edit account" (y el estado `elo`/`setElo` asociado); `updateAccount` deja de enviar `elo` en el payload de perfil

**Checkpoint**: El ELO ya es dinámico y no editable a mano; el ranking de grupo (que ya muestra `member.elo`) refleja los cambios sin tocar `social_repository.serialize_group_detail`.

---

## Phase 4: User Story 2 - Tengo un saldo de coins independiente de mi ELO que uso para apostar en partidos (Priority: P1)

**Goal**: Colocar una apuesta debita coins; un resultado simulado determinista liquida cada apuesta pendiente acreditando o no la ganancia.

**Independent Test**: Ver `quickstart.md` pasos 3–6.

### Implementation for User Story 2

- [X] T011 [P] [US2] Crear `backend/bethany_mock/match_results.py` con `generate_match_result(match_id: str) -> str` (`"local"|"empate"|"visitante"`), sembrado por `hashlib.sha256(f"{match_id}:result")` y ponderado por las mismas probabilidades que las cuotas; factorizar el cálculo de probabilidades ya existente en `backend/bethany_mock/odds.py: generate_match_odds` a un helper compartido (p. ej. `_match_probabilities(match_id)`) reutilizado por ambos módulos
- [X] T012 [US2] En `backend/bethany_mock/bet_repository.py: place_bet`, antes de persistir nada, calcular el importe total a debitar (suma de `stake` de todas las selecciones simples, o el `stake` compartido de una combinada), cargar la cuenta vía `account_repository.get_account_by_id`, comprobar `profile.coins >= total` y lanzar `ValueError("insufficient coins balance")` si no alcanza; si alcanza, debitar el total del `profile.coins` y persistir vía `save_account_state` antes de crear las filas de `placed_bets` (depende de T002)
- [X] T013 [US2] En `backend/bethany_mock/bet_repository.py`, añadir `SETTLEMENT_DELAY_MINUTES = 90` y una función `_settle_due_bets(account_id)` que recorra las `placed_bets` en estado `realizada` de esa cuenta con `created_at + SETTLEMENT_DELAY_MINUTES <= now`, calcule `match_results.generate_match_result` para cada `matchId` de sus `selections`, marque `ganada` (créditando `potential_winnings` al `profile.coins` vía `account_repository`) solo si **todas** las selecciones coinciden, o `perdida` en caso contrario, y actualice `status`/`settled_at`; llamarla al principio de `list_placed_bets(account_id)` (depende de T005, T011, T012)
- [X] T014 [US2] Confirmar que `GET /account/me` en `backend/bethany_mock/api.py` ya expone `profile.coins` (vía `AccountProfile.to_dict()` de T002) sin cambios adicionales de ruta
- [X] T015 [US2] En `frontend/components/ProfileSummary.tsx` y `frontend/app/(tabs)/profile.tsx`, añadir la visualización del saldo de coins junto al ELO (solo lectura)
- [X] T016 [US2] En la pantalla "Mis apuestas" del frontend (`frontend/app/(tabs)/bets/index.tsx`), mostrar el nuevo `status` (`realizada`/`ganada`/`perdida`) y `settledAt` de cada apuesta
- [X] T017 [US2] En el flujo de boleto del frontend (donde se llama a "Realizar apuesta"), mostrar el mensaje de error cuando la colocación se rechaza por `"insufficient coins balance"`

**Checkpoint**: El saldo de coins es real, se debita al apostar y se liquida solo con el tiempo, de forma completamente independiente del ELO (US1).

---

## Phase 5: User Story 3 - Recibo una renta periódica de coins aunque me haya quedado sin saldo (Priority: P2)

**Goal**: Toda cuenta activa recibe coins de forma periódica, sin quedar nunca bloqueada.

**Independent Test**: Ver `quickstart.md` paso 7.

### Implementation for User Story 3

- [X] T018 [US3] En `backend/bethany_mock/account_repository.py`, añadir `WEEKLY_INCOME_AMOUNT = 100` y `INCOME_INTERVAL_DAYS = 7`, y una función `_grant_periodic_income(account: UserAccount) -> bool` que compruebe si `coins_last_grant_at` está vacío o si han pasado `INCOME_INTERVAL_DAYS` desde entonces; si es así, sume `WEEKLY_INCOME_AMOUNT` a `profile.coins`, ponga `coins_last_grant_at = ahora` y devuelva `True`. Llamarla desde `get_account_by_id` y `authenticate_account`, persistiendo con `_serialize_account`/`save_account_state` solo si devolvió `True` (depende de T002)

**Checkpoint**: Ninguna cuenta puede quedarse bloqueada por falta de coins, sin depender de ELO ni de predicciones de grupo.

---

## Phase 6: User Story 4 - Recibo una recompensa de coins al alcanzar un nuevo hito de ELO (Priority: P3)

**Goal**: Cruzar un hito de ELO hacia arriba concede coins una única vez por hito, con un aviso visible hasta que se confirma su lectura.

**Independent Test**: Ver `quickstart.md` paso 8.

### Implementation for User Story 4

- [X] T019 [US4] En `backend/bethany_mock/social_repository.py: resolve_prediction` (extiende T008), tras actualizar el `elo` de cada votante, calcular `elo.milestone_tier(new_elo)`; si es mayor que `profile.highest_elo_milestone`, por cada tramo de `ELO_TIER_SIZE` entre el antiguo y el nuevo hito: acreditar `COINS_PER_ELO_TIER` a `profile.coins`, insertar una fila en `elo_milestone_awards`, y actualizar `profile.highest_elo_milestone` al nuevo hito más alto (depende de T004, T006, T008)
- [X] T020 [US4] En `backend/bethany_mock/social_repository.py`, añadir `list_unseen_elo_milestones(account_id) -> list[dict]` (los `elo_milestone_awards` de esa cuenta sin fila correspondiente en `notification_seen` con `mark_key = f"elo_milestone:{tier}"`) y `ack_elo_milestones(account_id) -> None` (llama a `mark_seen` para cada hito no visto) (depende de T019)
- [X] T021 [US4] En `backend/bethany_mock/api.py`: incluir `unseenEloMilestones` en la respuesta de `GET /account/me` (y en cualquier otra serialización de cuenta ya existente); añadir `POST /account/me/milestones/ack` que llame a `ack_elo_milestones(account_id)` y devuelva `{"ok": true}` (depende de T020)
- [X] T022 [US4] En `frontend/data/auth.ts` (o el módulo de tipos/requests de cuenta ya existente), añadir el tipo `unseenEloMilestones` a la cuenta y una función `ackEloMilestones()` que llame a `POST /account/me/milestones/ack`
- [X] T023 [US4] En `frontend/app/(tabs)/profile.tsx`, mostrar un aviso/toast cuando `unseenEloMilestones` no esté vacío (hito alcanzado + coins recibidas) y llamar a `ackEloMilestones()` al descartarlo (depende de T022)

**Checkpoint**: Todas las historias funcionan juntas — el ELO (US1) puede disparar una recompensa de coins (US4) sin que las coins (US2/US3) dejen de ser independientes del ELO.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T024 Ejecutar la validación completa de `quickstart.md` (pasos 1–9) contra el backend local, confirmando que las cuentas ya existentes en `backend/data/bethany.sqlite3` cargan sin error tras la migración (T005) y reciben los valores por defecto de coins/ELO esperados
- [ ] T025 [P] Validación en Expo (`quickstart.md` paso 10): saldo de coins visible y aviso de hito mostrable/descartable en un simulador o dispositivo móvil

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup — bloquea todas las historias.
- **User Stories (Phase 3+)**: todas dependen de Foundational.
  - US1 y US2 son P1 y no dependen entre sí: pueden implementarse en paralelo.
  - US3 (P2) solo depende de Foundational (T002), no de US1 ni de US2.
  - US4 (P3) depende de que exista el recálculo de ELO de US1 (T008) y de la tabla `elo_milestone_awards` de Foundational (T004).
- **Polish (Phase 7)**: depende de que las historias que se quieran validar ya estén completas.

### User Story Dependencies

- **US1 (P1)**: depende solo de Foundational.
- **US2 (P1)**: depende solo de Foundational. Independiente de US1 (ninguna coin se mueve por ELO ni viceversa, por diseño — FR-005).
- **US3 (P2)**: depende de Foundational (el campo `coins` debe existir). Independiente de US1.
- **US4 (P3)**: depende de Foundational y de US1 (T008 debe existir antes de poder extenderlo en T019).

### Parallel Opportunities

- T002, T003, T006 (Foundational) tocan archivos/aspectos distintos y pueden ir en paralelo.
- Una vez completada Foundational, US1 y US2 pueden implementarse en paralelo (equipos distintos); US3 puede unirse a ese paralelismo en cuanto Foundational esté lista.
- T011 (US2, `match_results.py`) es paralelizable frente a T012/T013 hasta que estas lo necesiten como dependencia.

---

## Parallel Example: Foundational

```bash
Task: "Añadir campos coins/coins_last_grant_at/predictions_resolved/highest_elo_milestone a AccountProfile en backend/bethany_mock/models.py"
Task: "Añadir settled_at a PlacedBet y la dataclass EloMilestoneAward en backend/bethany_mock/models.py"
Task: "Crear backend/bethany_mock/elo.py con las funciones puras de ELO"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2)

1. Completar Phase 1: Setup.
2. Completar Phase 2: Foundational (bloqueante).
3. Completar Phase 3 (US1) y Phase 4 (US2) — juntas ya entregan el diseño acordado con el usuario: ELO dinámico + saldo de coins independiente y liquidable.
4. **STOP and VALIDATE**: ejecutar `quickstart.md` pasos 1–6.

### Incremental Delivery

1. Setup + Foundational → base lista.
2. US1 → ELO dinámico validable de forma independiente.
3. US2 → saldo de coins y liquidación de apuestas validable de forma independiente.
4. US3 → renta periódica (evita bloqueos).
5. US4 → recompensa de hito de ELO (conecta US1 y US2 puntualmente, sin fusionarlos).
6. Polish → validación completa + Expo.

## Notes

- Sin tareas de test: TDD diferido en todo el proyecto (constitución).
- `settled_at` (T005) es la única migración de esquema real sobre la base de datos ya existente; todo lo demás vive en el blob JSON de `AccountProfile` y se rellena con valores por defecto al cargar cuentas ya existentes.
- Confirmar tras cada fase que `backend/data/bethany.sqlite3` sigue intacto (no se ha borrado ni recreado).
