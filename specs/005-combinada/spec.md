# Feature Specification: Combinada (Apuestas Combinadas)

**Feature Branch**: `[005-combinada]`

**Created**: 2026-07-16

**Status**: Draft

**Input**: User description: "añade e implementa una spec nueva 005 - Combinada que implemente la posibilidad de hacer combinadas de apuestas, quiero que tenga este estilo [captura del boleto de Winamax: panel 'N selecciones', pestañas Simple/Combinada/Sistema, importe, cuotas por partido con tres resultados (Local/Empate/Visitante), ganancias potenciales, boton 'Realizar apuesta']"

**Clarifications (pre-especificación, 2026-07-16)**: Antes de escribir esta especificación se resolvieron tres decisiones de alcance con el usuario, dado que hoy no existe ningún mercado de cuotas real ni colocación de apuestas en el backend (solo una cuota `2.15` fija en el frontend y un listado de selecciones que nunca llega a colocarse):
- La pestaña "Sistema" de la captura se omite por completo; el boleto solo tiene pestañas "Simple" y "Combinada".
- Los partidos exponen únicamente un mercado 1X2 (Local/Empate/Visitante) con cuotas mock deterministas; no se añaden mercados adicionales.
- El importe introducido en el boleto es puramente ilustrativo (sirve solo para calcular la ganancia potencial mostrada); no existe saldo/monedero virtual y no se descuenta de nada, coherente con el principio del producto de "sin la parte de perder dinero".

**Amendment (post-implementation feedback, 2026-07-16)**: "quiero que al hacer una combinada se sumen las cuotas y aparezca la suma en Mi boleto" — la cuota combinada de una apuesta combinada pasa a calcularse como la **suma** de las cuotas de sus selecciones, en lugar del producto usado en la version original de esta spec. Es una simplificación deliberada respecto al calculo real de una casa de apuestas (que siempre multiplica), coherente con que esta feature no maneja dinero real ni saldo: la cuota combinada es un numero ilustrativo para la ganancia potencial, no una cuota de mercado real. Todas las menciones a "producto de las cuotas" en este documento (User Story 2, FR-008, SC-002, Edge Cases) deben leerse como "suma de las cuotas".

**Amendment 2 (post-implementation feedback, 2026-07-16)**: "quiero que cuando elijo una opcion para apostar tenga una especie de animacion cuando va hacia mi boleto" — al elegir un resultado (Local/Empate/Visitante) que se añade al boleto, el sistema MUST mostrar una animación breve y no bloqueante que sugiera que la selección viaja hacia el boleto, y el boleto MUST reaccionar visiblemente (un pequeño rebote) al recibirla. Ver FR-038 y la User Story 1 (Acceptance Scenario 5). Es una micro-interacción puramente decorativa: nunca retrasa ni condiciona que la selección se añada de verdad, y no necesita hacer coincidir su punto de llegada exacto con la posición en pantalla del boleto (que varía entre escritorio y móvil).

**Amendment 3 (post-implementation feedback, 2026-07-16)**: "cuando se borra del boleto tambien quiero como una animacion, como que desaparezca" — al quitar una selección del boleto con el botón "✕", el sistema MUST mostrar una animación breve de desaparición (desvanecido/encogido) antes de que la selección se elimine de verdad del boleto. Ver FR-039 y la User Story 4 (Acceptance Scenario 4). Igual que la animación de llegada, es puramente decorativa: la selección sigue quitándose de forma efectiva, solo que tras una breve transición visual en lugar de desaparecer de golpe. No aplica al vaciado completo del boleto ("Limpiar") ni al vaciado automático tras realizar una apuesta con éxito (FR-015), que siguen siendo inmediatos.

