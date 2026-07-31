# Quickstart: Elo (Sistema de ELO y moneda del juego)

## Goal

Validar que el ELO de una cuenta cambia al liquidar una apuesta de partido (más cuanto más difícil la cuota y más Beths apostados, ver `research.md` Decision 2-bis), que las predicciones de grupo nunca tocan el ELO, que existe un saldo de Beths independiente que se debita al apostar y se liquida (gana o pierde) tras un tiempo fijo, que la renta continua evita que una cuenta se quede bloqueada, y que cruzar un hito de ELO concede y notifica una recompensa de Beths una única vez.

## Prerequisites

- El repo está clonado localmente.
- El backend Python local y el frontend Expo pueden arrancarse desde el workspace (`npm run dev`).
- **No borrar `backend/data/bethany.sqlite3`** — contiene cuentas reales, no solo fixtures de prueba.
- Al menos un partido sincronizado y abierto para apostar (flujo ya cubierto por `005-combinada`).
- Para el paso 8 (predicciones de grupo), al menos dos cuentas registradas y amigas entre sí con un grupo compartido (flujo ya cubierto por `004-social`) — solo hace falta para confirmar que *no* afectan al ELO.

## Validation Flow

### 1. Colocar una apuesta debita el saldo de Beths

Consulta `GET /account/me` de una cuenta y anota `profile.beths`. Coloca una apuesta simple con un importe menor a ese saldo.

**Expected result**: `GET /account/me` inmediatamente después muestra `profile.beths` reducido exactamente en el importe apostado.

### 2. Una apuesta se rechaza si el saldo no alcanza, o si el importe supera el tope

Con el saldo restante de la cuenta anterior, intenta colocar una apuesta con un importe mayor que ese saldo. Después, intenta colocar una apuesta de más de 1000 Beths (aunque el saldo alcance).

**Expected result**: Ambas colocaciones se rechazan (`400`, `"insufficient beths balance"` o `"stake cannot exceed 1000 beths"` respectivamente) y el saldo no cambia en ninguno de los dos casos.

### 3. La apuesta se liquida sola una vez el partido tiene un resultado real, y mueve el ELO

*(Revisado 2026-07-31: ya no basta con esperar 90 minutos — la apuesta debe además apostar sobre un partido cuya fuente real (football-data.org/PandaScore) ya lo reporte como terminado; ver `research.md`, Revisión 2026-07-31.)* Coloca la apuesta del paso 1 sobre un partido real ya finalizado en su fuente (o ajusta manualmente `created_at`/el `kickoff_at` sincronizado para que el throttle de 90 minutos no bloquee la comprobación). Anota `profile.elo` antes de abrir "Mis apuestas" (`GET /bets/mine`), luego vuelve a consultar `GET /account/me`.

**Expected result**: La apuesta ya no aparece como `"realizada"`; pasó a `"ganada"` (con el saldo de Beths aumentado en `potentialWinnings`) o a `"perdida"` (saldo sin cambios adicionales), según el resultado real de ese `matchId` en su fuente. La apuesta liquidada también trae `eloDelta` (el cambio de ELO exacto que aplicó, visible en "Mis apuestas"). El ELO subió si ganó, bajó si perdió — más cuanto más alta era la cuota apostada y cuantos más Beths se arriesgaron (dentro de los rendimientos decrecientes, ver Decision 2-bis). Repetir la consulta más tarde da siempre el mismo resultado para esa apuesta (no vuelve a re-liquidarse ni a mover el ELO otra vez). Si el partido elegido todavía no tiene resultado confirmado en su fuente, la apuesta permanece `"realizada"` indefinidamente — es el comportamiento esperado, no un fallo.

### 4. El ELO nunca baja del suelo mínimo

Con una cuenta de ELO ya bajo (o forzando varias apuestas perdedoras seguidas), sigue haciéndola perder apuestas.

**Expected result**: Su ELO se estabiliza en el suelo mínimo configurado (100) y no sigue bajando.

### 5. Solo las primeras 5 apuestas liquidadas del día mueven el ELO

Coloca y liquida (ajustando `created_at` como en el paso 3) más de 5 apuestas de la misma cuenta el mismo día UTC.

**Expected result**: Las 5 primeras liquidaciones del día mueven el ELO; a partir de la sexta, la apuesta se liquida y paga Beths con normalidad pero el ELO no cambia. Al día siguiente (UTC), el contador se reinicia y una nueva liquidación vuelve a mover el ELO.

### 6. Una combinada solo gana si ganan todas sus selecciones

Coloca una apuesta combinada con dos selecciones de partidos distintos y espera a que ambos partidos sean liquidables.

