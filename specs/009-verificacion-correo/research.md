# Research: Verificación de correo electrónico

## Decision 1 — Reutilizar `UserAccount.status` en vez de un booleano `email_verified` nuevo

`status` ya existe en `accounts` (TEXT NOT NULL) y hoy solo toma el valor `"active"`; `list_all_accounts()` ya filtra `WHERE status = 'active'` para el ranking. Añadir el valor `"pending_verification"` reutiliza ese mismo mecanismo (una cuenta pendiente automáticamente queda fuera del ranking, sin código adicional) en vez de sumar un segundo concepto de estado (`email_verified: bool`) que podría divergir del primero. Ninguna otra parte del código asigna hoy un valor distinto de `"active"` a `status`, así que no hay colisión con un estado existente (confirmado por grep sobre `account_repository.py`/`models.py`/`routers/account.py`).

## Decision 2 — Entrega de correo vía `smtplib` (stdlib) detrás de un módulo propio, no un SDK de proveedor

Se descartó añadir una dependencia nueva (SDK de SendGrid/Mailgun/Resend/etc.) porque todos esos proveedores también exponen un relay SMTP estándar, y `smtplib` ya es parte de la stdlib de Python — cero dependencias nuevas, consistente con el resto del backend (`http.server`→FastAPI es la única dependencia de framework que ya se aceptó, ver `ec89f4efc`). Un módulo nuevo `email_sender.py` encapsula el envío detrás de una función `send_verification_email(to_address, code)`, configurada con `SMTP_HOST`/`SMTP_PORT`/`SMTP_USERNAME`/`SMTP_PASSWORD`/`SMTP_FROM_ADDRESS` (mismo patrón `env.load_dotenv()` ya usado por `football_data_client.py`/`pandascore_client.py` para sus API keys). Si `SMTP_HOST` no está definido (caso por defecto en local, ver `.env.example`), la función registra el código por log/consola en vez de enviarlo — satisface FR-011 sin necesitar un proveedor sandbox de terceros (Mailtrap, etc.) ni una dependencia nueva.

## Decision 3 — El código se guarda con hash, nunca en claro

`account_repository.py` ya tiene un helper de hashing de contraseña (`_hash_password`, basado en `hashlib`/`hmac`). El código de verificación reutiliza el mismo mecanismo (hash + salt) antes de persistirlo en `verification_code_hash`, para que un volcado de la base de datos no exponga códigos activos — mismo estándar que ya se aplica a la contraseña, sin introducir una librería de criptografía nueva.

## Decision 4 — Código de 6 dígitos numéricos, de un solo uso

Formato simple de escribir en móvil (consistente con la mayoría de flujos de verificación por correo), generado con `secrets.choice`/`secrets.randbelow` (ya se usa `secrets` en este archivo para tokens de sesión y salts). Un solo código activo a la vez: al generarse uno nuevo (registro o reenvío), sustituye al anterior en la misma fila de `accounts`.

## Decision 5 — El "grandfathering" de cuentas existentes (FR-009) no necesita código de migración

Como todas las cuentas creadas antes de esta feature ya tienen `status = "active"` (único valor usado hasta ahora) y esta feature no toca ese valor para filas existentes, FR-009 se cumple automáticamente por el propio esquema: nunca se re-escribe `status` de una cuenta ya activa. Las tres columnas nuevas (`verification_code_hash`, `verification_code_sent_at`, `verification_attempts_remaining`) se añaden vía `_ensure_column` (mismo patrón ya usado para `placed_bets`/`competition_sources` en `database.py`) y quedan sencillamente sin usar en cuentas ya activas.

## Decision 6 — Reclamo de `identifier` no verificado (FR-012) como borrado + reinserción en `register_account`

Alternativa considerada: marcar la fila vieja como "descartada" con un nuevo valor de `status` y dejarla en la tabla. Se descartó por añadir un tercer estado y complejidad de limpieza a largo plazo sin beneficio (nadie necesita conservar el histórico de una cuenta que nunca llegó a existir de verdad, porque nunca se verificó). En vez de eso, cuando `register_account` encuentra una fila existente con ese `identifier` en `status = "pending_verification"` cuyo código ya expiró (`verification_code_sent_at` + 24h < ahora), borra esa fila antes de insertar la nueva. Las FK `ON DELETE CASCADE` ya declaradas sobre `accounts.id` (en `account_state`, `friend_requests`, `placed_bets`, etc.) limpian cualquier resto sin código adicional.

## Decision 7 — Gate de verificación como un `Depends` nuevo, no un middleware global

`session.py` ya expone `require_session` como dependencia FastAPI reutilizada por todos los routers. Se añade `require_verified_session` (envuelve `require_session`, carga la cuenta y lanza `PermissionError` si `status == "pending_verification"`, ya mapeado a 403 por `api.py`) y se aplica **solo** a `POST /bets/place`, `POST /challenges` (crear) y `POST /challenges/{id}/accept` — exactamente las tres acciones que FR-004 marca como bloqueadas. `GET /challenges/mine`, `decline`, `cancel`, `resolve` y todas las rutas de `social.py`/`account.py` conservan `require_session` sin cambios, consistente con la Assumption de la spec de no bloquear funciones sociales/de perfil. Se prefiere esto a un middleware global porque solo tres endpoints concretos necesitan el gate, y el resto de la app (login, reenvío, perfil, amistad) debe seguir funcionando para una cuenta pendiente (FR-010).

## Decision 8 — Errores de verificación reutilizan el contrato de 4 tipos ya existente

En vez de introducir un nuevo código HTTP (p. ej. 429 para "demasiadas peticiones"), cooldown-activo y intentos-agotados se modelan como `ConflictError` (409, "ya hay un estado en conflicto con la operación pedida" — mismo tipo ya usado por retos/partidos cerrados), y código incorrecto/expirado como `ValueError` (400) — mismo patrón de excepción→status ya centralizado en `api.py` (`value_error_handler`, `conflict_error_handler`, etc.), sin tocar ese mapeo.

## Decision 9 — Validación de formato de email con una expresión regular simple, no una librería nueva

Se descartó añadir `email-validator` (u otra librería de validación de RFC 5322 completa) porque la prueba real de que el email es válido y pertenece al usuario es el propio código de verificación (FR-002), no una validación sintáctica exhaustiva. Una expresión regular pragmática (`algo@algo.algo`, sin espacios) en `register_account` basta para FR-001 y evita una dependencia nueva.

## Decision 10 — Frontend: pantalla nueva `verify-email.tsx`, sin pestaña de navegación nueva

Se añade una pantalla dentro del stack de `(auth)` ya existente (junto a `login.tsx`/`register.tsx`), no una pestaña de la navegación principal — se llega a ella automáticamente tras registrarse (o al iniciar sesión con una cuenta pendiente), igual que hoy se navega de `register.tsx` a la app principal. El contador de cooldown de reenvío reutiliza el patrón de cuenta atrás ya usado por `BethsCountdown.tsx`, sin un componente de temporizador nuevo. Los placeholders "Email o usuario" de `register.tsx`/`login.tsx` pasan a "Email" (FR-001 elimina la opción de username libre en registro; login de cuentas antiguas con username sigue funcionando sin cambios en el placeholder de login, ver Assumptions de la spec).
