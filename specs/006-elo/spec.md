# Feature Specification: Elo (Sistema de ELO y moneda del juego)

**Feature Branch**: `[006-elo]`

**Created**: 2026-07-17

**Status**: Draft

**Input**: User description: "quiero q implementes una nueva spec, la 006 -Elo que implemente esta idea [ELO como ranking puro desacoplado de una moneda gastable llamada coins, ambos globales por usuario, con renta periodica de coins y sin quiebra real] y que añada ademas la recompensa por hito de ELO"

**Clarifications (pre-especificación, 2026-07-17)**: Antes de escribir esta especificación se resolvieron varias decisiones de alcance con el usuario, a partir de una conversación previa sobre cómo diseñar la economía del juego:

- **ELO y Beths (moneda renombrada desde "coins" el 2026-07-17) son dos números totalmente separados**, sin fórmula que los relacione directamente: el ELO es puramente un indicador de ranking/habilidad y las Beths son un saldo gastable que limita cuánto se puede apostar y expresa la confianza del jugador. Subir de ELO nunca cambia las Beths salvo por la recompensa de hito descrita más abajo (un evento puntual, no una fórmula continua), y gastar o ganar Beths nunca cambia el ELO directamente — el ELO sí depende de *cuántas* Beths se apostaron en una jugada concreta (factor de confianza), pero no del saldo total de la cuenta.
- **Revisión 2026-07-17**: el ELO se recalcula **solo** al liquidar una apuesta de partido (`PlacedBet`, simple o combinada), a partir de tres factores: la dificultad de la apuesta (probabilidad implícita de su cuota), la cantidad de Beths apostada (confianza, con rendimientos decrecientes) y el resultado (acierto/fallo). Las predicciones de grupo (`CustomPrediction`/votos) **no** afectan al ELO ni cuestan Beths — siguen siendo "votar una opción" gratis, y su único efecto competitivo es el ranking de grupo por aciertos ya existente. (La versión original de esta spec hacía lo contrario: ELO solo desde predicciones de grupo, nunca desde apuestas; ver `research.md` para el detalle del cambio.)
- Tanto el ELO como el saldo de Beths son **globales por cuenta de usuario** (no hay un ELO ni un saldo distinto por grupo).
- Las Beths nunca deben dejar a alguien completamente bloqueado: existe una **renta periódica** que da Beths de forma regular a toda cuenta activa, independientemente de su saldo actual.
- Se añade una **recompensa de Beths al alcanzar un hito de ELO** (cada vez que el ELO cruza hacia arriba un umbral redondo), como único punto de conexión ligera entre ambos sistemas.
- **Anti-abuso** (añadido en la revisión 2026-07-17): un tope de 1000 Beths por apuesta individual, una curva de rendimientos decrecientes en el multiplicador de confianza (sin techo por debajo de ese tope), y un límite de 5 apuestas liquidadas por día que cuentan para el ELO (el resto sigue liquidándose y pagando Beths con normalidad) — ver `research.md` para la simulación que motivó estos números.
- **Bloqueo técnico descubierto durante la investigación**: hoy no existe ningún resultado de partido real en el sistema — el sincronizado con football-data.org descarta explícitamente los partidos ya finalizados y no guarda marcador alguno, y las cuotas (`odds.py`) ya son un cálculo determinista sin datos externos. Para poder implementar la liquidación de las apuestas de partido (`PlacedBet`) contra el saldo de Beths sin depender de datos que no existen, esta spec **simula el resultado de cada partido de forma determinista** (mismo patrón ya usado para las cuotas: una función pura sembrada por `match_id`), en vez de esperar o inventar una integración con resultados reales. Esta decisión fue confirmada explícitamente por el usuario.

## Constitution Alignment *(mandatory)*