**Amendment 4 (superseded by `006-elo`, 2026-07-17)**: La spec `006-elo` introdujo un saldo gastable (llamado "coins" en esta nota original, renombrado a **Beths** el mismo día — ver `specs/006-elo/research.md`) y una liquidación real de las apuestas de partido, lo que **sustituye** las siguientes afirmaciones de esta spec: el importe del boleto ya **no** es puramente ilustrativo (Clarifications párrafo 3; Constitution Alignment "Simplicity Statement" y "Security Scope"; Assumptions párrafos 2 y 4), y las apuestas realizadas ya **no** se quedan fijas en `"realizada"` para siempre. Desde `006-elo`:
- Colocar una apuesta (simple o combinada) descuenta su importe del saldo de Beths de la cuenta, y se rechaza si el saldo no alcanza (`insufficient beths balance`) o si el importe supera el tope máximo por apuesta (`stake cannot exceed 1000 beths`).
- Cada apuesta se liquida sola un tiempo fijo después de colocarse, contra un resultado de partido simulado de forma determinista (no existe ningún resultado real de partido en el sistema — ver `specs/006-elo/spec.md` Clarifications y `research.md` Decisión 8), pasando su estado de `"realizada"` a `"ganada"` (con crédito de la ganancia potencial al saldo, y una subida de ELO según la cuota y el importe apostados) o `"perdida"` (con una bajada de ELO).
- Todo lo demás de esta spec (mercado 1X2, pestañas Simple/Combinada, cuota combinada como suma, animaciones, ausencia de pestaña "Sistema") sigue vigente sin cambios; ver `specs/006-elo/` para el diseño completo del saldo, la renta continua, el ELO y los hitos, que son ortogonales a esta spec.

## Constitution Alignment *(mandatory)*

- **Simplicity Statement**: Se extiende el boleto ya existente (`BetSlipContext` / panel "Tu boleto") con un mercado 1X2 por partido y con la posibilidad de combinar selecciones de partidos distintos en una única apuesta combinada, reutilizando el mismo patrón de estado pendiente/realizado ya usado en `004-social`. No se introduce sistema de pagos, saldo virtual, motor de liquidación de resultados, pestaña "Sistema" (combinaciones parciales) ni mercados adicionales al 1X2.
- **Local-First Confirmation**: Los mercados, cuotas mock, selecciones del boleto y apuestas realizadas (simples y combinadas) se generan y persisten en el entorno local del prototipo; no se asume ningún servicio de pagos ni sincronización externa.
- **Stack Confirmation**: Backend en Python para generar cuotas mock y persistir apuestas realizadas; frontend en React con validación en Expo obligatoria, ya que el boleto de apuestas es una superficie central de la app tanto en web (panel lateral "Tu boleto") como en móvil.
- **TDD Mode**: Deferred. Se documentan criterios de aceptación verificables; no se activa el gate red-green-refactor para esta feature.
- **Security Scope (Mock Stage)**: No se maneja dinero real, saldo, ni datos de pago; los importes son ilustrativos y sin consecuencia económica. Queda diferida cualquier liquidación de resultados reales, límites de apuesta responsable y prevención de abuso (creación masiva de apuestas).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Realizar una apuesta simple con cuota real (Priority: P1)

Como usuario quiero elegir uno de los tres resultados (Local, Empate, Visitante) de un partido, ver su cuota real, introducir un importe, ver la ganancia potencial y realizar la apuesta, para poder jugar una predicción individual con datos reales en lugar de una cuota decorativa.

**Why this priority**: Es el cimiento de todo el boleto: sin un mercado 1X2 real, sin importe y sin ganancia potencial calculada no existe ninguna cuota que combinar en el resto de historias.

**Independent Test**: Puede probarse abriendo un partido, seleccionando uno de sus tres resultados, comprobando que aparece en el boleto con su cuota real, introduciendo un importe, verificando que la ganancia potencial mostrada es importe × cuota, pulsando "Realizar apuesta" y comprobando que la apuesta aparece en "Mis apuestas" como una apuesta simple realizada.

**Acceptance Scenarios**:

1. **Given** un partido con su mercado 1X2 visible, **When** el usuario selecciona uno de los tres resultados (Local, Empate o Visitante), **Then** esa selección se añade al boleto mostrando el partido, el resultado elegido y su cuota real.
2. **Given** una única selección en el boleto, **When** el usuario introduce un importe válido, **Then** el boleto muestra la ganancia potencial calculada como importe × cuota de la selección.
3. **Given** una selección y un importe válido en el boleto, **When** el usuario pulsa "Realizar apuesta", **Then** se crea una apuesta simple realizada asociada a su cuenta y el boleto queda vacío.
4. **Given** una apuesta simple ya realizada, **When** el usuario abre "Mis apuestas", **Then** ve esa apuesta con el partido, el resultado elegido, la cuota, el importe y la ganancia potencial.
5. **Given** un partido con su mercado 1X2 visible, **When** el usuario selecciona uno de los tres resultados y esa selección se añade al boleto, **Then** el sistema muestra una animación breve que sugiere que la selección viaja hacia el boleto, y el boleto reacciona visiblemente al recibirla, sin retrasar ni bloquear que la selección quede añadida.

---

### User Story 2 - Construir y realizar una apuesta combinada (Priority: P1)

Como usuario quiero añadir selecciones de dos o más partidos distintos al boleto y ver que se habilita automáticamente una pestaña "Combinada" con la cuota combinada (la suma de las cuotas de cada selección) y la ganancia potencial correspondiente, para poder jugar varias predicciones a la vez con una cuota combinada mayor.

**Why this priority**: Es el propósito central de esta especificación; sin la posibilidad de combinar selecciones de distintos partidos en una única apuesta, el boleto seguiría siendo solo apuestas simples.

**Independent Test**: Puede probarse añadiendo selecciones de dos partidos distintos al boleto, comprobando que aparece la pestaña "Combinada" junto a "Simple", que la cuota combinada mostrada es la suma de las cuotas de ambas selecciones, introduciendo un importe, verificando la ganancia potencial (importe × cuota combinada), realizando la apuesta y comprobando que aparece en "Mis apuestas" como una única apuesta combinada con el desglose de sus selecciones.

**Acceptance Scenarios**:

1. **Given** una selección ya en el boleto, **When** el usuario añade una segunda selección de un partido distinto, **Then** el boleto muestra automáticamente la pestaña "Combinada" además de "Simple".
2. **Given** dos o más selecciones de partidos distintos en el boleto con la pestaña "Combinada" activa, **When** se muestra el boleto, **Then** la cuota combinada mostrada es la suma exacta de las cuotas de todas las selecciones.
3. **Given** la pestaña "Combinada" activa con un importe válido introducido, **When** el usuario pulsa "Realizar apuesta", **Then** se crea una única apuesta combinada con todas las selecciones, su cuota combinada, el importe y la ganancia potencial, y el boleto queda vacío.
4. **Given** una apuesta combinada ya realizada, **When** el usuario abre su detalle en "Mis apuestas", **Then** ve cada selección individual (partido, resultado, cuota) junto con la cuota combinada total, el importe y la ganancia potencial.

---

### User Story 3 - Elegir entre apostar en Simple o en Combinada con varias selecciones (Priority: P2)

Como usuario con dos o más selecciones en el boleto quiero poder elegir la pestaña "Simple" para apostar cada selección por separado con su propio importe, o la pestaña "Combinada" para apostarlas todas juntas en una única apuesta, para decidir cómo repartir mi apuesta según cada selección.

**Why this priority**: Añade flexibilidad real al boleto una vez existen ambas modalidades (User Story 1 y 2), pero no es imprescindible para que cada modalidad funcione de forma aislada.

**Independent Test**: Puede probarse con tres selecciones en el boleto, introduciendo un importe distinto para cada una en la pestaña "Simple", pulsando "Realizar apuesta" y comprobando que se crean tres apuestas simples independientes; alternativamente, cambiando a la pestaña "Combinada" con un único importe y comprobando que se crea una sola apuesta combinada con las tres selecciones.

**Acceptance Scenarios**:

