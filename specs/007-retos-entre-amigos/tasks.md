---

description: "Task list for 007-retos-entre-amigos"
---

# Tasks: Retos entre amigos (reto 1v1 con Beths)

**Input**: Design documents from `/specs/007-retos-entre-amigos/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/challenges-api.md

**Tests**: TDD diferido en todo el proyecto (constitución) — sin tareas de test, validación vía `quickstart.md`.

**Organization**: Tareas agrupadas por user story para que cada una sea implementable y comprobable de forma independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias)
- **[Story]**: A qué user story pertenece (US1-US4)

## Phase 1: Setup

- [X] T001 Crear la carpeta de spec `specs/007-retos-entre-amigos/` con spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md (ya completado antes de esta lista)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Esquema y modelo de datos que toda user story necesita.

**⚠️ CRITICAL**: Ninguna user story puede implementarse hasta terminar esta fase.

- [ ] T002 Añadir el dataclass `FriendChallenge` (con `to_dict`) a `backend/bethany_mock/models.py`, junto a `FriendRequest`/`PlacedBet`
- [ ] T003 Añadir la tabla `friend_challenges` (`CREATE TABLE IF NOT EXISTS`, ver esquema en `data-model.md`) a `initialize_database()` en `backend/bethany_mock/database.py`
- [ ] T004 Crear `backend/bethany_mock/challenge_repository.py` con `initialize_repository()`, `_new_id`, `_utcnow`, `_parse_timestamp`, `_debit_beths`/`_credit_beths` locales (mismo patrón que `bet_repository.py`), y `_row_to_challenge`/serialización a `ChallengeView` camelCase (incluye `challengerDisplayName`/`opponentDisplayName` resolviendo cada cuenta vía `account_repository.get_account_by_id`)
- [ ] T010 Registrar `initialize_repository` de `challenge_repository` en `create_app()` de `backend/bethany_mock/api.py` (mismo patrón que `initialize_bet_repository`)

**Checkpoint**: Tabla y modelo listos — las user stories pueden empezar.

---

## Phase 3: User Story 1 - Reto a un amigo a una apuesta 1v1 (Priority: P1) 🎯 MVP

**Goal**: Crear un reto pendiente, con validación de amistad, partido abierto a apuestas y saldo suficiente, debitando de inmediato a quien reta.

**Independent Test**: Ver spec.md User Story 1 — `quickstart.md` pasos 1-3.

### Implementation for User Story 1

- [ ] T005 [US1] Implementar `create_challenge(challenger_account_id, opponent_account_id, match_id, outcome, stake)` en `backend/bethany_mock/challenge_repository.py`: valida `is_friend` (403 vía `PermissionError`), resuelve y valida el partido igual que `bet_repository._resolve_selection` (`LookupError`/`ConflictError`), valida `outcome` y `stake` (`ValueError`), debita a `challenger_account_id` (`ValueError` si insuficiente), persiste con `status="pending"`
- [ ] T006 [US1] Añadir `POST /challenges` a `backend/bethany_mock/api.py` (sesión requerida, payload `opponentAccountId/matchId/outcome/stake`, mapea excepciones a 400/403/404/409 igual que `/bets/place`), devuelve 201 con el `ChallengeView`
- [ ] T007 [P] [US1] Crear `frontend/data/challenges.ts`: tipos `ChallengeView`/`ChallengeList` y `createChallenge(opponentAccountId, matchId, outcome, stake)` (mirrors `data/social.ts`/`data/bets.ts`)
- [ ] T008 [P] [US1] Crear `frontend/components/ChallengeModal.tsx`: selector de amigo (recibido por props desde la lista ya cargada en `social.tsx`), selector de partido (reutiliza `fetchMockCompetitions`/`fetchMockCompetitionMatches`), tres botones de resultado (local/empate/visitante), input de importe, llama a `createChallenge` (mirrors `CreateGroupModal.tsx`)
- [ ] T009 [US1] Añadir botón "Nuevo reto" + integración del modal en `frontend/app/(tabs)/social.tsx` (depende de T007, T008)

**Checkpoint**: Un reto puede crearse de extremo a extremo (API + UI) y aparece pendiente.

---

## Phase 4: User Story 2 - Acepto o rechazo un reto (Priority: P1)

**Goal**: El retado puede aceptar (debitando su saldo) o rechazar (devolviendo el de quien retó) un reto pendiente dirigido a él.

**Independent Test**: Ver spec.md User Story 2 — `quickstart.md` pasos 5-6.

### Implementation for User Story 2

- [ ] T011 [US2] Implementar `respond_challenge(account_id, challenge_id, accept: bool)` en `challenge_repository.py`: valida que el reto existe (`LookupError`), que `account_id == opponent_account_id` (`PermissionError`), que `status == "pending"` (`ConflictError`); si `accept`, debita a `account_id` (`ValueError` si insuficiente) y pasa a `"accepted"`; si no, devuelve el importe a `challenger_account_id` y pasa a `"declined"`
- [ ] T012 [US2] Añadir `GET /challenges/mine` a `api.py`: llama a la liquidación perezosa (placeholder hasta T015) y agrupa en `incoming/outgoing/active/resolved` según `contracts/challenges-api.md`
- [ ] T013 [US2] Añadir `POST /challenges/{id}/accept` y `POST /challenges/{id}/decline` a `api.py`, mapeando excepciones a 400/403/404/409
- [ ] T014 [P] [US2] Añadir `listMyChallenges()`, `acceptChallenge(id)`, `declineChallenge(id)` a `frontend/data/challenges.ts`
- [ ] T015 [P] [US2] Crear `frontend/components/ChallengeRow.tsx`: una tarjeta con nombre del oponente, partido, resultado, importe, estado, y botones contextuales (Aceptar/Rechazar si `incoming`, Cancelar si `outgoing`, nada si `active`/`resolved`) — mirrors `FriendRow.tsx`/las filas de solicitud ya existentes en `social.tsx`
- [ ] T016 [US2] Añadir la `SectionCard` "Retos" a `social.tsx` con los cuatro grupos usando `ChallengeRow` (depende de T014, T015)

**Checkpoint**: Un reto puede aceptarse o rechazarse de extremo a extremo.

---

## Phase 5: User Story 3 - Cancelo un reto pendiente que lancé (Priority: P2)

**Goal**: Quien retó puede cancelar mientras siga pendiente, recuperando su importe.

**Independent Test**: Ver spec.md User Story 3 — `quickstart.md` paso 7.

### Implementation for User Story 3

- [ ] T017 [US3] Implementar `cancel_challenge(account_id, challenge_id)` en `challenge_repository.py`: valida `account_id == challenger_account_id` (`PermissionError`) y `status == "pending"` (`ConflictError`), devuelve el importe y pasa a `"cancelled"`
- [ ] T018 [US3] Añadir `POST /challenges/{id}/cancel` a `api.py`
- [ ] T019 [P] [US3] Añadir `cancelChallenge(id)` a `frontend/data/challenges.ts`
- [ ] T020 [US3] Añadir botón "Cancelar" a `ChallengeRow.tsx` para retos `outgoing` (depende de T019)

**Checkpoint**: Un reto pendiente puede cancelarse de extremo a extremo.

---

## Phase 6: User Story 4 - Liquidación automática de un reto aceptado (Priority: P1)

**Goal**: Un reto aceptado se liquida solo cuando su partido vence, acreditando el bote completo al ganador, sin tocar el Elo.

**Independent Test**: Ver spec.md User Story 4 — `quickstart.md` paso 8.

### Implementation for User Story 4

- [ ] T021 [US4] Implementar `_settle_due_challenges(account_id)` en `challenge_repository.py`: para cada reto `accepted` de esa cuenta cuyo `created_at + bet_repository.SETTLEMENT_DELAY_MINUTES` ya venció, calcula `match_results.generate_match_result(match_id)`, determina ganador (`challenger` si `result == outcome`, si no `opponent`), acredita `2 * stake` al ganador, marca `status="settled"`, `settled_at`, `result`, `winner_account_id`
- [ ] T022 [US4] Llamar a `_settle_due_challenges(account_id)` al principio de `list_challenges_for_account` (usado por `GET /challenges/mine`, sustituye el placeholder de T012)
- [ ] T023 [US4] Confirmar en `quickstart.md` paso 9 (manual) que ninguna llamada de esta feature toca `profile.elo` — no requiere código nuevo, es una verificación de que `challenge_repository.py` nunca importa `elo.py` ni llama a `_apply_elo_for_settlement`

**Checkpoint**: Todas las user stories funcionan de extremo a extremo, incluida la liquidación automática.

---

## Phase 7: Polish

- [ ] T024 Ejecutar `quickstart.md` completo (pasos 1-10, incluida validación Expo) y corregir cualquier discrepancia encontrada
- [ ] T025 Revisar que `frontend/app/(tabs)/social.tsx` sigue cargando en paralelo (`Promise.all`) sin regresión de rendimiento al añadir `listMyChallenges()` a la carga inicial

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: ya completo.
- **Foundational (Phase 2)**: bloquea todas las user stories.
- **US1 (Phase 3)**: depende solo de Foundational. Entrega un MVP navegable (crear retos).
- **US2 (Phase 4)**: depende de Foundational; su ruta `GET /challenges/mine` es también la que usan US3 y US4, así que en la práctica conviene implementarla antes o junto a ellas aunque no exista una dependencia dura de datos.
- **US3 (Phase 5)**: depende de Foundational; comparte `ChallengeRow.tsx` con US2 (añade el botón Cancelar sobre el componente que crea US2).
- **US4 (Phase 6)**: depende de Foundational; su liquidación se dispara desde el mismo punto de lectura (`list_challenges_for_account`) que expone US2, así que en la práctica se implementa después de T012.

## Implementation Strategy

### MVP First (US1 + US2)

1. Completar Phase 2: Foundational (bloqueante).
2. Completar Phase 3 (US1) y Phase 4 (US2) — juntas entregan el ciclo mínimo: retar y responder.
3. **STOP and VALIDATE**: ejecutar `quickstart.md` pasos 1-6.

### Incremental Delivery

1. Foundational → base lista.
2. US1 → creación de retos validable de forma independiente.
3. US2 → aceptar/rechazar validable de forma independiente (necesario para que un reto llegue a algún sitio).
4. US3 → cancelación (mejora de calidad de vida, no bloquea el resto).
5. US4 → liquidación automática (cierra el ciclo).
6. Polish → validación completa + Expo.

## Notes

- Sin tareas de test: TDD diferido en todo el proyecto (constitución).
- Ninguna tarea toca `bet_repository.py`, `social_repository.py` ni `elo.py` — solo se importa de ellos (`SETTLEMENT_DELAY_MINUTES`, `is_friend`, `generate_match_result`), por diseño (ver `research.md`).
- Confirmar tras cada fase que `backend/data/bethany.sqlite3` sigue intacto (no se ha borrado ni recreado).