- **Simplicity Statement**: Se reutiliza la cuenta y el perfil ya existentes (`AccountProfile`) añadiendo campos, no un servicio de "economía" independiente. El ELO recalculado y las Beths reutilizan el mismo flujo ya existente de liquidación de apuestas (`_settle_due_bets`), sin ningún módulo nuevo dedicado. No se introduce un sistema de pagos reales, ni una fórmula que fusione ELO y Beths, ni un ranking global distinto del ya existente (fuera de alcance).
- **Local-First Confirmation**: Todo el cálculo de ELO, el saldo de Beths, la renta periódica y la simulación de resultados de partido se ejecutan y persisten localmente en el SQLite ya usado por el prototipo; no se introduce ninguna dependencia de red nueva.
- **Stack Confirmation**: Backend en Python (cálculo de ELO, saldo, liquidación simulada); frontend en React con validación en Expo, ya que el saldo de Beths y el ELO se muestran en la pantalla de perfil (superficie móvil ya existente).
- **TDD Mode**: Deferred. Se documentan criterios de aceptación verificables; no se activa el gate red-green-refactor para esta feature.
- **Security Scope (Mock Stage)**: No se maneja dinero real ni datos de pago; las Beths son una moneda de juego puramente local sin valor de cambio. La simulación determinista de resultados de partido es una simplificación explícita del prototipo (ver Clarifications) y debe documentarse como tal, no presentarse como un resultado real.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mi ELO sube o baja según la dificultad, la confianza y el acierto de mis apuestas de partido (Priority: P1)

Como usuario que apuesta en partidos reales, quiero que mi ELO suba cuando acierto una apuesta difícil apostando con confianza y baje cuando fallo una apuesta que el mercado daba por segura, para que mi ELO refleje de verdad mi habilidad prediciendo resultados, no un número fijo que nunca cambia ni la popularidad de mi voto entre mis amigos.

**Why this priority**: Es el núcleo de la idea original ("un ELO como en el ajedrez"), ahora ligado a la dificultad real de una predicción (la cuota del mercado) en vez de al voto de un grupo; sin recálculo dinámico, el campo `elo` sigue siendo un dato decorativo y ninguna otra historia de esta spec tiene sentido.

**Independent Test**: Puede probarse colocando una apuesta con una cuota conocida y un importe de Beths conocido, dejando pasar el tiempo de liquidación, y comprobando que el ELO sube si el resultado simulado coincide con la selección (más cuanto más alta era la cuota y más Beths se apostaron) y baja si no coincide.

**Acceptance Scenarios**:

1. **Given** una apuesta de partido pendiente de liquidar, **When** el resultado simulado coincide con la selección apostada, **Then** el ELO de la cuenta sube; **When** no coincide, **Then** baja.
2. **Given** dos apuestas ganadoras con el mismo importe de Beths pero cuotas distintas, **When** ambas se liquidan, **Then** la de cuota más alta (más difícil, menos probable según el mercado) sube más ELO que la de cuota más baja.
3. **Given** dos apuestas ganadoras con la misma cuota pero importes de Beths distintos, **When** ambas se liquidan, **Then** la de mayor importe sube más ELO que la de menor importe, pero no de forma proporcional lineal (rendimientos decrecientes: doblar el importe apostado nunca dobla la subida de ELO).
4. **Given** una predicción de grupo (`CustomPrediction`) que se resuelve, **When** se consulta el ELO de cualquiera de sus votantes, **Then** no ha cambiado por ese motivo — el ranking de esa predicción sigue siendo el recuento de aciertos del grupo, sin relación con el ELO.
5. **Given** una cuenta que ya ha liquidado 5 apuestas con efecto en el ELO en el día en curso, **When** liquida una sexta apuesta ese mismo día, **Then** esa sexta apuesta se liquida y paga Beths con normalidad, pero no mueve su ELO.
6. **Given** un ELO ya muy bajo tras varias apuestas perdidas, **When** el usuario pierde una apuesta más, **Then** su ELO nunca baja por debajo de un suelo mínimo.

---

### User Story 2 - Tengo un saldo de Beths independiente de mi ELO que uso para apostar en partidos (Priority: P1)

Como usuario, quiero tener un saldo de Beths separado de mi ELO, que se gasta al apostar en partidos reales y se recupera con las ganancias cuando acierto, para poder arriesgar más o menos según cuánta confianza tengo, sin que eso afecte a mi ranking de habilidad.