1. **Given** dos o más selecciones en el boleto y la pestaña "Simple" activa, **When** el usuario introduce un importe para cada selección de forma independiente, **Then** cada selección muestra su propia ganancia potencial calculada con su propio importe.
2. **Given** la pestaña "Simple" activa con importes válidos en todas las selecciones, **When** el usuario pulsa "Realizar apuesta", **Then** se crea una apuesta simple independiente por cada selección, cada una con su propio importe, cuota y ganancia potencial.
3. **Given** dos o más selecciones en el boleto, **When** el usuario cambia entre la pestaña "Simple" y la pestaña "Combinada", **Then** el boleto conserva las mismas selecciones y solo cambia la forma de agruparlas y de calcular la ganancia potencial.

---

### User Story 4 - Quitar selecciones del boleto y ver el recálculo automático (Priority: P2)

Como usuario quiero poder quitar una selección del boleto y ver que la cuota combinada y las ganancias potenciales se recalculan automáticamente, para poder ajustar mi apuesta antes de realizarla.

**Why this priority**: Es una acción de edición básica y esperable sobre el boleto ya construido en las historias anteriores; mejora la usabilidad pero no bloquea la creación ni la colocación de apuestas.

**Independent Test**: Puede probarse con tres selecciones y la pestaña "Combinada" activa, quitando una selección y comprobando que la cuota combinada pasa a ser la suma de las dos restantes; quitando una segunda selección debe comprobarse que el boleto vuelve automáticamente a mostrar solo la pestaña "Simple".

**Acceptance Scenarios**:

1. **Given** tres selecciones en el boleto con la pestaña "Combinada" activa, **When** el usuario quita una selección, **Then** la cuota combinada y la ganancia potencial mostradas se recalculan usando únicamente las selecciones restantes.
2. **Given** dos selecciones en el boleto con la pestaña "Combinada" activa, **When** el usuario quita una de ellas y queda una única selección, **Then** el boleto oculta la pestaña "Combinada" y muestra únicamamente la pestaña "Simple" para la selección restante.
3. **Given** una única selección en el boleto, **When** el usuario la quita, **Then** el boleto queda vacío y sin ninguna pestaña de apuesta disponible.
4. **Given** una selección en el boleto, **When** el usuario pulsa quitarla, **Then** el sistema muestra una animación breve de desaparición sobre esa selección antes de eliminarla de verdad del boleto.

---

### User Story 5 - Impedir combinar dos selecciones del mismo partido (Priority: P2)

Como usuario quiero que el sistema me impida tener dos selecciones del mismo partido a la vez en el boleto, para que la cuota combinada nunca mezcle dos resultados incompatibles del mismo evento.

**Why this priority**: Protege la integridad de la cuota combinada calculada en la User Story 2; sin esta restricción la cuota combinada podría sumar dos resultados mutuamente excluyentes del mismo partido.

**Independent Test**: Puede probarse seleccionando un resultado de un partido, seleccionando después un resultado distinto del mismo partido, y comprobando que la selección anterior de ese partido se sustituye por la nueva en lugar de añadirse una segunda entrada del mismo partido.

**Acceptance Scenarios**:

1. **Given** una selección de un partido ya en el boleto, **When** el usuario selecciona un resultado distinto del mismo partido, **Then** la selección anterior de ese partido se sustituye por la nueva y el boleto sigue teniendo una única entrada para ese partido.
2. **Given** una selección de un partido ya en el boleto, **When** el usuario selecciona el mismo resultado que ya tenía elegido, **Then** esa selección se quita del boleto.

---

### User Story 6 - Gestionar el boleto también desde el móvil (Priority: P2)

Como usuario en la app móvil quiero poder abrir, revisar y confirmar mi boleto (simple o combinada) igual que en el panel lateral de escritorio, para poder apostar sin depender de una pantalla grande.

**Why this priority**: El panel "Tu boleto" actual solo es visible en anchos de escritorio; sin un acceso equivalente en móvil, las User Stories 1 a 5 no serían usables para la mayoría de sesiones móviles.

