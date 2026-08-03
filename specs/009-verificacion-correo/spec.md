# Feature Specification: Verificación De Correo Electrónico

**Feature Branch**: `[009-verificacion-correo]`

**Created**: 2026-08-03

**Status**: Draft

**Input**: User description: "quiero añadir una spec que incluya la verificacion de correo electronico"

## Constitution Alignment *(mandatory)*

- **Simplicity Statement**: No se introduce una entidad nueva independiente: se reutiliza el campo `status` que `UserAccount` ya tiene (`account_repository.py`/`models.py`, hoy usado para filtrar cuentas activas en el ranking) añadiendo el valor `pending_verification`, en vez de sumar un booleano `email_verified` paralelo; solo se añaden los campos de código/expiración/intentos necesarios para la verificación en sí. Se reutiliza también el campo `identifier` ya presente en registro/login como la dirección de correo (en vez de crear un campo `email` separado).
- **Local-First Confirmation**: El desarrollo y las pruebas locales (`npm run dev`) deben seguir siendo posibles sin depender de credenciales reales de un proveedor de correo: el proveedor de email MUST poder configurarse en modo sandbox/consola en local (ver Assumptions), reservando las credenciales reales para el entorno desplegado (Railway, ver `[[project-bethany-overview]]`/README). Staging/producción usan el proveedor real.
- **Stack Confirmation**: Cambios en Python (`backend/bethany_mock/account_repository.py`, `routers/auth.py`, nuevo módulo de envío de correo) y React/Expo (`app/(auth)/register.tsx`, `login.tsx`, nueva pantalla de verificación). Se valida el flujo completo en Expo (dispositivo móvil) porque registro/login son flujos móviles críticos, y también en `npm run web`.
- **TDD Mode**: Deferred, consistente con el resto del proyecto en esta fase.
- **Security Scope (Mock Stage) / Complexity Exception**: Esta feature requiere una credencial real de un proveedor de envío de correo (API key/SMTP) en el entorno desplegado, lo cual excede el límite por defecto de "sin secretos reales en fase mock". Excepción documentada y aprobada explícitamente por el usuario/mantenedor en esta sesión (2026-08-03), en la misma línea que la excepción ya otorgada para el deploy a Railway/Vercel (constitución v3.0.0, Principio II). La credencial real MUST vivir solo en las variables de entorno del entorno desplegado (Railway), nunca en el repositorio, y el entorno local sigue sin necesitarla (modo sandbox/consola). Otros aspectos de seguridad (rate limiting robusto, protección anti-enumeración de cuentas) quedan diferidos como de costumbre en esta fase.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Verificar el correo para poder usar la app (Priority: P1)

Como usuario que acaba de registrarse, quiero recibir un código de verificación en mi correo electrónico e introducirlo en la app, para confirmar que la dirección es mía y desbloquear el uso completo de la app (apostar, retar amigos, etc.).

**Why this priority**: Es el flujo central de la feature; sin él no existe verificación de correo, y por decisión del producto el acceso a las funciones principales queda bloqueado hasta completarlo.

**Independent Test**: Puede probarse registrando una cuenta nueva con un correo real de prueba, verificando que la cuenta queda en estado "pendiente de verificación", que llega un código a ese correo, y que introducirlo correctamente desbloquea el acceso a apostar/retar.

**Acceptance Scenarios**:

1. **Given** un usuario nuevo completa el registro con un correo válido, **When** el registro se procesa, **Then** la cuenta se crea en estado "pendiente de verificación" y se envía un código de un solo uso a ese correo.
2. **Given** una cuenta en estado "pendiente de verificación", **When** el usuario introduce el código correcto antes de que expire, **Then** la cuenta pasa a estado "verificada" y el usuario obtiene acceso completo (apostar, retar, etc.).
3. **Given** una cuenta en estado "pendiente de verificación", **When** el usuario intenta apostar, crear un reto o aceptar un reto, **Then** el sistema rechaza la acción y explica que debe verificar su correo primero.
4. **Given** una cuenta en estado "pendiente de verificación", **When** el usuario introduce un código incorrecto, **Then** el sistema rechaza el código, informa del error y descuenta un intento del límite de intentos permitido.
5. **Given** una cuenta en estado "pendiente de verificación", **When** el usuario envía una solicitud de amistad, se une a un grupo o edita su perfil, **Then** el sistema permite la acción con normalidad (solo las acciones con apuesta económica/competitiva quedan bloqueadas, ver FR-004).