**Why this priority**: Es la otra mitad del diseño acordado (moneda gastable separada del ranking) y la que da sentido real a las apuestas de partido (`PlacedBet`), que hoy se guardan pero nunca se liquidan.

**Independent Test**: Puede probarse con una cuenta con saldo conocido, colocando una apuesta simple con un importe menor o igual a su saldo, comprobando que el saldo baja en ese importe al colocarla, y comprobando que tras la liquidación (simulada) del partido el saldo sube con la ganancia si acertó o se queda igual si falló.

**Acceptance Scenarios**:

1. **Given** una cuenta con un saldo de Beths conocido, **When** el usuario coloca una apuesta simple o combinada con un importe menor o igual a su saldo, **Then** el saldo se reduce exactamente en ese importe al colocarla.
2. **Given** una cuenta con menos Beths que el importe que intenta apostar, **When** intenta colocar la apuesta, **Then** el sistema la rechaza y el saldo no cambia.
3. **Given** una apuesta ya colocada y el tiempo suficiente para que el partido se considere terminado, **When** el resultado simulado del partido coincide con la selección apostada, **Then** el saldo del usuario aumenta en la ganancia potencial de esa apuesta y su estado pasa a "ganada".
4. **Given** una apuesta ya colocada y el tiempo suficiente para que el partido se considere terminado, **When** el resultado simulado del partido no coincide con la selección apostada, **Then** el saldo no cambia más allá del débito ya aplicado al colocarla y su estado pasa a "perdida".
5. **Given** una apuesta combinada con varias selecciones, **When** se liquida, **Then** solo se considera ganadora si el resultado simulado coincide con todas y cada una de sus selecciones.
6. **Given** que el ELO de un usuario sube o baja por resolver predicciones de grupo, **When** se consulta su saldo de Beths, **Then** el saldo no ha cambiado por ese motivo.

---

### User Story 3 - Recibo una renta periódica de Beths aunque me haya quedado sin saldo (Priority: P2)

Como usuario que ha perdido la mayor parte o todo su saldo apostando, quiero recibir una cantidad fija de Beths de forma periódica, para poder seguir participando sin quedar bloqueado indefinidamente.

**Why this priority**: Sin esto el saldo de Beths podría llegar a cero y dejar al usuario sin poder apostar nunca más; es la garantía de que "nunca hay quiebra real" acordada con el usuario. Depende de que exista ya un saldo (User Story 2) pero no depende de las predicciones de grupo (User Story 1).

**Independent Test**: Puede probarse dejando pasar el periodo de renta configurado (o simulando el paso del tiempo ajustando la fecha del último cobro) y comprobando, al volver a cargar la cuenta, que el saldo ha aumentado exactamente en la cantidad de la renta una sola vez por periodo vencido, sin importar si el saldo actual era alto, bajo o cero.

**Acceptance Scenarios**:

1. **Given** una cuenta cuyo último cobro de renta fue hace más del periodo configurado, **When** el usuario abre sesión o consulta su perfil, **Then** su saldo aumenta en la cantidad fija de la renta y la fecha de último cobro se actualiza a ahora.
2. **Given** una cuenta cuyo último cobro de renta fue hace menos del periodo configurado, **When** el usuario consulta su perfil varias veces, **Then** el saldo no recibe renta adicional hasta que se cumpla el periodo completo.
3. **Given** una cuenta nueva recién creada, **When** se consulta por primera vez, **Then** tiene un saldo inicial de Beths mayor que cero, sin depender todavía de haber recibido ninguna renta.
4. **Given** una cuenta que ha estado varios periodos completos sin cargarse, **When** vuelve a cargarse, **Then** recibe de una sola vez la renta correspondiente a todos los periodos completos transcurridos (no solo uno), y la fecha de último cobro avanza exactamente esos periodos.

---

### User Story 4 - Recibo una recompensa de Beths al alcanzar un nuevo hito de ELO (Priority: P3)

Como usuario, quiero recibir una cantidad de Beths la primera vez que mi ELO cruza hacia arriba un umbral redondo (por ejemplo, cada 100 puntos), para sentir que progresar en el ranking también tiene una recompensa tangible, sin que esto convierta el ELO en la misma cosa que las Beths.