**Independent Test**: Puede probarse en un dispositivo o simulador móvil (Expo) añadiendo selecciones desde la lista de partidos, abriendo el acceso al boleto, comprobando que muestra las mismas selecciones, pestañas, cuota combinada e importe que en escritorio, y confirmando que "Realizar apuesta" funciona igual.

**Acceptance Scenarios**:

1. **Given** el usuario añade una o más selecciones desde un dispositivo móvil, **When** abre el acceso al boleto, **Then** ve las mismas selecciones, cuotas, pestañas disponibles (Simple/Combinada) e importe que mostraría el panel de escritorio.
2. **Given** el boleto abierto en móvil con selecciones válidas y un importe introducido, **When** el usuario pulsa "Realizar apuesta", **Then** la apuesta se crea igual que en escritorio y el acceso al boleto vuelve a su estado vacío.

---

### User Story 7 - Consultar el historial de "Mis apuestas" (Priority: P3)

Como usuario quiero abrir una pantalla "Mis apuestas" donde ver todas mis apuestas realizadas, simples y combinadas, con su detalle completo, para poder repasar lo que he jugado.

**Why this priority**: Es una vista de consulta que aporta valor una vez existen apuestas realizadas (User Story 1 y 2); no bloquea la creación ni la colocación de apuestas, pero completa la experiencia de boleto.

**Independent Test**: Puede probarse realizando una apuesta simple y una combinada, abriendo "Mis apuestas" y comprobando que ambas aparecen listadas, cada una con su tipo, importe, cuota (o cuota combinada) y ganancia potencial, y que el detalle de la combinada muestra cada selección individual.

**Acceptance Scenarios**:

1. **Given** una o más apuestas realizadas por el usuario, **When** abre "Mis apuestas", **Then** ve una lista con todas ellas, indicando si cada una es simple o combinada.
2. **Given** una apuesta combinada en la lista, **When** el usuario abre su detalle, **Then** ve cada selección individual (partido, resultado, cuota) además de la cuota combinada, el importe y la ganancia potencial totales.
3. **Given** ninguna apuesta realizada todavía, **When** el usuario abre "Mis apuestas", **Then** ve un estado vacío claro que invita a apostar desde los partidos.

---

### User Story 8 - Usar importes rápidos preestablecidos (Priority: P3)

Como usuario quiero poder pulsar un importe rápido preestablecido (por ejemplo 2€, 5€, 10€ o 20€) en lugar de escribirlo manualmente, para rellenar el importe de mi apuesta más rápido.

**Why this priority**: Es una mejora de usabilidad menor sobre el campo de importe ya definido en las historias anteriores; no aporta ninguna capacidad nueva de apostar.

**Independent Test**: Puede probarse con una selección en el boleto, pulsando uno de los botones de importe rápido y comprobando que el campo de importe y la ganancia potencial se actualizan al valor pulsado.

**Acceptance Scenarios**:

1. **Given** una selección en el boleto, **When** el usuario pulsa un botón de importe rápido, **Then** el campo de importe se rellena con ese valor y la ganancia potencial se recalcula.
2. **Given** un importe rápido ya aplicado, **When** el usuario edita manualmente el campo de importe, **Then** el valor manual sustituye al importe rápido sin restricciones adicionales.

---

### Edge Cases

