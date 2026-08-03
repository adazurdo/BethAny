# API Contract: Verificación de correo electrónico

Todos los errores siguen el formato ya establecido en `api.py`: `{"error": "<mensaje>"}` con el status HTTP correspondiente (400 `ValueError`, 403 `PermissionError`, 404 `LookupError`, 409 `ConflictError`).

## `POST /auth/register` (cambia)

**Request** (igual forma que hoy):

```json
{ "identifier": "persona@example.com", "password": "••••", "displayName": "opcional" }
```

**Cambios de comportamiento**:

- `identifier` MUST ser un email sintácticamente válido (Decision 9) — si no lo es: 400 `ValueError` (`"identifier must be a valid email"`).
- Si `identifier` ya existe en una cuenta `status == "active"` (o `pending_verification` con código aún no expirado): 409 `ConflictError` (`"identifier already exists"`) — igual que hoy, salvo el nuevo caso de reclamo (ver FR-012).
- Si `identifier` existe únicamente en una cuenta `status == "pending_verification"` cuyo código ya expiró: la fila anterior se borra y el registro procede con normalidad (FR-012).
- La cuenta se crea con `status: "pending_verification"`, se genera un código de 6 dígitos y se envía por email (Decision 2).

**Response 201** (igual forma que hoy, `status` ahora puede ser `"pending_verification"`):

```json
{ "accountId": "acct_...", "identifier": "persona@example.com", "status": "pending_verification", "...": "...", "sessionToken": "..." }
```

## `POST /auth/verify-email` (nuevo)

Requiere sesión activa (`Authorization: Bearer <token>`, mismo `require_session` que el resto de rutas).

**Request**:

```json
{ "code": "123456" }
```

**Errores**:

- 400 `ValueError` — código incorrecto (`"invalid verification code"`) o expirado (`"verification code expired, request a new one"`).
- 409 `ConflictError` — cuenta ya verificada (`"account already verified"`) o intentos agotados (`"too many attempts, request a resend"`).

**Response 200**: cuenta serializada (mismo formato que `/auth/login`), ahora con `status: "active"`.

## `POST /auth/resend-verification` (nuevo)

Requiere sesión activa. Sin cuerpo de request.

**Errores**:

- 409 `ConflictError` — cuenta ya verificada (`"account already verified"`), o cooldown activo (`"resend cooldown active, try again in {n}s"`).

**Response 200**:

```json
{ "ok": true, "sentAt": "2026-08-03T10:00:00+00:00" }
```

## Rutas existentes que ganan el gate de verificación (`require_verified_session`)

Mismo formato de error que el resto de `PermissionError` (403), mensaje `"email verification required"`.

- `POST /bets/place`
- `POST /challenges` (crear reto)
- `POST /challenges/{challengeId}/accept`

**Sin cambios** (siguen usando `require_session`, disponibles para una cuenta `pending_verification`): `GET /bets/mine`, `GET /challenges/mine`, `POST /challenges/{id}/decline`, `POST /challenges/{id}/cancel`, `POST /challenges/{id}/resolve`, todas las rutas de `social.py` y `account.py`, `POST /auth/logout`.