**Why this priority**: Es el punto de conexión ligera entre ambos sistemas pedido explícitamente por el usuario; depende de que el ELO ya sea dinámico (User Story 1) y de que exista el saldo de Beths (User Story 2), por eso va después de ambas.

**Independent Test**: Puede probarse resolviendo predicciones sucesivas hasta que el ELO de un votante cruce un umbral (por ejemplo, de 1780 a 1810 cruzando el hito de 1800), comprobando que su saldo de Beths aumenta en la recompensa configurada exactamente una vez, y que si el ELO vuelve a bajar y a subir sin superar un hito nuevo no se concede una segunda recompensa por el mismo hito.

**Acceptance Scenarios**:

1. **Given** un usuario cuyo ELO está por debajo de un hito redondo, **When** una resolución de predicción hace que su ELO cruce ese hito hacia arriba, **Then** recibe una recompensa fija de Beths asociada a ese hito.
2. **Given** un usuario que ya recibió la recompensa de un hito, **When** su ELO baja por debajo de ese hito y vuelve a subir por encima de él sin alcanzar un hito superior, **Then** no recibe una segunda recompensa por el mismo hito.
3. **Given** una resolución de predicción que hace que el ELO de un usuario cruce varios hitos a la vez (una subida grande), **When** se procesa, **Then** recibe la recompensa correspondiente a cada hito cruzado.
4. **Given** una recompensa de hito recién concedida y aún no vista por el usuario, **When** abre su perfil, **Then** ve un aviso indicando el hito alcanzado y la recompensa recibida, y ese aviso deja de mostrarse después de verlo una vez.

---

### User Story 5 - Elijo cuánto ELO quiero ganar entre las opciones posibles, no escribo un importe de Beths (Priority: P2)

Como usuario, quiero un control simple en el boleto de apuestas -el ELO actual en el centro y un botón "−" y un botón "+" a los lados- para subir o bajar, uno a uno, entre los valores de ELO que realmente puedo ganar según mi saldo actual, en vez de escribir un importe de Beths o elegir entre una pared de botones — porque las Beths son solo la moneda que se cobra para lograrlo, no lo que me importa decidir, y porque tanto un campo de texto libre como una grilla larga de opciones son más ruido del necesario para una decisión que en el fondo es "un poco más o un poco menos" (ver Revisión 2026-07-31 más abajo).

**Why this priority**: Es un cambio de interfaz sobre la fórmula ya existente (User Story 1/FR-001/FR-002b), no una fórmula nueva; depende de que esa fórmula ya exista pero no bloquea ninguna otra historia, por eso es P2.

**Revisión 2026-07-31 (primer intento)**: la primera versión de esta historia usaba un campo de texto libre para el ELO objetivo. Se descartó porque el multiplicador de confianza de la fórmula (FR-002b) está acotado a un rango fijo (`[0.8, 1.5]`), por lo que para una cuota dada existe un ELO mínimo y máximo alcanzable **sin importar cuánto se apueste** por debajo o por encima de cierto punto — cualquier ELO objetivo por debajo del mínimo (ej. pedir 1 o pedir 2 cuando el mínimo real es 13) colapsaba silenciosamente en el mismo importe mínimo de Beths, lo que se percibía como un error.

**Revisión 2026-07-31 (segundo intento)**: se reemplazó el campo de texto por un botón por cada valor de ELO alcanzable (una grilla). Resolvía el problema anterior (ningún valor mostrado es inalcanzable), pero el usuario prefirió una interfaz más simple: un único valor visible con dos botones "más/menos" para moverse entre las mismas opciones alcanzables, un paso a la vez, en vez de ver todas las opciones a la vez.

**Independent Test**: Puede probarse abriendo el boleto con una selección cargada, comprobando que aparece un valor de ELO inicial (el mínimo alcanzable) con sus dos botones, que "+" avanza al siguiente valor alcanzable y "−" retrocede al anterior, que cada valor tiene un importe de Beths distinto, y que los botones se deshabilitan en los extremos del rango.