- Qué ocurre si el usuario intenta ver la pestaña "Combinada" teniendo solo una selección en el boleto (no debe estar disponible).
- Qué ocurre si el usuario intenta añadir una segunda selección del mismo partido (debe sustituir a la anterior, ver User Story 5).
- Qué ocurre si, entre añadir una selección al boleto y pulsar "Realizar apuesta", el partido de esa selección ya ha comenzado o finalizado (la apuesta para esa selección debe rechazarse con un mensaje claro, sin colocar ninguna apuesta parcial).
- Qué ocurre si el usuario introduce un importe igual a cero, negativo o no numérico (el sistema debe rechazarlo e impedir realizar la apuesta hasta introducir un importe válido).
- Qué ocurre si el usuario pulsa "Realizar apuesta" en la pestaña "Simple" con varias selecciones pero deja el importe vacío en alguna de ellas (esa selección concreta debe rechazarse sin impedir que el resto se realicen, o bien rechazar toda la acción con un mensaje claro; ver FR-018).
- Qué ocurre si el usuario quita todas las selecciones del boleto estando en la pestaña "Combinada" (el boleto debe quedar vacío sin ninguna pestaña disponible).
- Qué ocurre si el usuario no ha iniciado sesión e intenta realizar una apuesta (debe rechazarse y pedirse iniciar sesión).
- Cómo se comporta el boleto en móvil cuando no hay espacio para un panel lateral persistente (debe existir un acceso equivalente, ver User Story 6).
- Qué ocurre si el usuario selecciona varias veces muy rápido seguido (cada selección añadida debe añadirse igualmente aunque la animación de una selección anterior todavía esté en curso; la animación es decorativa y nunca bloquea la interacción).
- Qué ocurre si dos selecciones de partidos distintos tienen exactamente la misma cuota (la cuota combinada debe seguir siendo la suma exacta de ambas).
- Cómo se muestra en el historial una apuesta combinada cuyo partido ya ha finalizado después de haberse realizado la apuesta (el historial conserva las selecciones, cuotas e importe tal como se realizó la apuesta, sin resolución de resultado en esta fase).
- Qué ocurre si el usuario intenta seleccionar un resultado de un partido que ya no está disponible para apostar (partido iniciado o finalizado): la interfaz no debe permitir añadirlo al boleto.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST exponer, para cada partido mostrado en la app, un mercado de resultado con exactamente tres opciones (Local, Empate, Visitante), cada una con su propia cuota.
- **FR-002**: System MUST generar las cuotas del mercado 1X2 de forma mock y determinista por partido, de modo que la misma cuota se muestre de forma consistente mientras el partido no cambie de estado.
- **FR-003**: Users MUST poder seleccionar uno de los tres resultados de un partido para añadirlo como selección al boleto, mostrando el partido, el resultado elegido y su cuota.
- **FR-004**: System MUST impedir tener más de una selección activa del mismo partido en el boleto a la vez; elegir un resultado distinto del mismo partido MUST sustituir la selección anterior de ese partido (User Story 5).
- **FR-005**: System MUST quitar del boleto una selección si el usuario vuelve a pulsar el mismo resultado que ya tenía elegido para ese partido.
- **FR-006**: System MUST mostrar la pestaña "Simple" siempre que exista al menos una selección en el boleto.
- **FR-007**: System MUST mostrar automáticamente la pestaña "Combinada" únicamente cuando existan dos o más selecciones de partidos distintos en el boleto, y MUST ocultarla de nuevo si el número de selecciones baja de dos.
- **FR-008**: System MUST calcular la cuota combinada como la suma exacta de las cuotas de todas las selecciones presentes en el boleto.
- **FR-009**: Users MUST poder introducir un importe numérico para calcular la ganancia potencial de una apuesta simple o combinada, como importe × cuota (o cuota combinada).
- **FR-010**: System MUST rechazar importes iguales o menores que cero, o no numéricos, impidiendo realizar la apuesta hasta que se corrija.
- **FR-011**: System MUST ofrecer al menos cuatro importes rápidos preestablecidos (2€, 5€, 10€, 20€) que rellenen el campo de importe al pulsarlos, permitiendo su edición manual posterior.
- **FR-012**: Users MUST poder, con la pestaña "Simple" activa y dos o más selecciones en el boleto, introducir un importe independiente para cada selección.
- **FR-013**: System MUST, al confirmar la pestaña "Simple" con varias selecciones, crear una apuesta simple independiente por cada selección con importe válido, cada una con su propia cuota, importe y ganancia potencial.
- **FR-014**: System MUST, al confirmar la pestaña "Combinada", crear una única apuesta combinada que agrupe todas las selecciones del boleto junto con la cuota combinada, el importe introducido y la ganancia potencial resultante.
- **FR-015**: System MUST vaciar el boleto tras realizar una apuesta (simple o combinada) con éxito.
- **FR-016**: System MUST rechazar la acción de realizar una apuesta si el usuario no tiene una sesión activa.
- **FR-017**: System MUST recalcular, en el momento de realizar la apuesta, la cuota (o cuota combinada) usando las cuotas vigentes de cada partido en el servidor, sin confiar en las cuotas que el cliente tuviera guardadas al construir el boleto.
- **FR-018**: System MUST rechazar la colocación de una apuesta (simple o combinada) si alguna de sus selecciones corresponde a un partido cuyo estado ya no admite apuestas (partido iniciado o finalizado), informando con un mensaje claro de qué selección la bloquea.
- **FR-019**: System MUST persistir cada apuesta realizada (simple o combinada) asociada a la cuenta que la realizó, de forma restaurable tras un nuevo inicio de sesión de esa cuenta.
- **FR-020**: System MUST registrar en cada apuesta combinada realizada el desglose completo de sus selecciones (partido, resultado elegido, cuota de esa selección en el momento de realizar la apuesta).
- **FR-021**: System MUST exponer una pantalla "Mis apuestas" donde el usuario vea todas sus apuestas realizadas, indicando para cada una si es simple o combinada, su importe y su ganancia potencial.
- **FR-022**: System MUST mostrar, para cada apuesta combinada listada en "Mis apuestas", el detalle de sus selecciones individuales junto con la cuota combinada total.
- **FR-023**: System MUST mostrar un estado vacío claro en "Mis apuestas" cuando el usuario todavía no ha realizado ninguna apuesta.
- **FR-024**: System MUST recalcular y mostrar la cuota combinada y la ganancia potencial de forma inmediata cada vez que se añade o quita una selección del boleto mientras la pestaña "Combinada" está activa.
- **FR-025**: Users MUST poder quitar cualquier selección individual del boleto en cualquier momento antes de realizar la apuesta.
- **FR-026**: System MUST ofrecer, en la aplicación móvil, un acceso al boleto equivalente en selecciones, pestañas, cuotas, importe y acción de realizar apuesta al panel "Tu boleto" ya existente en escritorio.
- **FR-027**: System MUST ocultar la interfaz de selección de un resultado de partido (o marcarla como no disponible) cuando ese partido ya no admite apuestas (iniciado o finalizado).
- **FR-038**: System MUST mostrar una animación breve y no bloqueante al añadir una nueva selección al boleto, que sugiera visualmente que viaja hacia el boleto, y el boleto MUST reaccionar de forma visible al recibirla; esta animación MUST NOT retrasar, condicionar ni bloquear que la selección quede añadida de verdad, y no aplica cuando una selección existente se sustituye por otro resultado del mismo partido o se elimina (FR-004, FR-005).
- **FR-039**: System MUST mostrar una animación breve de desaparición sobre una selección del boleto cuando el usuario la quita individualmente, antes de eliminarla de verdad del boleto; esta animación MUST NOT bloquear ni retrasar el resto de interacciones del boleto, y no se aplica al vaciado completo del boleto (Limpiar) ni al vaciado automático tras realizar una apuesta con éxito (FR-015).

