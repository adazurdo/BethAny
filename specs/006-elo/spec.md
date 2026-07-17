# Feature Specification: Elo (Sistema de ELO y moneda del juego)

**Feature Branch**: `[006-elo]`

**Created**: 2026-07-17

**Status**: Draft

**Input**: User description: "quiero q implementes una nueva spec, la 006 -Elo que implemente esta idea [ELO como ranking puro desacoplado de una moneda gastable llamada coins, ambos globales por usuario, con renta periodica de coins y sin quiebra real] y que añada ademas la recompensa por hito de ELO"

**Clarifications (pre-especificación, 2026-07-17)**: Antes de escribir esta especificación se resolvieron varias decisiones de alcance con el usuario, a partir de una conversación previa sobre cómo diseñar la economía del juego:

- **ELO y coins son dos números totalmente separados**, sin fórmula que los relacione: el ELO es puramente un indicador de ranking/habilidad y las coins son un saldo gastable. Subir de ELO nunca cambia las coins salvo por la recompensa de hito descrita más abajo (un evento puntual, no una fórmula continua), y gastar o ganar coins nunca cambia el ELO.
- El ELO se recalcula **solo** a partir de la resolución de predicciones de grupo (`CustomPrediction`/votos); las predicciones de grupo siguen siendo "votar una opción" sin importe apostado — esta spec no añade una cantidad a apostar ahí.
- Tanto el ELO como el saldo de coins son **globales por cuenta de usuario** (no hay un ELO ni un saldo distinto por grupo).
- Las coins nunca deben dejar a alguien completamente bloqueado: existe una **renta periódica** que da coins de forma regular a toda cuenta activa, independientemente de su saldo actual.
- Se añade una **recompensa de coins al alcanzar un hito de ELO** (cada vez que el ELO cruza hacia arriba un umbral redondo), como único punto de conexión ligera entre ambos sistemas.
- **Bloqueo técnico descubierto durante la investigación**: hoy no existe ningún resultado de partido real en el sistema — el sincronizado con football-data.org descarta explícitamente los partidos ya finalizados y no guarda marcador alguno, y las cuotas (`odds.py`) ya son un cálculo determinista sin datos externos. Para poder implementar la liquidación de las apuestas de partido (`PlacedBet`) contra el saldo de coins sin depender de datos que no existen, esta spec **simula el resultado de cada partido de forma determinista** (mismo patrón ya usado para las cuotas: una función pura sembrada por `match_id`), en vez de esperar o inventar una integración con resultados reales. Esta decisión fue confirmada explícitamente por el usuario.

## Constitution Alignment *(mandatory)*

- **Simplicity Statement**: Se reutiliza la cuenta y el perfil ya existentes (`AccountProfile`) añadiendo campos, no un servicio de "economía" independiente. El ELO recalculado reutiliza el flujo ya existente de resolución de predicciones de grupo (`resolve_prediction`); las coins reutilizan el flujo ya existente de colocar apuestas (`place_bet`). No se introduce un sistema de pagos reales, ni una fórmula que fusione ELO y coins, ni un ranking global distinto del ya existente (fuera de alcance).
- **Local-First Confirmation**: Todo el cálculo de ELO, el saldo de coins, la renta periódica y la simulación de resultados de partido se ejecutan y persisten localmente en el SQLite ya usado por el prototipo; no se introduce ninguna dependencia de red nueva.
- **Stack Confirmation**: Backend en Python (cálculo de ELO, saldo, liquidación simulada); frontend en React con validación en Expo, ya que el saldo de coins y el ELO se muestran en la pantalla de perfil (superficie móvil ya existente).
- **TDD Mode**: Deferred. Se documentan criterios de aceptación verificables; no se activa el gate red-green-refactor para esta feature.
- **Security Scope (Mock Stage)**: No se maneja dinero real ni datos de pago; las coins son una moneda de juego puramente local sin valor de cambio. La simulación determinista de resultados de partido es una simplificación explícita del prototipo (ver Clarifications) y debe documentarse como tal, no presentarse como un resultado real.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mi ELO sube o baja según acierte o falle en predicciones de grupo (Priority: P1)

Como usuario que participa en predicciones de grupo, quiero que mi ELO suba cuando acierto una predicción que pocos acertaron y baje (poco) cuando fallo una predicción obvia, para que mi ELO refleje de verdad mi habilidad prediciendo, no un número fijo que nunca cambia.

**Why this priority**: Es el núcleo de la idea original ("un ELO como en el ajedrez"); sin recálculo dinámico, el campo `elo` sigue siendo un dato decorativo y ninguna otra historia de esta spec tiene sentido.