---

### User Story 2 - Reenviar el código si no llega o expira (Priority: P2)

Como usuario que no recibió el código (o cuyo código expiró), quiero poder pedir que se reenvíe, para poder completar la verificación sin tener que registrarme de nuevo.

**Why this priority**: Sin esta vía de recuperación, cualquier fallo de entrega de correo (spam, retraso, expiración) deja al usuario bloqueado permanentemente fuera de la app.

**Independent Test**: Puede probarse dejando expirar un código (o agotando los intentos permitidos) y verificando que el botón/acción de reenviar genera un nuevo código válido, invalidando el anterior.

**Acceptance Scenarios**:

1. **Given** una cuenta en estado "pendiente de verificación" cuyo código expiró, **When** el usuario solicita un reenvío, **Then** se genera y envía un nuevo código, y el código anterior deja de ser válido.
2. **Given** una cuenta que acaba de solicitar un reenvío, **When** el usuario intenta solicitar otro reenvío inmediatamente, **Then** el sistema lo rechaza hasta que pase un periodo de espera (cooldown), para evitar abuso/spam de correo.
3. **Given** una cuenta que agotó el número máximo de intentos de código incorrecto, **When** el usuario solicita un reenvío, **Then** se genera un nuevo código y se restablece el contador de intentos.

---

### User Story 3 - Ver el estado de verificación del correo (Priority: P3)

Como usuario, quiero ver claramente en mi perfil si mi correo está verificado o pendiente, para entender por qué ciertas acciones podrían estar bloqueadas y saber qué hacer al respecto.

**Why this priority**: Es una mejora de claridad/soporte sobre el flujo ya bloqueante de las historias 1 y 2; no añade capacidad nueva, pero reduce confusión y tickets de soporte.

**Independent Test**: Puede probarse abriendo el perfil de una cuenta pendiente y verificando que se muestra el estado junto con un acceso directo para completar la verificación.

**Acceptance Scenarios**:

1. **Given** una cuenta pendiente de verificación, **When** el usuario abre su perfil, **Then** ve un indicador de "correo pendiente de verificar" con acceso directo a la pantalla de verificación.
2. **Given** una cuenta ya verificada, **When** el usuario abre su perfil, **Then** ve un indicador de "correo verificado" (o no ve ningún aviso pendiente).

---

### Edge Cases