### Key Entities *(include if feature involves data)*

- **MockMatch** *(extiende la entidad ya existente de `003-datos-mock`)*: además de sus campos actuales (equipos, competición, hora, estado), incorpora un mercado 1X2 con tres cuotas mock (local, empate, visitante), generadas de forma determinista y estables mientras el partido conserve el mismo estado. Un partido deja de admitir nuevas selecciones o apuestas cuando su estado pasa a iniciado o finalizado.
- **BetSelection** *(extiende el registro de boleto ya existente, `BetRecord`/`bets` de `002-base-de-datos`)*: una entrada del boleto en construcción, referida a un `MockMatch` concreto, con el resultado elegido (local, empate o visitante) y la cuota de ese resultado en el momento de añadirla. Como máximo una `BetSelection` activa por partido y por cuenta.
- **PlacedBet**: una apuesta ya realizada por una cuenta, de tipo simple o combinada. Incluye importe, cuota (o cuota combinada), ganancia potencial calculada, fecha de realización y estado fijo "realizada" (sin resolución de resultado en esta fase). Pertenece a exactamente una cuenta.
- **PlacedBetSelection**: cada selección que compone una `PlacedBet`; guarda una referencia al partido, el resultado elegido y la cuota de esa selección en el momento de realizar la apuesta, de forma que el historial no cambie aunque la cuota mock del partido se regenere más adelante. Una `PlacedBet` simple tiene exactamente una `PlacedBetSelection`; una combinada tiene dos o más, cada una de un partido distinto.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las apuestas simples realizadas muestra una ganancia potencial igual a importe × cuota con precisión de dos decimales.
- **SC-002**: El 100% de las apuestas combinadas realizadas muestra una cuota combinada igual a la suma exacta de las cuotas de todas sus selecciones, con precisión de dos decimales.
- **SC-003**: La pestaña "Combinada" aparece y desaparece correctamente el 100% de las veces según el número de partidos distintos seleccionados (visible solo con dos o más).
- **SC-004**: El 100% de los intentos de apostar con importe inválido (cero, negativo o no numérico) es rechazado con retroalimentación clara.
- **SC-005**: El 100% de los intentos de combinar dos selecciones del mismo partido resulta en la sustitución de la selección anterior, sin duplicados en el boleto.
- **SC-006**: El 100% de las apuestas realizadas (simples y combinadas) es visible en "Mis apuestas" inmediatamente después de realizarse, con su detalle completo.
- **SC-007**: El 100% de los intentos de realizar una apuesta sobre un partido ya iniciado o finalizado es rechazado antes de persistir ninguna apuesta.
- **SC-008**: El boleto y la acción de realizar una apuesta funcionan de forma equivalente en escritorio y en móvil (Expo) para el 100% de los flujos descritos en las User Stories 1 a 5.