**Independent Test**: Puede probarse creando un grupo con varios miembros, creando una predicción, haciendo que voten opciones distintas, resolviendo la predicción con una opción concreta, y comprobando que quienes acertaron suben de ELO y quienes fallaron bajan, en mayor medida cuanto menos gente compartiera su acierto.

**Acceptance Scenarios**:

1. **Given** una predicción de grupo abierta con varios miembros votando opciones distintas, **When** el creador la resuelve marcando la opción correcta, **Then** el ELO de cada votante que acertó sube y el de cada votante que falló baja.
2. **Given** dos votantes con el mismo ELO de partida que acertaron la misma predicción, uno votando la opción minoritaria y otro la mayoritaria, **When** se resuelve la predicción, **Then** el votante de la opción minoritaria gana más ELO que el de la opción mayoritaria.
3. **Given** un miembro del grupo que nunca votó en una predicción, **When** esa predicción se resuelve, **Then** su ELO no cambia.
4. **Given** una predicción abortada por su creador en vez de resuelta, **When** se consulta el ELO de quienes habían votado, **Then** ningún ELO ha cambiado.
5. **Given** un ELO ya muy bajo tras varias rachas de fallos, **When** el usuario falla una predicción más, **Then** su ELO nunca baja por debajo de un suelo mínimo.

---

### User Story 2 - Tengo un saldo de coins independiente de mi ELO que uso para apostar en partidos (Priority: P1)

Como usuario, quiero tener un saldo de coins separado de mi ELO, que se gasta al apostar en partidos reales y se recupera con las ganancias cuando acierto, para poder arriesgar más o menos según cuánta confianza tengo, sin que eso afecte a mi ranking de habilidad.

**Why this priority**: Es la otra mitad del diseño acordado (moneda gastable separada del ranking) y la que da sentido real a las apuestas de partido (`PlacedBet`), que hoy se guardan pero nunca se liquidan.

**Independent Test**: Puede probarse con una cuenta con saldo conocido, colocando una apuesta simple con un importe menor o igual a su saldo, comprobando que el saldo baja en ese importe al colocarla, y comprobando que tras la liquidación (simulada) del partido el saldo sube con la ganancia si acertó o se queda igual si falló.

**Acceptance Scenarios**:

1. **Given** una cuenta con un saldo de coins conocido, **When** el usuario coloca una apuesta simple o combinada con un importe menor o igual a su saldo, **Then** el saldo se reduce exactamente en ese importe al colocarla.
2. **Given** una cuenta con menos coins que el importe que intenta apostar, **When** intenta colocar la apuesta, **Then** el sistema la rechaza y el saldo no cambia.
3. **Given** una apuesta ya colocada y el tiempo suficiente para que el partido se considere terminado, **When** el resultado simulado del partido coincide con la selección apostada, **Then** el saldo del usuario aumenta en la ganancia potencial de esa apuesta y su estado pasa a "ganada".
4. **Given** una apuesta ya colocada y el tiempo suficiente para que el partido se considere terminado, **When** el resultado simulado del partido no coincide con la selección apostada, **Then** el saldo no cambia más allá del débito ya aplicado al colocarla y su estado pasa a "perdida".
5. **Given** una apuesta combinada con varias selecciones, **When** se liquida, **Then** solo se considera ganadora si el resultado simulado coincide con todas y cada una de sus selecciones.
6. **Given** que el ELO de un usuario sube o baja por resolver predicciones de grupo, **When** se consulta su saldo de coins, **Then** el saldo no ha cambiado por ese motivo.

---

### User Story 3 - Recibo una renta periódica de coins aunque me haya quedado sin saldo (Priority: P2)

Como usuario que ha perdido la mayor parte o todo su saldo apostando, quiero recibir una cantidad fija de coins de forma periódica, para poder seguir participando sin quedar bloqueado indefinidamente.

**Why this priority**: Sin esto el saldo de coins podría llegar a cero y dejar al usuario sin poder apostar nunca más; es la garantía de que "nunca hay quiebra real" acordada con el usuario. Depende de que exista ya un saldo (User Story 2) pero no depende de las predicciones de grupo (User Story 1).

**Independent Test**: Puede probarse dejando pasar el periodo de renta configurado (o simulando el paso del tiempo ajustando la fecha del último cobro) y comprobando, al volver a cargar la cuenta, que el saldo ha aumentado exactamente en la cantidad de la renta una sola vez por periodo vencido, sin importar si el saldo actual era alto, bajo o cero.

**Acceptance Scenarios**:

1. **Given** una cuenta cuyo último cobro de renta fue hace más del periodo configurado, **When** el usuario abre sesión o consulta su perfil, **Then** su saldo aumenta en la cantidad fija de la renta y la fecha de último cobro se actualiza a ahora.
2. **Given** una cuenta cuyo último cobro de renta fue hace menos del periodo configurado, **When** el usuario consulta su perfil varias veces, **Then** el saldo no recibe renta adicional hasta que se cumpla el periodo completo.
3. **Given** una cuenta nueva recién creada, **When** se consulta por primera vez, **Then** tiene un saldo inicial de coins mayor que cero, sin depender todavía de haber recibido ninguna renta.

---

### User Story 4 - Recibo una recompensa de coins al alcanzar un nuevo hito de ELO (Priority: P3)

Como usuario, quiero recibir una cantidad de coins la primera vez que mi ELO cruza hacia arriba un umbral redondo (por ejemplo, cada 100 puntos), para sentir que progresar en el ranking también tiene una recompensa tangible, sin que esto convierta el ELO en la misma cosa que las coins.

**Why this priority**: Es el punto de conexión ligera entre ambos sistemas pedido explícitamente por el usuario; depende de que el ELO ya sea dinámico (User Story 1) y de que exista el saldo de coins (User Story 2), por eso va después de ambas.

**Independent Test**: Puede probarse resolviendo predicciones sucesivas hasta que el ELO de un votante cruce un umbral (por ejemplo, de 1780 a 1810 cruzando el hito de 1800), comprobando que su saldo de coins aumenta en la recompensa configurada exactamente una vez, y que si el ELO vuelve a bajar y a subir sin superar un hito nuevo no se concede una segunda recompensa por el mismo hito.

**Acceptance Scenarios**:

1. **Given** un usuario cuyo ELO está por debajo de un hito redondo, **When** una resolución de predicción hace que su ELO cruce ese hito hacia arriba, **Then** recibe una recompensa fija de coins asociada a ese hito.
2. **Given** un usuario que ya recibió la recompensa de un hito, **When** su ELO baja por debajo de ese hito y vuelve a subir por encima de él sin alcanzar un hito superior, **Then** no recibe una segunda recompensa por el mismo hito.
3. **Given** una resolución de predicción que hace que el ELO de un usuario cruce varios hitos a la vez (una subida grande), **When** se procesa, **Then** recibe la recompensa correspondiente a cada hito cruzado.
4. **Given** una recompensa de hito recién concedida y aún no vista por el usuario, **When** abre su perfil, **Then** ve un aviso indicando el hito alcanzado y la recompensa recibida, y ese aviso deja de mostrarse después de verlo una vez.

### Edge Cases