- Cuentas creadas **antes** de esta feature: se consideran verificadas automáticamente (grandfathered) para no bloquear retroactivamente a usuarios ya activos; ver Assumptions.
- ¿Qué ocurre si el usuario cierra sesión antes de verificar? Al volver a iniciar sesión, la cuenta sigue en estado "pendiente de verificación" y el login MUST seguir funcionando (para poder llegar a la pantalla de verificación), aunque las acciones bloqueadas sigan bloqueadas.
- ¿Qué ocurre si el proveedor de correo falla al enviar (error de red, cuota agotada)? El registro no debe fallar silenciosamente: el sistema informa del error y permite reintentar el envío (equivalente a un reenvío).
- ¿Qué ocurre si dos dispositivos de la misma cuenta piden verificación en paralelo? Solo el código más reciente es válido (ver User Story 2, escenario 1).
- Cambiar el correo de una cuenta ya registrada queda **fuera de alcance** de esta feature (ver Assumptions); hoy no existe una función de "cambiar identificador/correo".
- ¿Qué ocurre si alguien registra una cuenta con el correo de otra persona (typo propio o de mala fe) y nunca la verifica? Sin una salida, ese correo quedaría bloqueado para siempre para su dueño real, porque el registro hoy rechaza cualquier `identifier` ya usado sin mirar si esa cuenta llegó a verificarse. Ver FR-012: pasado el periodo de expiración del código, ese `identifier` vuelve a estar disponible para un registro nuevo mientras la cuenta anterior siga sin verificar.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST validar, durante el registro, que el `identifier` proporcionado sea una dirección de correo electrónico con formato sintácticamente válido (sustituyendo la opción actual de registrarse con un nombre de usuario libre).
- **FR-002**: El sistema MUST generar un código de verificación de un solo uso al registrar una cuenta nueva y enviarlo al correo proporcionado a través de un proveedor de envío de correo real.
- **FR-003**: El sistema MUST crear las cuentas nuevas con `status = pending_verification` (reutilizando el campo `status` ya existente en `UserAccount`) hasta que se confirme el código correcto.
- **FR-004**: El sistema MUST bloquear, para cuentas con `status = pending_verification`, únicamente las acciones con apuesta económica/competitiva — apostar, crear retos y aceptar retos —, devolviendo un mensaje claro que indique que falta verificar el correo. El resto de acciones (solicitudes de amistad, grupos, edición de perfil, etc.) MUST permanecer disponibles.
- **FR-005**: Los usuarios MUST poder introducir el código recibido para pasar su cuenta a `status = active`.
- **FR-006**: Los usuarios MUST poder solicitar el reenvío del código de verificación, sujeto a un periodo de espera (cooldown) de 60 segundos entre solicitudes.
- **FR-007**: El sistema MUST expirar cada código de verificación 24 horas después de su envío, y permitir generar uno nuevo (vía reenvío) tras la expiración.
- **FR-008**: El sistema MUST limitar a 5 los intentos de código incorrecto permitidos antes de exigir un reenvío, para reducir el riesgo de adivinación por fuerza bruta.
- **FR-009**: El sistema MUST considerar verificadas automáticamente (`status = active`) todas las cuentas creadas antes de desplegar esta feature, para no bloquear retroactivamente a usuarios existentes.
- **FR-010**: El sistema MUST permitir iniciar sesión (login) y solicitar reenvío del código a una cuenta con `status = pending_verification`, aun cuando otras acciones estén bloqueadas.
- **FR-011**: El sistema MUST usar, en el entorno de desarrollo local, un modo de envío de correo que no requiera credenciales reales (sandbox/consola), reservando el proveedor real para el entorno desplegado.
- **FR-012**: El sistema MUST permitir que un nuevo registro reclame un `identifier` cuya única cuenta asociada sigue en `status = pending_verification` y cuyo código ya expiró (24 horas desde el envío, ver FR-007), descartando la cuenta no verificada anterior en favor de la nueva.

### Key Entities *(include if feature involves data)*

- **UserAccount** (existente): su campo `status` ya existente gana el valor `pending_verification` (además de `active`); se añaden los atributos `verification_code`, `verification_code_sent_at` (controla expiración y cooldown de reenvío) y `verification_attempts_remaining`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las cuentas registradas después del despliegue de esta feature quedan en estado "pendiente de verificación" hasta confirmar el código.
- **SC-002**: El 100% de las cuentas creadas antes del despliegue de esta feature conservan acceso completo sin necesidad de verificación retroactiva (0% de bloqueos inesperados).
- **SC-003**: Un usuario con acceso normal a su bandeja de entrada puede completar el registro y la verificación en menos de 3 minutos.
- **SC-004**: El sistema procesa como máximo una solicitud de reenvío por cuenta dentro de cada ventana de 60 segundos de cooldown (0% de reenvíos duplicados dentro de la ventana).

## Assumptions

- El campo `identifier` ya existente en registro/login se reutiliza como dirección de correo; a partir de esta feature deja de aceptarse un nombre de usuario libre en el registro (login de cuentas ya existentes con identificador no-email sigue funcionando, ver FR-009).
- Las cuentas creadas antes de esta feature se consideran verificadas automáticamente (grandfathered); no se les exige verificar retroactivamente.
- El proveedor de correo concreto (SMTP/SendGrid/similar) y sus credenciales son una decisión de implementación (`plan.md`), no de esta especificación; en local se usa un modo sandbox/consola sin credenciales reales.
- Cambiar el correo asociado a una cuenta ya registrada queda fuera de alcance; podrá abordarse en una iteración posterior si se decide.
- El periodo de reclamo de un `identifier` no verificado (FR-012) se hace coincidir con la expiración del código (24 horas) por simplicidad, en vez de definir una ventana independiente.
- Las acciones bloqueadas para cuentas pendientes de verificación se limitan deliberadamente a las de apuesta económica/competitiva (apostar, retos); funciones sociales (amistad, grupos) y de perfil quedan disponibles sin restricción (ver FR-004).
- TDD permanece diferido para esta feature, consistente con el resto del proyecto.
- El envío de correo real en el entorno desplegado se considera una excepción de seguridad aprobada explícitamente (ver Constitution Alignment), no una relajación general de la restricción de secretos en fase mock.