**Acceptance Scenarios**:

1. **Given** una selección con una cuota conocida y un saldo de Beths conocido, **When** se abre el boleto para esa selección sin ninguna elección previa, **Then** se muestra automáticamente el valor de ELO mínimo alcanzable con ese saldo y esa cuota, con un botón "−" y un botón "+".
2. **Given** el valor de ELO mostrado, **When** el usuario pulsa "+", **Then** el valor avanza al siguiente ELO alcanzable (con su importe de Beths correspondiente); **When** pulsa "−", **Then** retrocede al anterior.
3. **Given** el valor de ELO en su mínimo alcanzable, **When** se muestra el control, **Then** el botón "−" aparece deshabilitado; **Given** el valor en su máximo alcanzable, **Then** el botón "+" aparece deshabilitado.
4. **Given** un valor de ELO mostrado, **When** se muestra el resultado, **Then** también se muestra el ELO que se perdería si la apuesta falla, calculado con la misma fórmula del servidor (User Story 1) para las Beths de ese valor.
5. **Given** dos valores consecutivos del control, **When** se comparan sus importes de Beths, **Then** son siempre importes distintos entre sí (nunca dos pasos del control piden la misma cantidad de Beths).
6. **Given** una cuenta sin Beths suficientes para ninguna apuesta, **When** abre el boleto, **Then** se le indica que no tiene saldo suficiente en vez de mostrar el control.

### Edge Cases

