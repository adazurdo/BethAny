# Implementation Plan: Verificación de correo electrónico

**Branch**: `[009-verificacion-correo]` | **Date**: 2026-08-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-verificacion-correo/spec.md`

## Summary

Hoy `POST /auth/register` acepta cualquier `identifier` (email o username) y crea la cuenta ya activa, sin comprobar que el correo exista de verdad. Esta feature exige que el `identifier` sea un email, envía un código de un solo uso a esa dirección, y mantiene la cuenta en `status = "pending_verification"` (reutilizando el campo `status` que `UserAccount` ya tiene) hasta que el código se confirme — bloqueando solo las acciones con apuesta económica/competitiva (apostar, crear/aceptar retos) mientras tanto. Las cuentas creadas antes de esta feature quedan verificadas automáticamente sin ninguna migración explícita, porque ya tienen `status = "active"`. El envío real de correo usa `smtplib` (stdlib) detrás de un módulo propio, sin SDK de proveedor ni dependencia nueva, con fallback a log en local (sin credenciales reales, ver Constitution Check).

## Technical Context

**Language/Version**: Python 3.11+ con FastAPI/uvicorn (backend ya migrado de `http.server`, ver commit `86fea9c15`) para el backend; React + Expo (stack ya existente) para el frontend.

**Primary Dependencies**: Ninguna nueva en backend — `smtplib`/`email.message`/`secrets`/`hashlib` son stdlib, ya usados en `account_repository.py`. Ninguna nueva en frontend — reutiliza `data/auth.ts` (`requestJson`) y `components/AuthContext.tsx` ya existentes.

**Storage**: SQLite local (`backend/data/bethany.sqlite3`). Tres columnas nuevas sobre la tabla `accounts` ya existente (`verification_code_hash`, `verification_code_sent_at`, `verification_attempts_remaining`), vía el patrón `_ensure_column` ya usado en `database.py`. Ninguna tabla nueva.

**Testing**: TDD sigue diferido. Validación manual/funcional vía `quickstart.md`.

> **Actualizado 2026-08-03 (post-implementación)**: el flujo de prueba real del usuario ya no es local — prueba directamente contra el frontend desplegado en Vercel apuntando al backend desplegado en Railway (ver `ec89f4efc`/`a48edc688`). Esto significa que **el código de esta feature no es observable por el usuario hasta que se haga commit + push y Railway/Vercel completen su auto-deploy** — un cambio de backend corriendo solo en local (o sin desplegar) es indistinguible de "la feature no existe" para quien prueba solo en las URLs desplegadas. `quickstart.md` ahora distingue explícitamente la validación local (aislada, para desarrollo) de la validación post-deploy (la que de verdad ve el usuario).

**Target Platform**: Entorno desplegado (Vercel + Railway) como plataforma de validación real del usuario; entorno de desarrollo local (con fallback de email a log/consola) para iteración rápida antes de desplegar; validación móvil vía Expo cuando aplique (registro/login/verificación son flujos críticos también en dispositivo).

**Project Type**: Aplicación web con cliente móvil (misma forma que el resto de specs de este repo).

**Performance Goals**: El envío del código ocurre de forma síncrona dentro de la misma petición de registro/reenvío (sin cola ni proceso en segundo plano), aceptable para el volumen de cuentas de esta fase mock.

**Constraints**: Sin secretos reales en el repositorio ni en local (la credencial SMTP real solo existe en las variables de entorno del entorno desplegado, ver Constitution Check). Sin scheduler ni expiración automática activa por tiempo — la expiración del código y el cooldown de reenvío se comprueban de forma perezosa en el momento de la petición, mismo patrón que `_settle_due_bets`/`_grant_periodic_income`.

**Scale/Scope**: Mismo entorno local de un puñado de cuentas que el resto del prototipo.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Simplicity: Ninguna entidad ni tabla nueva — se extiende `UserAccount`/`accounts` ya existente y se reutiliza el campo `status` en vez de un booleano paralelo (ver `research.md` Decision 1). Cero dependencias nuevas (stdlib `smtplib`, ver Decision 2).
- [x] Local-first: El desarrollo local sigue sin necesitar credenciales reales — sin `SMTP_HOST` configurado, el código se registra en el log del backend (Decision 2). El proveedor real se configura como variable de entorno en Railway (no en el repo); si no se configura, el entorno desplegado también cae al fallback de log — pero ahí el log es el de Railway (`railway logs` o el panel del dashboard), no la consola local. Ver nota de "Testing" arriba: el flujo de prueba real del usuario es el entorno desplegado, no local.
- [x] Stack compliance: Python (backend) y React/Expo (frontend); registro/login/verificación son flujos móviles críticos y quedan cubiertos por validación en Expo (`quickstart.md` paso 12).
- [x] TDD status: Diferido, consistente con el resto del proyecto.
- [x] Security scope: **Excepción documentada** — el proveedor de correo real en el entorno desplegado requiere una credencial real (API key/SMTP), lo que excede el límite por defecto de "sin secretos reales en fase mock". Aprobada explícitamente por el usuario/mantenedor al escribir la spec (2026-08-03), en la misma línea que la excepción ya otorgada para el deploy a Railway/Vercel. Ver Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/009-verificacion-correo/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── auth-verification-api.md
```

