# Feature Specification: Retos entre amigos (reto 1v1 con Beths)

**Feature Branch**: `[007-retos-entre-amigos]`

**Created**: 2026-07-27

**Status**: Draft

**Input**: User description: "Implementa la funcionalidad de 'Retos entre amigos' listada en el README como MVP y ausente del código: un usuario reta directamente a un amigo concreto a una apuesta 1v1 sobre un partido, con Beths en juego, sin pasar por un grupo de predicciones."

**Clarifications (pre-especificación, 2026-07-27)**: Antes de escribir esta especificación se revisó el código existente para decidir el diseño más simple compatible con la infraestructura ya construida en `004-social`, `005-combinada` y `006-elo`:

- Un reto solo puede lanzarse a una cuenta que ya sea **amigo aceptado** (reutiliza `social_repository.is_friend`); no es un mecanismo para conocer gente nueva, es una extensión de la relación de amistad ya existente.
- Un reto es una **apuesta simétrica** (peer-to-peer): quien reta elige un partido y un resultado (local/empate/visitante, igual que una apuesta simple ya existente) y una cantidad de Beths. Quien recibe el reto no elige un resultado propio ni negocia el importe: si acepta, automáticamente apuesta la misma cantidad de Beths a que ese resultado **no** ocurre. No hay cuotas de mercado ni ganancia parcial: el ganador se lleva exactamente el importe apostado por el otro (bote = el doble de la apuesta de cada uno), el perdedor no recupera nada de lo suyo.
- Los retos **no afectan al Elo** de ninguna de las dos cuentas, por el mismo motivo ya documentado para las predicciones de grupo en `006-elo`: solo las apuestas de partido contra el mercado (`PlacedBet`, con cuota real) mueven el Elo; un reto 1v1 sin cuota de mercado no tiene una "dificultad" objetiva que alimentar a esa fórmula. Esta decisión se puede revisar en una spec futura si se decide dar a los retos su propia cuota implícita.
- El resultado real del partido para liquidar un reto reutiliza exactamente la misma simulación determinista ya introducida en `006-elo` (`match_results.generate_match_result`), la misma ventana de liquidación (`SETTLEMENT_DELAY_MINUTES`, 90 minutos) y el mismo patrón de liquidación perezosa (`_settle_due_bets`) — no se introduce un scheduler ni una fuente de resultados nueva.
- Las Beths de quien reta se retienen (débito) en el momento de lanzar el reto, no al aceptarlo, para que un reto pendiente no pueda gastarse por accidente en otra apuesta mientras espera respuesta. Las Beths de quien recibe el reto se retienen solo al aceptar. Si el retado no tiene saldo suficiente en ese momento, la aceptación se rechaza (debe declinar el reto en su lugar); si quien retó cancela un reto aún pendiente, o el retado lo rechaza, el importe retenido de quien retó se devuelve íntegro.

## Constitution Alignment *(mandatory)*

- **Simplicity Statement**: Se añade una única entidad nueva (`FriendChallenge`) y un único repositorio nuevo (`challenge_repository.py`), calcados del patrón de liquidación perezosa ya usado por `bet_repository.py` (mismo resultado simulado, misma ventana de liquidación). No se introduce ninguna entidad "Wallet", "Pot" o "Escrow" separada: el débito/crédito de Beths reutiliza el mismo campo `AccountProfile.beths` ya existente. No se reutiliza el sistema de grupos ni de predicciones de grupo — un reto es una relación 1 a 1 entre dos cuentas, no un objeto de grupo.
- **Local-First Confirmation**: Todo el estado (retos, su liquidación, el resultado simulado) se persiste en el mismo SQLite local ya usado por el resto del prototipo; no se añade ninguna dependencia de red.
- **Stack Confirmation**: Backend en Python (nueva tabla, nuevo repositorio, nuevas rutas en `api.py`); frontend en React/Expo (nueva sección "Retos" en la pantalla Social ya existente, un modal de creación de reto), con validación en Expo ya que la superficie nueva vive en una pantalla móvil ya existente.
- **TDD Mode**: Deferred, igual que el resto del proyecto.
- **Security Scope (Mock Stage)**: Sin dinero real. Los retos mueven exclusivamente Beths (moneda de juego); el resultado del partido sigue siendo la misma simulación determinista ya documentada como tal en `006-elo`, nunca presentada como un dato real.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reto a un amigo a una apuesta 1v1 sobre un partido (Priority: P1)