- ¿Qué pasa si una cuenta apuesta con cuotas muy extremas (casi 1.0, o muy altas)? La probabilidad implícita usada por la fórmula se acota a `[0.05, 0.95]`, así que ninguna apuesta puede dar o costar una cantidad ilimitada de ELO por una cuota extrema.
- ¿Qué pasa si una cuenta apuesta el máximo permitido (1000 Beths) repetidamente para maximizar su ELO? El multiplicador de confianza tiene techo en ese importe (no crece más allá), así que apostar más no aporta ninguna ventaja adicional frente a apostar 1000 exactos.
- ¿Qué pasa si una cuenta liquida más de 5 apuestas en un mismo día? Solo las primeras 5 mueven su ELO ese día; el resto se liquida y paga Beths con normalidad.
- ¿Qué pasa si una cuenta existente (creada antes de esta feature) no tiene todavía saldo de Beths guardado? Se le asigna el saldo inicial por defecto la primera vez que se carga tras el despliegue de esta feature, sin perder ningún otro dato de la cuenta.
- ¿Qué pasa si dos apuestas se liquidan a la vez para la misma cuenta? Cada liquidación debe aplicar su propio crédito de forma independiente, sin que una sobrescriba a la otra.
- ¿Qué pasa si el usuario intenta editar manualmente su ELO o su saldo de Beths desde la pantalla de edición de perfil? El sistema ignora cualquier valor de ELO o Beths recibido desde esa pantalla; solo el propio sistema puede modificarlos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST recalcular el ELO de una cuenta al liquidar cada una de sus apuestas de partido, a partir de la probabilidad implícita de la cuota apostada, la cantidad de Beths apostada y si la apuesta se ganó o se perdió.
- **FR-002**: El sistema MUST conceder más ELO por acertar una apuesta de cuota alta (menos probable según el mercado) que por acertar una de cuota baja, y simétricamente perder más ELO por fallar una apuesta de cuota baja (más probable) que por fallar una de cuota alta.
- **FR-002b**: El sistema MUST aplicar un multiplicador de ELO creciente pero con rendimientos decrecientes sobre la cantidad de Beths apostada, con un tope tanto en el multiplicador como en el importe de apuesta individual, de forma que apostar más del importe tope nunca aporte más ELO esperado.
- **FR-003**: El sistema MUST dejar el ELO sin cambios por las predicciones de grupo (crear, votar, resolver o abortar una `CustomPrediction`); su ranking sigue siendo el recuento de aciertos por grupo, sin relación con el ELO.
- **FR-003b**: El sistema MUST limitar a un número fijo configurable las apuestas liquidadas por cuenta y día que mueven el ELO; las apuestas liquidadas por encima de ese límite siguen pagando Beths con normalidad pero no afectan al ELO.
- **FR-004**: El sistema MUST impedir que el ELO de cualquier cuenta baje de un suelo mínimo configurado.
- **FR-005**: El sistema MUST mantener un saldo de Beths por cuenta, independiente del ELO, que ninguna operación de ELO modifica y que ninguna operación de Beths modifica el ELO.
- **FR-006**: El sistema MUST asignar un saldo inicial de Beths mayor que cero a toda cuenta nueva y a toda cuenta existente que aún no tuviera saldo registrado.
- **FR-007**: El sistema MUST descontar del saldo de Beths de una cuenta el importe exacto de cada apuesta que coloca, y MUST rechazar la colocación si el saldo disponible es menor que el importe solicitado.
- **FR-008**: El sistema MUST determinar, de forma determinista y reproducible a partir del identificador del partido, un resultado simulado (local/empate/visitante) para cada partido sobre el que existan apuestas colocadas, una vez transcurrido el tiempo configurado desde la colocación.
- **FR-009**: El sistema MUST liquidar cada apuesta pendiente cuyo partido ya se considere terminado: acreditando la ganancia potencial al saldo de Beths y marcándola como ganada si el resultado simulado coincide con la selección (o con todas las selecciones, si es una combinada), o marcándola como perdida sin acreditar nada en caso contrario.
- **FR-010**: El sistema MUST conceder a toda cuenta activa una cantidad fija de Beths por cada periodo de renta completo transcurrido desde su último cobro, independientemente de su saldo actual, acumulando el crédito de todos los periodos vencidos de una sola vez si han pasado varios sin que la cuenta se cargara (revisado 2026-07-17 — la versión original de este requisito decía explícitamente lo contrario, "sin acumular cobros retroactivos"; se invirtió al pasar de una renta semanal a una continua de 5 minutos, donde limitar a un cobro por lectura habría hecho el saldo real divergir del temporizador mostrado en el cliente).
- **FR-011**: El sistema MUST conceder una recompensa fija de Beths la primera vez que el ELO de una cuenta cruza hacia arriba cada hito configurado, incluyendo conceder varias recompensas de una sola vez si una única actualización de ELO cruza varios hitos.
- **FR-012**: El sistema MUST NOT conceder una segunda recompensa por el mismo hito de ELO si la cuenta baja por debajo de él y vuelve a superarlo sin alcanzar un hito nuevo.
- **FR-013**: El sistema MUST permitir a una cuenta consultar sus recompensas de hito de ELO aún no vistas y marcarlas como vistas.
- **FR-014**: El sistema MUST ignorar cualquier valor de ELO o de saldo de Beths que llegue en una actualización de perfil iniciada por el usuario, conservando siempre el valor calculado por el propio sistema.
- **FR-015**: El boleto de apuestas MUST ofrecer, para cada seleccion, un control de un unico valor de ELO visible a la vez con dos botones ("subir"/"bajar") para moverse entre los valores enteros de ELO efectivamente alcanzables (segun la formula de FR-001/FR-002b) entre el minimo y el maximo que permite el saldo de Beths disponible de la cuenta y la cuota de esa seleccion, en vez de un campo de texto libre o una lista de botones simultaneos.
- **FR-016**: El sistema MUST calcular, para el valor de ELO mostrado en cada momento, el importe minimo de Beths que produce exactamente ese ELO al acertar, y fijarlo como dato de solo lectura, junto con el ELO que se perderia si la apuesta falla.
- **FR-017**: El sistema MUST garantizar que, entre los valores consecutivos que el control permite alcanzar para una misma seleccion, no haya dos que requieran el mismo importe de Beths (colapsar valores de ELO que resultarian en el mismo importe en un unico paso, en vez de dos pasos identicos).
- **FR-018**: El control de ELO del boleto MUST inicializarse en el valor minimo alcanzable la primera vez que se agrega una seleccion (antes de que el usuario pulse nada), y MUST deshabilitar el boton de bajar en el valor minimo y el boton de subir en el valor maximo.