**Expected result**: Si el resultado real de ambos partidos coincide con lo apostado, la combinada pasa a `"ganada"` y se acredita `potentialWinnings` (y el ELO sube según la cuota combinada); si falla cualquiera de las dos, pasa a `"perdida"` sin acreditar nada (y el ELO baja). Si el resultado real de cualquiera de los dos partidos aún no está confirmado en su fuente, la combinada entera permanece `"realizada"` hasta que ambos lo estén.

### 7. La renta llega aunque el saldo esté a cero, y acumula periodos vencidos

Deja a una cuenta con saldo 0 (perdiendo apuestas) y ajusta `beths_last_grant_at` (dentro del JSON de `profile` en `account_state`) a, por ejemplo, 12.5 minutos atrás (2 periodos y medio de 5 minutos), o espera ese tiempo real.

**Expected result**: La siguiente vez que esa cuenta hace login o consulta `GET /account/me`, su saldo sube en 2 Beths (los dos periodos completos vencidos, no solo uno) y `bethsLastGrantAt` avanza exactamente esos 2 periodos (no salta a "ahora"), dejando ~2.5 minutos de progreso hacia el siguiente Beth. Consultarlo de nuevo inmediatamente después no vuelve a sumar renta. En el frontend, el temporizador junto al saldo de Beths (`BethsCountdown`) refleja esos ~2.5 minutos restantes.

### 8. Las predicciones de grupo no afectan al ELO ni a las Beths

Con al menos tres cuentas en un grupo, crea una predicción con dos opciones. Haz que voten opciones distintas y resuélvela.

**Expected result**: El ELO y el saldo de Beths de cada votante permanecen exactamente igual que antes de resolver la predicción. El único efecto visible es el ranking de grupo por aciertos (`correctCount` en `serialize_group_detail`), que sí cambia.

### 9. Cruzar un hito de ELO concede una recompensa una sola vez

Fuerza (a través de varias apuestas de partido ganadas) que el ELO de una cuenta cruce un múltiplo de 100 (p. ej. de 1780 a 1810).

**Expected result**: El saldo de Beths de esa cuenta sube en la recompensa configurada (50) exactamente una vez. `GET /account/me` muestra el hito en `unseenEloMilestones`. Tras llamar a `POST /account/me/milestones/ack`, `unseenEloMilestones` vuelve a estar vacío. Si el ELO baja y vuelve a subir por encima de ese mismo hito sin alcanzar el siguiente, no aparece una segunda recompensa.

### 10. El cliente no puede editar ELO ni Beths a mano

Llama a `PUT /account/me` con un `profile.elo`/`profile.beths` arbitrario.

**Expected result**: El perfil guardado conserva el ELO y el saldo de Beths que ya tenía el servidor, ignorando el valor enviado.

### 11. Validación en móvil (Expo)

Repite los pasos 1, 3 y 9 desde la app en un simulador/dispositivo Expo. Además, en el boleto de apuestas, comprueba que:

- El icono junto al saldo de Beths es la insignia "B" propia (`BethsIcon`), no un icono de dinero/euro genérico, y aparece tanto en la insignia de perfil como junto a los importes de apuesta y ganancia potencial.
- Bajo el saldo de Beths hay una cuenta atrás ("+1 Beth en m:ss") que baja cada segundo y se reinicia sola al llegar a 0 (refrescando el saldo).
- Al escribir un importe de apuesta aparece una vista previa ("Si aciertas: +N Elo · Si fallas: −M Elo") que se actualiza en vivo.
- Los 4 botones rápidos de importe muestran un ELO distinto cada uno (nunca dos iguales) y, al pulsarlos, rellenan el importe de Beths necesario para lograr ese ELO con esa cuota concreta.

**Expected result**: Todo lo anterior se comporta igual que en la validación de escritorio/API directa.

## Follow-ups Deferred (fuera de alcance de esta spec)

- Integración con resultados reales de partido (hoy simulados de forma determinista, ver `research.md` Decision 8).
- Ranking global real basado en ELO, incluyendo la bandera "provisional" bajo `PROVISIONAL_COUNTED_BETS` (hoy el ranking sigue siendo datos de ejemplo sin conexión al backend; el dato `eloBetsSettled` ya está disponible para cuando se implemente).
- Otras fuentes de Beths mencionadas por el usuario (bono diario, misiones diarias/semanales, rachas de actividad, pack inicial) — la renta continua sigue siendo la única red de seguridad implementada.
- Límites de apuesta responsable o prevención de abuso en la creación masiva de apuestas más allá del tope diario de apuestas que cuentan para ELO (ya diferido desde `005-combinada`).