- ¿Qué pasa si una predicción de grupo se resuelve y solo hay un votante en total? No hay con quién comparar el acierto/fallo, así que ese votante no gana ni pierde ELO por esa predicción (no hay "campo" contra el que medirse).
- ¿Qué pasa si todos los votantes de una predicción acertaron (o todos fallaron)? El sistema sigue aplicando la fórmula de expectativa normalmente: quien acierta cuando "todo el mundo" acierta gana poco ELO, y quien falla cuando "todo el mundo" falla pierde poco.
- ¿Qué pasa si una cuenta existente (creada antes de esta feature) no tiene todavía saldo de coins guardado? Se le asigna el saldo inicial por defecto la primera vez que se carga tras el despliegue de esta feature, sin perder ningún otro dato de la cuenta.
- ¿Qué pasa si dos apuestas se liquidan a la vez para la misma cuenta? Cada liquidación debe aplicar su propio crédito de forma independiente, sin que una sobrescriba a la otra.
- ¿Qué pasa si el usuario intenta editar manualmente su ELO o su saldo de coins desde la pantalla de edición de perfil? El sistema ignora cualquier valor de ELO o coins recibido desde esa pantalla; solo el propio sistema puede modificarlos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST recalcular el ELO de cada votante de una predicción de grupo cuando esta se resuelve, comparando su acierto o fallo contra el ELO medio del resto de votantes de esa misma predicción.
- **FR-002**: El sistema MUST conceder más ELO por acertar una opción que fue minoritaria entre los votantes que por acertar una opción mayoritaria, y simétricamente perder menos ELO por fallar cuando la mayoría también falló.
- **FR-003**: El sistema MUST dejar el ELO sin cambios para las cuentas que no votaron en una predicción resuelta, y para todas las cuentas cuando una predicción se aborta en vez de resolverse.
- **FR-004**: El sistema MUST impedir que el ELO de cualquier cuenta baje de un suelo mínimo configurado.
- **FR-005**: El sistema MUST mantener un saldo de coins por cuenta, independiente del ELO, que ninguna operación de ELO modifica y que ninguna operación de coins modifica el ELO.
- **FR-006**: El sistema MUST asignar un saldo inicial de coins mayor que cero a toda cuenta nueva y a toda cuenta existente que aún no tuviera saldo registrado.
- **FR-007**: El sistema MUST descontar del saldo de coins de una cuenta el importe exacto de cada apuesta que coloca, y MUST rechazar la colocación si el saldo disponible es menor que el importe solicitado.
- **FR-008**: El sistema MUST determinar, de forma determinista y reproducible a partir del identificador del partido, un resultado simulado (local/empate/visitante) para cada partido sobre el que existan apuestas colocadas, una vez transcurrido el tiempo configurado desde la colocación.
- **FR-009**: El sistema MUST liquidar cada apuesta pendiente cuyo partido ya se considere terminado: acreditando la ganancia potencial al saldo de coins y marcándola como ganada si el resultado simulado coincide con la selección (o con todas las selecciones, si es una combinada), o marcándola como perdida sin acreditar nada en caso contrario.
- **FR-010**: El sistema MUST conceder a toda cuenta activa una cantidad fija de coins cada vez que transcurre el periodo de renta configurado desde su último cobro, independientemente de su saldo actual, sin acumular cobros retroactivos por periodos adicionales ya vencidos.
- **FR-011**: El sistema MUST conceder una recompensa fija de coins la primera vez que el ELO de una cuenta cruza hacia arriba cada hito configurado, incluyendo conceder varias recompensas de una sola vez si una única actualización de ELO cruza varios hitos.
- **FR-012**: El sistema MUST NOT conceder una segunda recompensa por el mismo hito de ELO si la cuenta baja por debajo de él y vuelve a superarlo sin alcanzar un hito nuevo.
- **FR-013**: El sistema MUST permitir a una cuenta consultar sus recompensas de hito de ELO aún no vistas y marcarlas como vistas.
- **FR-014**: El sistema MUST ignorar cualquier valor de ELO o de saldo de coins que llegue en una actualización de perfil iniciada por el usuario, conservando siempre el valor calculado por el propio sistema.

### Key Entities *(include if feature involves data)*

- **Perfil de cuenta (existente, ampliado)**: gana un saldo de coins, la fecha del último cobro de renta, un contador de predicciones resueltas en las que participó (usado para dar más peso a las primeras predicciones) y el hito de ELO más alto ya recompensado.
- **Predicción de grupo (existente)**: sin cambios en su forma; su resolución pasa a disparar el recálculo de ELO de sus votantes.
- **Apuesta de partido (existente)**: gana un estado de liquidación (pendiente/ganada/perdida) y la fecha en la que se liquidó.
- **Recompensa de hito de ELO (nueva)**: registra qué cuenta alcanzó qué hito, cuántas coins recibió y si ya la ha visto.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Tras resolver una predicción de grupo, el ELO de cada votante afectado cambia visible e inmediatamente en su perfil y en el ranking del grupo, sin necesidad de ninguna acción manual adicional.
- **SC-002**: El 100% de las apuestas de partido colocadas terminan en un estado final (ganada o perdida) sin intervención manual, dentro del tiempo de liquidación configurado.
- **SC-003**: Ninguna cuenta activa permanece más de un periodo de renta completo sin recibir su cobro periódico, incluso si su saldo llegó a cero.
- **SC-004**: El 100% de los cruces de hito de ELO generan exactamente una recompensa por hito, nunca cero ni más de una para el mismo hito.
- **SC-005**: Ningún cambio de ELO modifica el saldo de coins de la misma cuenta en la misma operación, y ningún cambio de saldo de coins modifica su ELO, salvo la recompensa de hito descrita.

## Assumptions

- El ELO de partida de las cuentas ya existentes se conserva tal cual (no se resetea a un valor "neutro"); solo empieza a moverse a partir de la próxima predicción de grupo que se resuelva.
- La renta periódica y los importes de recompensa por hito son cantidades fijas configurables por el equipo de producto, no ajustables por el usuario.
- El resultado simulado de partido introducido por esta spec (ver Clarifications) es una simplificación explícita del prototipo mientras no exista una fuente real de resultados finales; puede sustituirse por datos reales en una spec futura sin cambiar el resto de este diseño (el saldo de coins y su liquidación no dependen de cómo se obtenga el resultado, solo de que exista uno).
- El ranking global de la app (hoy con datos de ejemplo, sin conexión con el backend) queda fuera de alcance de esta spec; solo se ven afectados el ELO por cuenta y el ranking ya existente dentro de cada grupo.
- TDD sigue diferido, igual que en el resto del proyecto.