### Key Entities *(include if feature involves data)*

- **Perfil de cuenta (existente, ampliado)**: gana un saldo de Beths, la fecha del último cobro de renta, un contador de apuestas liquidadas que ya movieron el ELO (usado para dar más peso a las primeras, ver FR-002b) más el contador y fecha del tope diario de apuestas que cuentan para ELO, y el hito de ELO más alto ya recompensado.
- **Predicción de grupo (existente)**: sin cambios en su forma ni en su efecto; sigue sin tener ninguna relación con el ELO ni con las Beths.
- **Apuesta de partido (existente)**: gana un estado de liquidación (pendiente/ganada/perdida) y la fecha en la que se liquidó; su liquidación es ahora también el único disparador del recálculo de ELO.
- **Recompensa de hito de ELO (nueva)**: registra qué cuenta alcanzó qué hito, cuántas Beths recibió y si ya la ha visto.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Tras liquidar una apuesta de partido dentro del tope diario de apuestas que cuentan para ELO, el ELO de la cuenta cambia visible e inmediatamente en su perfil, sin necesidad de ninguna acción manual adicional.
- **SC-002**: El 100% de las apuestas de partido colocadas terminan en un estado final (ganada o perdida) sin intervención manual, dentro del tiempo de liquidación configurado.
- **SC-003**: Ninguna cuenta activa permanece más de un periodo de renta completo sin recibir su cobro periódico, incluso si su saldo llegó a cero.
- **SC-004**: El 100% de los cruces de hito de ELO generan exactamente una recompensa por hito, nunca cero ni más de una para el mismo hito.
- **SC-005**: Ningún cambio de ELO modifica el saldo de Beths de la misma cuenta en la misma operación, y ningún cambio de saldo de Beths modifica su ELO, salvo la recompensa de hito descrita.

## Assumptions

- El ELO de partida de las cuentas ya existentes se conserva tal cual (no se resetea a un valor "neutro"); solo empieza a moverse a partir de la próxima apuesta de partido que se liquide.
- La renta periódica, el tope diario de apuestas que cuentan para ELO, el tope de Beths por apuesta y los importes de recompensa por hito son cantidades fijas configurables por el equipo de producto, no ajustables por el usuario.
- El estado "provisional" de una cuenta con pocas apuestas liquidadas (ver `research.md`) es una bandera de presentación para un futuro ranking global visible; esta spec no implementa esa superficie de ranking en sí, solo deja el dato (`elo_bets_settled`) disponible para calcularla.
- La vista previa de ELO en el boleto de apuestas (cuánto ganaría o perdería de ELO antes de confirmar) es una reimplementación en el cliente de la misma fórmula del servidor, no una llamada nueva a la API; no cambia ningún comportamiento del backend, solo lo anticipa visualmente (ver `research.md`, Revisión 2026-07-17 continuación).
- Ampliado (2026-07-31, User Story 5): el boleto ya no tiene ningún campo de texto editable para el importe ni para el ELO, ni una lista de botones simultáneos; el usuario sube/baja de a un valor con un control "−"/"+". El importe de Beths que efectivamente se envía al backend al confirmar sigue siendo exactamente el mismo campo `stake` de siempre (FR-007), solo que ahora se deriva en el cliente invirtiendo la misma fórmula del servidor a partir del valor de ELO seleccionado, en vez de ser tecleado directamente. El contrato del backend (`POST /bets/place`) no cambió.
- El resultado simulado de partido introducido por esta spec (ver Clarifications) es una simplificación explícita del prototipo mientras no exista una fuente real de resultados finales; puede sustituirse por datos reales en una spec futura sin cambiar el resto de este diseño (el saldo de Beths y su liquidación no dependen de cómo se obtenga el resultado, solo de que exista uno).
- El ranking global de la app (hoy con datos de ejemplo, sin conexión con el backend) queda fuera de alcance de esta spec; solo se ven afectados el ELO por cuenta y el ranking ya existente dentro de cada grupo.
- TDD sigue diferido, igual que en el resto del proyecto.
