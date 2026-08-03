---

description: "Task list for 009-verificacion-correo"
---

# Tasks: Verificación de correo electrónico

**Input**: Design documents from `/specs/009-verificacion-correo/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/auth-verification-api.md

**Tests**: TDD diferido en todo el proyecto (constitución) — sin tareas de test, validación vía `quickstart.md`.

**Organization**: Tareas agrupadas por user story para que cada una sea implementable y comprobable de forma independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias)
- **[Story]**: A qué user story pertenece (US1-US3)

## Phase 1: Setup

- [X] T001 Crear la carpeta de spec `specs/009-verificacion-correo/` con spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md (ya completado antes de esta lista)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Esquema, modelo y utilidades compartidas que las tres user stories necesitan.

**⚠️ CRITICAL**: Ninguna user story puede implementarse hasta terminar esta fase.

- [X] T002 Añadir `verification_code_hash TEXT`, `verification_code_sent_at TEXT`, `verification_attempts_remaining INTEGER NOT NULL DEFAULT 5` a la tabla `accounts` vía `_ensure_column` en `backend/bethany_mock/database.py` (ver esquema en `data-model.md`)
- [X] T003 Extender el dataclass `UserAccount` en `backend/bethany_mock/models.py` con los 3 campos nuevos; confirmar que `to_dict()` NO los expone (mismo criterio que `password_hash`/`salt`)
- [X] T004 [P] Crear `backend/bethany_mock/email_sender.py`: `send_verification_email(to_address, code)` vía `smtplib`, configurado con `SMTP_HOST`/`SMTP_PORT`/`SMTP_USERNAME`/`SMTP_PASSWORD`/`SMTP_FROM_ADDRESS` (leídos tras `env.load_dotenv()`); si `SMTP_HOST` no está definido, registra el código por log en vez de enviarlo (Decision 2)
- [X] T005 [P] Añadir `SMTP_HOST`/`SMTP_PORT`/`SMTP_USERNAME`/`SMTP_PASSWORD`/`SMTP_FROM_ADDRESS` (vacíos) a `backend/.env.example`, con un comentario explicando el fallback a log en local
- [X] T006 Añadir a `backend/bethany_mock/account_repository.py`: `_generate_verification_code()` (6 dígitos, `secrets`), `_hash_verification_code(code)`/`_verify_verification_code(code, hash)` (reutiliza el mismo mecanismo que `_hash_password`/`_verify_password`)
- [X] T007 Añadir `require_verified_session` a `backend/bethany_mock/session.py`: envuelve `require_session`, carga la cuenta (`account_repository.get_account_by_id`) y lanza `PermissionError("email verification required")` si `status == "pending_verification"`

**Checkpoint**: Esquema, hashing de código y envío de correo listos — las user stories pueden empezar.

---

## Phase 3: User Story 1 - Verificar el correo para poder usar la app (Priority: P1) 🎯 MVP

**Goal**: Registrarse exige un email válido, deja la cuenta `pending_verification`, envía un código, y confirmar el código correcto desbloquea apostar/retar.

**Independent Test**: Ver spec.md User Story 1 — `quickstart.md` pasos 1-4, 8, 10.

### Implementation for User Story 1

- [X] T008 [US1] Modificar `register_account` en `account_repository.py`: validar `identifier` como email vía regex simple (400 `ValueError` si no lo es, FR-001); si ya existe una cuenta con ese `identifier` en `status == "pending_verification"` cuyo `verification_code_sent_at` + 24h ya pasó, borrarla antes de continuar (FR-012, reclamo de identifier); crear la cuenta con `status="pending_verification"`, generar+hashear el código (T006), fijar `verification_code_sent_at=ahora`, `verification_attempts_remaining=5`, y llamar a `email_sender.send_verification_email` (T004)
- [X] T009 [US1] Implementar `verify_email_code(account_id, code)` en `account_repository.py`: 404 si no existe la cuenta, 409 `ConflictError` si ya `status == "active"`, 400 `ValueError` si el código no coincide (decrementa `verification_attempts_remaining`) o si expiró (`verification_code_sent_at` + 24h), 409 `ConflictError` si `verification_attempts_remaining == 0`; si coincide y no expiró, pasa a `status="active"` y limpia las 3 columnas de verificación
- [X] T010 [US1] Añadir `POST /auth/verify-email` a `backend/bethany_mock/routers/auth.py` (sesión requerida vía `require_session`, payload `{code}`, mapea excepciones a 400/409 igual que el resto de rutas)
- [X] T011 [US1] Cambiar `Depends(require_session)` por `Depends(require_verified_session)` en `place_bet_route` (`backend/bethany_mock/routers/bets.py`), `create_challenge` y `accept_challenge` (`backend/bethany_mock/routers/challenges.py`)
- [X] T012 [P] [US1] Añadir a `frontend/data/auth.ts`: campo `status` en los tipos de respuesta de register/login, y `verifyEmail(code)` (mismo patrón `requestJson` que el resto del archivo)
- [X] T013 [P] [US1] Crear `frontend/app/(auth)/verify-email.tsx`: input de código de 6 dígitos, llama a `verifyEmail`, navega a la app principal al confirmar (sin botón de reenvío todavía, lo añade US2)
- [X] T014 [US1] Actualizar `frontend/components/AuthContext.tsx` para guardar el `status` de la cuenta activa y redirigir a `verify-email.tsx` cuando sea `"pending_verification"` (tanto tras registro como tras login)
- [X] T015 [P] [US1] Cambiar el placeholder `"Email o usuario"` a `"Email"` en `frontend/app/(auth)/register.tsx` (login.tsx conserva su placeholder, ver Assumptions de la spec — cuentas antiguas con username siguen usándolo)

**Checkpoint**: Registrarse deja la cuenta pendiente, bloquea apostar/retar, y el código correcto desbloquea todo — de extremo a extremo (API + UI).

---

## Phase 4: User Story 2 - Reenviar el código si no llega o expira (Priority: P2)

**Goal**: Reenviar genera un código nuevo (invalidando el anterior) y restablece los intentos, sujeto a un cooldown de 60s.

**Independent Test**: Ver spec.md User Story 2 — `quickstart.md` pasos 5-7.

### Implementation for User Story 2

- [X] T016 [US2] Implementar `resend_verification_code(account_id)` en `account_repository.py`: 409 `ConflictError` si ya `status == "active"`, 409 `ConflictError` si no han pasado 60s desde `verification_code_sent_at` (cooldown); si no, genera+hashea un código nuevo, restablece `verification_attempts_remaining=5`, actualiza `verification_code_sent_at`, y llama a `email_sender.send_verification_email`
- [X] T017 [US2] Añadir `POST /auth/resend-verification` a `routers/auth.py` (sesión requerida, sin payload, mapea `ConflictError` a 409)
- [X] T018 [P] [US2] Añadir `resendVerification()` a `frontend/data/auth.ts`
- [X] T019 [US2] Añadir a `verify-email.tsx` (T013) un botón "Reenviar código" con cuenta atrás de 60s (reutiliza el patrón de temporizador de `frontend/components/BethsCountdown.tsx`), deshabilitado mientras el cooldown esté activo

**Checkpoint**: Reenviar el código funciona de extremo a extremo, incluido el cooldown visible en la UI.

---

## Phase 5: User Story 3 - Ver el estado de verificación del correo (Priority: P3)

**Goal**: El perfil muestra si el correo está verificado o pendiente, con acceso directo a completar la verificación.

**Independent Test**: Ver spec.md User Story 3 — `quickstart.md` (validación visual manual, no cubierta por un paso de API dedicado).

### Implementation for User Story 3

- [X] T020 [US3] Añadir a `frontend/components/ProfileSummary.tsx` un indicador junto al `identifierLabel` existente: "Correo pendiente de verificar" (con acceso directo a `verify-email.tsx`) cuando el `status` de la cuenta sea `"pending_verification"`, o "Correo verificado" cuando sea `"active"`
- [X] T021 [US3] Confirmar que `frontend/app/(tabs)/profile.tsx` pasa el `status` de la cuenta activa (ya disponible vía `AuthContext`, T014) a `ProfileSummary`

**Checkpoint**: Todas las user stories funcionan de extremo a extremo.

---

## Phase 6: Polish

- [X] T022 Ejecutar `quickstart.md` completo (pasos 1-12) y corregir cualquier discrepancia encontrada. Pasos 1-9 y 11 validados vía HTTP contra una instancia aislada (puerto/DB descartables); `tsc --noEmit` limpio en frontend. **Paso 12 (Expo) no ejecutado**: este entorno no tiene navegador/dispositivo disponible para validación visual — pendiente de que el usuario lo confirme manualmente.
- [X] T023 Confirmar manualmente que una cuenta creada antes de esta feature (`status` ya `"active"` en una fila existente de `backend/data/bethany.sqlite3`) no pide verificación en ningún flujo (quickstart paso 10)
- [X] T024 Revisar que ninguna ruta de `social.py`/`account.py` ni `GET /challenges/mine`/`decline`/`cancel`/`resolve` cambió su dependencia de sesión (deben seguir en `require_session`, no `require_verified_session`)

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: ya completo.
- **Foundational (Phase 2)**: bloquea todas las user stories.
- **US1 (Phase 3)**: depende solo de Foundational. Entrega el MVP: registro pendiente + bloqueo + verificación.
- **US2 (Phase 4)**: depende de Foundational y reutiliza `verify-email.tsx` creado en US1 (T013) para añadirle el botón de reenvío (T019) — en la práctica va después de US1, aunque su lógica de backend (T016-T017) no depende de ningún endpoint de US1.
- **US3 (Phase 5)**: depende de Foundational y del `status` expuesto por `AuthContext` en US1 (T014); es la más aislada de las tres (solo frontend).

## Implementation Strategy

### MVP First (US1)

1. Completar Phase 2: Foundational (bloqueante).
2. Completar Phase 3 (US1) — entrega el ciclo mínimo: registrarse, quedar pendiente, bloquear apostar/retar, verificar y desbloquear.
3. **STOP and VALIDATE**: ejecutar `quickstart.md` pasos 1-4, 8, 10.

### Incremental Delivery

1. Foundational → base lista.
2. US1 → verificación bloqueante validable de forma independiente (MVP).
3. US2 → reenvío (evita bloqueos permanentes por código perdido/expirado).
4. US3 → indicador de estado en perfil (mejora de claridad, no bloquea el resto).
5. Polish → validación completa + Expo + confirmación de que cuentas antiguas y rutas sociales no se ven afectadas.

## Notes

- Sin tareas de test: TDD diferido en todo el proyecto (constitución).
- Ninguna tarea toca `social_repository.py`, `bet_repository.py` ni `challenge_repository.py` más allá del cambio puntual de dependencia en T011 (`routers/bets.py`/`routers/challenges.py`) — el resto de esos módulos queda intacto, por diseño (ver `research.md` Decision 7).
- La credencial real de SMTP (T005) solo se rellena en el entorno desplegado (Railway); en local `backend/.env` puede dejarse sin esas variables (fallback a log, T004).
- Confirmar tras cada fase que `backend/data/bethany.sqlite3` sigue intacto (no se ha borrado ni recreado).

## Desviaciones encontradas durante la implementación (no previstas en el plan)

- **`PRAGMA foreign_keys` nunca estaba activado** (`database.py get_connection()`): las `ON DELETE CASCADE` ya declaradas en el esquema eran decorativas. T008 (reclamo de identifier, FR-012) es la primera vez que el código borra una fila de `accounts`, así que se activó el pragma para que la cascada limpie `account_state`/etc. de verdad. Verificado con un smoke test directo (fila de `account_state` desaparece tras `_delete_account`). Sin riesgo para el resto del código: ningún otro flujo borraba filas de `accounts` antes de esta feature.
- **`ConflictError` se movió de `social_repository.py` a `account_repository.py`**: `verify_email_code`/`resend_verification_code` necesitaban lanzarlo, pero `social_repository` importa de `account_repository` (no al revés), así que importarlo desde `social_repository` habría creado un ciclo. Se redefinió en `account_repository.py` y `social_repository.py` ahora la re-exporta sin cambios — `bet_repository.py`/`challenge_repository.py`/`api.py` siguen importándola igual, sin tocar esos archivos.
- **`email_sender.py` usa `print`, no `logging`**: un `logging.getLogger(__name__).info(...)` no aparecía en ningún sitio bajo la configuración de logging de uvicorn (solo configura sus propios loggers, no el root) — confirmado al probar el fallback local. Se cambió a `print`, igual que ya hace `api.py` en `serve()`.
- **`verify-email.tsx` gana un enlace "Seguir explorando sin verificar"**: no estaba en el plan original, pero sin él la pantalla solo tenía "Cerrar sesión" como salida, lo que en la práctica atrapaba a una cuenta pendiente y contradecía la propia Assumption de la spec (funciones sociales/de perfil deben quedar abiertas). El enlace navega a `/(tabs)` sin verificar; la insignia de perfil (US3) sigue ofreciendo volver a verificar en cualquier momento.
- **El usuario prueba contra Vercel + Railway, no local** (descubierto 2026-08-03 al reportar que el registro no pedía verificación): toda la implementación de esta sesión vivía sin commitear/desplegar, así que el backend en Railway seguía corriendo el código anterior — el comportamiento era "correcto" (nada nuevo desplegado), no un bug. `plan.md` y `quickstart.md` se actualizaron para reflejar que la validación que de verdad importa es la posterior al deploy (`quickstart.md` paso 13), y que sin `SMTP_HOST` configurado en Railway el código de verificación cae en los logs de Railway, no en ninguna consola local.