## Assumptions

- El mercado 1X2 y la posibilidad de apostar (Simple y Combinada) aplican a los partidos de fútbol respaldados por el backend (los que ya tienen un identificador y un estado reales, provenientes de `003-datos-mock`). Los eventos mock de otros deportes que hoy son solo datos estáticos del frontend, sin partido de backend asociado, quedan fuera de esta fase y conservan su interacción actual hasta que tengan su propio partido de backend.
- El importe introducido en el boleto es puramente ilustrativo: no existe saldo o monedero virtual por cuenta, no se descuenta de ningún balance, y su único efecto es calcular y mostrar la ganancia potencial. Esto es consistente con el principio del producto de competir sin perder dinero real.
- No se implementa la pestaña "Sistema" (combinaciones parciales de N de M selecciones) ni ningún mercado de apuesta adicional al 1X2 en esta fase.
- No se implementa liquidación ni resolución de apuestas contra resultados reales de los partidos; toda apuesta realizada queda con estado fijo "realizada" y conserva sus datos (selecciones, cuotas, importe) tal como se registró en el momento de apostar, aunque el partido asociado finalice después.
- Las cuotas del mercado 1X2 son generadas mock de forma determinista (no provienen de una fuente de datos de cuotas reales) y permanecen estables mientras el partido no cambie de estado; no se contempla movimiento de cuotas en directo.
- Un partido deja de admitir nuevas selecciones o la colocación de apuestas sobre selecciones ya añadidas en cuanto su estado indica que ya ha comenzado o finalizado.
- La validación en Expo se centra en que el acceso al boleto (selecciones, pestañas Simple/Combinada, importe, ganancias potenciales y "Realizar apuesta") y la pantalla "Mis apuestas" sean usables en móvil; no se asumen gestos o componentes nativos adicionales más allá de los ya usados en el resto de la app.
- TDD permanece diferido para esta feature según la constitución vigente.