Como usuario, quiero elegir a un amigo, un partido y un resultado, apostar una cantidad de Beths, y que mi amigo pueda aceptar o rechazar ese reto directo, para competir cara a cara con alguien concreto en vez de solo contra el mercado o el ranking de un grupo.

**Why this priority**: Es el núcleo de la funcionalidad — sin poder crear ni responder un reto, no existe ninguna otra historia de esta spec.

**Independent Test**: Puede probarse con dos cuentas amigas entre sí; la primera lanza un reto a la segunda sobre un partido abierto a apuestas con un importe menor o igual a su saldo, y se comprueba que el reto aparece como pendiente para ambas (saliente para quien retó, entrante para quien fue retado) y que el saldo de quien retó ya se ha reducido en el importe del reto.

**Acceptance Scenarios**:

1. **Given** dos cuentas que son amigas entre sí, **When** una de ellas lanza un reto a la otra sobre un partido abierto a apuestas con un resultado y un importe de Beths menor o igual a su saldo, **Then** se crea un reto en estado "pendiente", visible como saliente para quien retó y como entrante para quien fue retado, y el saldo de quien retó se reduce exactamente en ese importe.
2. **Given** dos cuentas que no son amigas entre sí, **When** una intenta retar a la otra, **Then** el sistema rechaza la creación del reto y no se descuenta ningún saldo.
3. **Given** una cuenta con menos Beths que el importe que intenta usar para retar, **When** intenta crear el reto, **Then** el sistema lo rechaza y no se descuenta ningún saldo.
4. **Given** un partido que ya no está abierto a apuestas, **When** un usuario intenta retar sobre ese partido, **Then** el sistema rechaza la creación del reto.

---

### User Story 2 - Acepto o rechazo un reto que me han lanzado (Priority: P1)

Como usuario retado, quiero ver quién me reta, sobre qué partido y con cuántas Beths, y decidir si acepto (arriesgando el mismo importe) o lo rechazo, para no verme comprometido a una apuesta que no he elegido.

**Why this priority**: Sin poder responder, un reto lanzado nunca se convierte en una apuesta real ni se libera el saldo retenido de quien retó; es la otra mitad imprescindible de la User Story 1.

**Independent Test**: Puede probarse con un reto pendiente ya creado: aceptarlo con saldo suficiente reduce el saldo del retado en el mismo importe y pasa el reto a "aceptado"; rechazarlo devuelve el importe retenido a quien retó y pasa el reto a "rechazado", sin tocar el saldo del retado.

**Acceptance Scenarios**:

1. **Given** un reto pendiente dirigido a mi cuenta y saldo suficiente para igualarlo, **When** lo acepto, **Then** mi saldo se reduce exactamente en el importe del reto y su estado pasa a "aceptado".
2. **Given** un reto pendiente dirigido a mi cuenta y saldo insuficiente para igualarlo, **When** intento aceptarlo, **Then** el sistema rechaza la aceptación, mi saldo no cambia y el reto sigue "pendiente".
3. **Given** un reto pendiente dirigido a mi cuenta, **When** lo rechazo, **Then** su estado pasa a "rechazado", mi saldo no cambia, y el saldo retenido de quien me retó se devuelve íntegro.
4. **Given** un reto que ya no está "pendiente" (aceptado, rechazado, cancelado o liquidado), **When** intento aceptarlo o rechazarlo de nuevo, **Then** el sistema rechaza la operación.
5. **Given** un reto pendiente dirigido a otra cuenta distinta de la mía, **When** intento aceptarlo o rechazarlo, **Then** el sistema rechaza la operación.

---

### User Story 3 - Cancelo un reto que lancé y aún no ha sido respondido (Priority: P2)

Como usuario que lanzó un reto, quiero poder cancelarlo mientras siga pendiente de respuesta, para recuperar mis Beths retenidas si cambio de opinión o me equivoqué de partido o de amigo.

**Why this priority**: Sin cancelación, un reto pendiente sin respuesta retiene Beths indefinidamente sin salida para quien lo lanzó; depende de que exista ya la creación de retos (User Story 1) pero no de la respuesta del otro lado (User Story 2).

**Independent Test**: Puede probarse con un reto pendiente ya creado por mi cuenta: cancelarlo devuelve el importe retenido a mi saldo y pasa el reto a "cancelado", y una vez cancelado ya no aparece como pendiente para el retado.

**Acceptance Scenarios**:

1. **Given** un reto pendiente que lancé yo, **When** lo cancelo, **Then** su estado pasa a "cancelado" y mi saldo recupera exactamente el importe retenido.
2. **Given** un reto que ya fue aceptado, rechazado o liquidado, **When** intento cancelarlo, **Then** el sistema rechaza la operación.
3. **Given** un reto pendiente lanzado por otra cuenta distinta de la mía, **When** intento cancelarlo, **Then** el sistema rechaza la operación.

---

### User Story 4 - Mi reto aceptado se liquida solo cuando el partido termina (Priority: P1)

Como usuario con un reto ya aceptado por ambas partes, quiero que se resuelva automáticamente cuando el partido se considere terminado, acreditando el bote completo a quien acertó, para saber quién ganó sin tener que hacer nada manualmente.

**Why this priority**: Sin liquidación automática, un reto aceptado nunca llega a un desenlace y las Beths de ambos quedan retenidas para siempre; depende de que exista ya un reto aceptado (User Story 2).

**Independent Test**: Puede probarse con un reto ya aceptado por ambas cuentas sobre un partido cuya ventana de liquidación ya pasó: al consultar los retos de cualquiera de las dos cuentas, el reto aparece "liquidado", con un ganador determinado por el mismo resultado simulado ya usado para las apuestas de partido, y el saldo del ganador aumenta en el doble del importe apostado por cada lado.

**Acceptance Scenarios**:

1. **Given** un reto aceptado cuyo partido ya se considera terminado, **When** cualquiera de las dos cuentas implicadas consulta sus retos, **Then** el reto se liquida: su estado pasa a "liquidado", queda registrado el resultado simulado y el ganador, y el saldo del ganador aumenta en el doble del importe apostado por cada lado (su propio importe retenido más el del perdedor).
2. **Given** un reto aceptado cuyo partido aún no se considera terminado, **When** se consultan los retos de cualquiera de las dos cuentas, **Then** el reto permanece "aceptado" y ningún saldo cambia.
3. **Given** un reto ya liquidado, **When** se vuelve a consultar, **Then** su resultado y ganador no cambian (la liquidación ocurre exactamente una vez).
4. **Given** un reto liquidado, **When** se consulta el Elo de cualquiera de las dos cuentas implicadas, **Then** no ha cambiado por ese motivo (ver Clarifications).

### Edge Cases

