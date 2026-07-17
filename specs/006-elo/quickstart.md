# Quickstart: Elo (Sistema de ELO y moneda del juego)

## Goal

Validar que el ELO de una cuenta cambia al resolver predicciones de grupo (más si acertó una opción minoritaria), que existe un saldo de coins independiente que se debita al apostar y se liquida (gana o pierde) tras un tiempo fijo, que la renta periódica evita que una cuenta se quede bloqueada, y que cruzar un hito de ELO concede y notifica una recompensa de coins una única vez.

## Prerequisites

- El repo está clonado localmente.
- El backend Python local y el frontend Expo pueden arrancarse desde el workspace (`npm run dev`).
- **No borrar `backend/data/bethany.sqlite3`** — contiene cuentas reales, no solo fixtures de prueba.
- Al menos dos cuentas registradas y amigas entre sí, con un grupo de predicciones compartido (flujo ya cubierto por `004-social`).
- Al menos un partido sincronizado y abierto para apostar (flujo ya cubierto por `005-combinada`).

## Validation Flow

### 1. El ELO sube al acertar una predicción minoritaria

Con al menos tres cuentas en un grupo, crea una predicción con dos opciones. Haz que dos cuentas voten la opción A y una vote la opción B. Resuelve la predicción con la opción B como correcta.

**Expected result**: El ELO de la cuenta que votó B sube más de lo que hubiera subido si B hubiera sido la opción mayoritaria; el ELO de las dos cuentas que votaron A baja. Una cuenta del grupo que no votó no cambia su ELO.

### 2. El ELO nunca baja del suelo mínimo

Con una cuenta de ELO ya bajo (o forzando varias resoluciones en las que falle), sigue haciéndola fallar predicciones.

**Expected result**: Su ELO se estabiliza en el suelo mínimo configurado (100) y no sigue bajando.

### 3. Colocar una apuesta debita el saldo de coins

Consulta `GET /account/me` de una cuenta y anota `profile.coins`. Coloca una apuesta simple con un importe menor a ese saldo.

**Expected result**: `GET /account/me` inmediatamente después muestra `profile.coins` reducido exactamente en el importe apostado.

### 4. Una apuesta se rechaza si el saldo no alcanza

Con el saldo restante de la cuenta anterior, intenta colocar una apuesta con un importe mayor que ese saldo.

**Expected result**: La colocación se rechaza (`400`, `"insufficient coins balance"`) y el saldo no cambia.

### 5. La apuesta se liquida sola pasado el tiempo configurado

Deja pasar (o ajusta manualmente `created_at` en `placed_bets` para simular el paso del tiempo) más de 90 minutos desde que se colocó la apuesta del paso 3. Abre "Mis apuestas" (`GET /bets/mine`).

**Expected result**: La apuesta ya no aparece como `"realizada"`; pasó a `"ganada"` (con el saldo de coins aumentado en `potentialWinnings`) o a `"perdida"` (saldo sin cambios adicionales), según el resultado simulado determinista de ese `matchId`. Repetir la consulta más tarde da siempre el mismo resultado para esa apuesta (no vuelve a re-liquidarse).

### 6. Una combinada solo gana si ganan todas sus selecciones

Coloca una apuesta combinada con dos selecciones de partidos distintos y espera a que ambos partidos sean liquidables.

**Expected result**: Si el resultado simulado de ambos partidos coincide con lo apostado, la combinada pasa a `"ganada"` y se acredita `potentialWinnings`; si falla cualquiera de las dos, pasa a `"perdida"` sin acreditar nada.

### 7. La renta periódica llega aunque el saldo esté a cero

Deja a una cuenta con saldo 0 (perdiendo apuestas) y ajusta `coins_last_grant_at` (dentro del JSON de `profile` en `account_state`) a más de 7 días atrás, o espera ese tiempo real.

**Expected result**: La siguiente vez que esa cuenta hace login o consulta `GET /account/me`, su saldo sube en la cantidad de la renta (100) y `coins_last_grant_at` se actualiza a ahora. Consultarlo de nuevo inmediatamente después no vuelve a sumar renta.

### 8. Cruzar un hito de ELO concede una recompensa una sola vez

Fuerza (a través de varias resoluciones de predicciones ganadas) que el ELO de una cuenta cruce un múltiplo de 100 (p. ej. de 1780 a 1810).

**Expected result**: El saldo de coins de esa cuenta sube en la recompensa configurada (50) exactamente una vez. `GET /account/me` muestra el hito en `unseenEloMilestones`. Tras llamar a `POST /account/me/milestones/ack`, `unseenEloMilestones` vuelve a estar vacío. Si el ELO baja y vuelve a subir por encima de ese mismo hito sin alcanzar el siguiente, no aparece una segunda recompensa.

### 9. El cliente no puede editar ELO ni coins a mano

Desde la pantalla de perfil, intenta guardar un valor de ELO manualmente distinto (o llama a `PUT /account/me` con un `profile.elo`/`profile.coins` arbitrario).

**Expected result**: El perfil guardado conserva el ELO y el saldo de coins que ya tenía el servidor, ignorando el valor enviado. En el frontend, el campo de ELO deja de ser editable en la pantalla de edición de perfil.

### 10. Validación en móvil (Expo)

Repite los pasos 3 y 8 desde la app en un simulador/dispositivo Expo.

**Expected result**: El saldo de coins se muestra en la pantalla de perfil, se actualiza tras colocar una apuesta, y el aviso de hito de ELO se muestra y se puede descartar igual que en la validación de escritorio.

## Follow-ups Deferred (fuera de alcance de esta spec)

- Integración con resultados reales de partido (hoy simulados de forma determinista, ver `research.md` Decision 8).
- Ranking global real basado en ELO (hoy sigue siendo datos de ejemplo sin conexión al backend).
- Límites de apuesta responsable o prevención de abuso en la creación masiva de apuestas (ya diferido desde `005-combinada`).