(`tasks.md` se genera con `/speckit.tasks`, no en esta fase.)

### Source Code (repository root)

```text
backend/
├── bethany_mock/
│   ├── models.py                  # UserAccount: +verification_code_hash, +verification_code_sent_at, +verification_attempts_remaining; status admite "pending_verification"
│   ├── database.py                # +3 columnas en `accounts` vía _ensure_column (sin tabla nueva)
│   ├── account_repository.py      # register_account valida email + genera código + reclamo de identifier (FR-012); NEW verify_email_code / resend_verification_code
│   ├── email_sender.py            # NEW: smtplib + fallback a log si SMTP_HOST no está definido
│   ├── session.py                 # NEW: require_verified_session (envuelve require_session, 403 si pending_verification)
│   └── routers/
│       ├── auth.py                # NEW routes: POST /auth/verify-email, POST /auth/resend-verification
│       ├── bets.py                # place_bet_route pasa a Depends(require_verified_session)
│       └── challenges.py          # create_challenge y accept_challenge pasan a Depends(require_verified_session)

frontend/
├── data/
│   └── auth.ts                    # +verifyEmail(code) / +resendVerification(), status en la respuesta de register/login
├── app/
│   └── (auth)/
│       ├── register.tsx           # placeholder "Email" (ya no "Email o usuario"); tras 201 navega a verify-email
│       ├── login.tsx              # tras login con status pending_verification, navega a verify-email
│       └── verify-email.tsx       # NEW: input de código + botón reenviar con cooldown (reutiliza el patrón de BethsCountdown.tsx)
└── components/
    └── AuthContext.tsx            # expone el status de la cuenta activa; redirige a verify-email cuando esté pending_verification
```

**Structure Decision**: Se extiende el paquete `bethany_mock` y el stack de navegación `(auth)` ya existentes — ningún servicio, tabla, ni pestaña de navegación nueva. El único componente de UI genuinamente nuevo es la pantalla `verify-email.tsx`; el resto son cambios acotados a routers/repositorios/pantallas ya existentes.

## Phase 0: Research Findings

See [research.md](./research.md) for full rationale. Summary of decisions:

- Reutilizar `status` (`"pending_verification"`/`"active"`) en vez de un booleano nuevo (Decision 1).
- Envío por `smtplib` detrás de un módulo propio, sin SDK de proveedor; fallback a log en local (Decision 2).
- Código de verificación hasheado igual que la contraseña, nunca en claro (Decision 3).
- Código de 6 dígitos, de un solo uso, generado con `secrets` (Decision 4).
- El grandfathering de cuentas antiguas (FR-009) no requiere migración explícita — se cumple por el propio esquema (Decision 5).
- Reclamo de `identifier` no verificado y expirado (FR-012) como borrado + reinserción, apoyado en las FK `ON DELETE CASCADE` ya existentes (Decision 6).
- Gate de verificación como un `Depends` nuevo (`require_verified_session`) aplicado solo a 3 rutas, no un middleware global (Decision 7).
- Errores de verificación reutilizan el contrato de 4 tipos ya existente (`ValueError`/`ConflictError`), sin nuevo status HTTP (Decision 8).
- Validación de email con regex simple, sin librería nueva (Decision 9).
- Frontend: pantalla nueva dentro del stack `(auth)` ya existente, sin pestaña de navegación nueva (Decision 10).

## Phase 1: Design Outputs

### Data Model

See [data-model.md](./data-model.md) for the extended `UserAccount` fields, `status` transitions, invariants, and the `accounts` table migration.

### Interface Contract

See [contracts/auth-verification-api.md](./contracts/auth-verification-api.md) for `POST /auth/register` (changed), `POST /auth/verify-email` (new), `POST /auth/resend-verification` (new), and the three existing routes that gain the verification gate.

### Validation Guide

See [quickstart.md](./quickstart.md) for the invalid-email, pending-blocks-bets, social-actions-allowed, wrong-code/attempts, resend/cooldown, verify-unlocks-everything, grandfathered-accounts, and identifier-reclaim validation flow, plus Expo validation.

## Re-evaluate Constitution Check After Design

- [x] Simplicity remains intact: zero new tables/dependencies; `status` reused end-to-end from spec through data model to routing gate.
- [x] Local-first remains intact: local dev never needs the real SMTP credential (log fallback); only the deployed environment does.
- [x] Stack compliance remains intact: Python backend, React/Expo frontend, mobile validation covered in quickstart.
- [x] TDD remains deferred.
- [x] Security scope: the one approved exception (real SMTP credential in the deployed environment) is scoped exactly to `email_sender.py`'s configuration, nowhere else; no other security relaxation introduced.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Credencial real de proveedor SMTP en el entorno desplegado (excede "sin secretos reales en fase mock") | El producto exige probar que el usuario controla de verdad esa bandeja de entrada; sin un envío real no hay verificación genuina. | Código simulado/solo-log (sin envío real) fue considerado y rechazado explícitamente por el usuario/mantenedor al definir el alcance de la spec — dejaría de cumplir el propósito mismo de la feature. |