- ¿Qué pasa si quien retó ya no tiene saldo suficiente en el momento en que el retado intenta aceptar (por haberlo gastado en otra apuesta después de crear el reto)? No puede ocurrir: el importe de quien retó ya quedó retenido (descontado) desde el momento de crear el reto, así que su saldo posterior no afecta a la aceptación.
- ¿Qué pasa si dos amigos se retan mutuamente sobre el mismo partido a la vez (cada uno lanza su propio reto al otro)? Son dos retos independientes, cada uno con su propio ciclo de vida; no se fusionan ni se cancelan entre sí.
- ¿Qué pasa si el partido de un reto pendiente (aún sin aceptar) deja de estar abierto a apuestas antes de que el retado responda? El retado puede seguir aceptando o rechazando el reto ya creado (la validez del partido solo se comprueba al crear el reto, igual que una apuesta ya colocada no se re-valida); la liquidación no depende de si el partido sigue "abierto", solo de si ya pasó su ventana de liquidación.
- ¿Qué pasa si se elimina la amistad entre dos cuentas después de crear un reto entre ellas? El reto ya creado sigue su ciclo de vida normal (responder, cancelar, liquidar) independientemente del estado de la amistad; solo la creación de un reto nuevo exige amistad vigente.
- ¿Qué pasa si un reto pendiente nunca es respondido ni cancelado? Permanece "pendiente" indefinidamente con el saldo de quien retó retenido; no hay expiración automática en esta spec (ver Assumptions).
- **Erratum corregido (2026-07-31)**: el selector de partido al crear un reto (FR-001, "partido abierto a apuestas") filtraba en el cliente únicamente los estados de football-data.org (`scheduled`/`timed`), sin reconocer el estado que usa PandaScore para esports (`not_started`) - el resultado era que, al retar sobre una competicion de esports (ej. League of Legends), no aparecía ningún partido disponible pese a haberlos. Se corrigió centralizando la definición de "partido abierto" (compartida ahora con la tarjeta de partido y los destacados del home) para que reconozca ambos proveedores, tal como ya exigía FR-001 sin ambigüedad de proveedor.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir a una cuenta crear un reto dirigido a otra cuenta únicamente si ambas son amigas entre sí (`is_friend`), especificando un partido abierto a apuestas, un resultado (local/empate/visitante) y un importe de Beths.
- **FR-002**: El sistema MUST rechazar la creación de un reto si el importe de Beths solicitado supera el saldo disponible de quien reta, sin descontar nada.
- **FR-003**: El sistema MUST descontar del saldo de quien reta el importe exacto del reto en el momento de crearlo, dejando el reto en estado "pendiente".
- **FR-004**: El sistema MUST permitir a la cuenta retada aceptar un reto pendiente dirigido a ella, descontando de su saldo el mismo importe y pasando el reto a "aceptado", o rechazarlo, devolviendo a quien retó el importe retenido y pasando el reto a "rechazado".
- **FR-005**: El sistema MUST rechazar la aceptación de un reto si el saldo de la cuenta retada es menor que el importe del reto, sin cambiar el estado del reto ni ningún saldo.
- **FR-006**: El sistema MUST permitir a quien creó un reto cancelarlo mientras siga "pendiente", devolviéndole el importe retenido y pasando el reto a "cancelado".
- **FR-007**: El sistema MUST impedir aceptar, rechazar o cancelar un reto que no esté en el estado correspondiente esperado ("pendiente"), y MUST impedir responder o cancelar un reto a una cuenta que no sea su retado o su creador respectivamente.
- **FR-008**: El sistema MUST liquidar de forma perezosa todo reto en estado "aceptado" cuyo partido ya se considere terminado (misma ventana de liquidación que las apuestas de partido), determinando el resultado simulado del partido de forma determinista y reproducible a partir del identificador del partido.
- **FR-009**: El sistema MUST declarar ganador de un reto liquidado a quien retó si el resultado simulado coincide con el resultado elegido al crear el reto, o a quien fue retado en caso contrario, y MUST acreditar al ganador el importe retenido de ambas cuentas.
- **FR-010**: El sistema MUST dejar el Elo de ambas cuentas sin cambios por la creación, respuesta, cancelación o liquidación de cualquier reto.
- **FR-011**: El sistema MUST permitir a una cuenta consultar sus retos agrupados al menos en: recibidos pendientes de respuesta, enviados pendientes de respuesta, aceptados en curso, y ya resueltos (liquidados, rechazados o cancelados).

### Key Entities *(include if feature involves data)*

- **Reto entre amigos (nuevo, `FriendChallenge`)**: quién retó, a quién, sobre qué partido (con una copia del nombre del partido para poder mostrarlo aunque el partido cambie o desaparezca del dataset mock, igual que ya hace `PlacedBetSelection.match_label`), qué resultado eligió quien retó, el importe de Beths igualado por ambos lados, su estado (pendiente/aceptado/rechazado/cancelado/liquidado), y una vez liquidado, el resultado simulado del partido y la cuenta ganadora.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Dos cuentas amigas pueden completar el ciclo completo de un reto (creación, aceptación, liquidación) sin ninguna intervención manual más allá de crear el reto y aceptarlo.
- **SC-002**: El 100% de los retos aceptados terminan en estado "liquidado" con un ganador determinado, dentro del mismo tiempo de liquidación ya usado para las apuestas de partido, sin intervención manual.
- **SC-003**: Ningún reto creado, respondido, cancelado o liquidado modifica el Elo de ninguna de las dos cuentas implicadas.
- **SC-004**: La suma de Beths retenidas y devueltas/acreditadas en cualquier reto (pendiente, cancelado, rechazado o liquidado) cuadra siempre: nunca se crean ni se destruyen Beths fuera de lo apostado por ambas partes.

## Assumptions

- Un reto pendiente no expira automáticamente por tiempo; solo cambia de estado por acción explícita (aceptar/rechazar/cancelar) o por liquidación tras ser aceptado. Una expiración automática queda fuera de alcance de esta spec y puede añadirse después sin cambiar el resto del diseño.
- El resultado elegido por quien reta es siempre uno de los tres resultados ya usados por las apuestas de partido (local/empate/visitante); esta spec no introduce mercados nuevos (hándicaps, marcador exacto, etc.).
- Un reto no tiene cuota de mercado ni afecta al Elo (ver Clarifications); si en el futuro se decide lo contrario, es un cambio de diseño para una spec posterior, no para esta.
- TDD sigue diferido, igual que en el resto del proyecto.
