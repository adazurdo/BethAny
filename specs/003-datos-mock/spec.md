# Feature Specification: Datos Mock Desde Fuente Externa

**Feature Branch**: `[003-datos-mock]`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "me gustaria que cogieras info de esta pagina para haacer los mocks aleatorios. crea una nueva spec que se llame datos o algo asi y que defina q el sistema coja los datos asi: football-data.org (gratis) para equipos, escudos, estadios, plantillas, clasificacion y partidos por competicion"

## Constitution Alignment *(mandatory)*

- **Simplicity Statement**: Se define un flujo unico de datos: obtener catalogos de competicion desde una fuente deportiva externa y generar mocks aleatorios para UI. Ampliado (2026-07-31): se admite un segundo proveedor (PandaScore, para esports) bajo el mismo flujo normalizado, sin introducir logica de negocio distinta por proveedor mas alla del mapeo de datos crudos.
- **Local-First Confirmation**: El sistema debe ejecutarse y persistir resultados en entorno local; cualquier consumo externo se limita a obtener datos base y luego operar localmente con snapshots.
- **Stack Confirmation**: Se mantiene el stack Python para capa de datos/backend y React + Expo para frontend; las vistas de partidos mock deben validarse tambien en Expo cuando afecten flujos moviles.
- **TDD Mode**: Deferred. Se documentan criterios verificables y validacion funcional sin activar gate de red-green-refactor.
- **Security Scope (Mock Stage)**: No se incorporan secretos productivos ni datos personales; la seguridad avanzada de integraciones externas (hardening, rate-limit defense, key rotation) queda diferida.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generar mocks desde competicion real (Priority: P1)

Como persona de producto quiero que el sistema tome datos de competiciones de futbol desde la fuente acordada para generar partidos mock que se sientan reales.

**Why this priority**: Es la base de valor de la feature; sin datos de origen no existe mejora en realismo de los mocks.

**Independent Test**: Puede probarse ejecutando una carga de una competicion y verificando que el catalogo de equipos y partidos mock resultante se crea con datos visibles en la app.

**Acceptance Scenarios**:

1. **Given** una competicion habilitada para carga, **When** se solicita generar datos mock, **Then** el sistema crea un conjunto de partidos mock basado en equipos de esa competicion.
2. **Given** una competicion con metadatos parciales, **When** se genera el mock, **Then** el sistema conserva el dataset y completa campos faltantes con valores por defecto coherentes.

---

### User Story 2 - Navegar por secciones de competicion con datos mock (Priority: P2)

Como usuario quiero abrir una seccion de competicion desde el panel lateral y ver partidos mock correspondientes para cada competicion disponible.

**Why this priority**: Entrega valor visible inmediato en interfaz y valida que la carga de datos alimenta correctamente la experiencia de exploracion.

**Independent Test**: Puede probarse navegando entre secciones de competicion y confirmando que cada una muestra su propio listado de partidos mock.

**Acceptance Scenarios**:

1. **Given** datos mock disponibles para varias competiciones, **When** el usuario cambia de seccion, **Then** se muestran solo los partidos de la competicion seleccionada.
2. **Given** una competicion sin datos mock, **When** el usuario entra a esa seccion, **Then** se muestra un estado vacio claro con accion sugerida.

---

### User Story 3 - Mantener continuidad cuando la fuente no responde (Priority: P3)

Como usuario quiero que la app siga mostrando datos mock recientes aunque la fuente externa no este disponible temporalmente.

**Why this priority**: Protege la continuidad del producto y evita una experiencia rota por dependencias externas.

**Independent Test**: Puede probarse simulando indisponibilidad de la fuente y verificando que se mantiene el ultimo dataset valido.

**Acceptance Scenarios**:

1. **Given** un snapshot local valido previo, **When** falla una actualizacion de datos, **Then** el sistema mantiene visible el ultimo dataset valido y registra el fallo.

---

### User Story 4 - Explorar esports por proveedor PandaScore (Priority: P2)

Como usuario quiero ver competiciones de esports (CS2, League of Legends, Dota 2, Valorant) con datos reales de equipos y partidos, igual que las competiciones de futbol, para poder explorar y apostar en ambos tipos de deporte desde el mismo panel.

**Why this priority**: Duplica el valor de la feature original a una segunda categoria deportiva sin romper el modelo de datos existente.

**Independent Test**: Puede probarse sincronizando una competicion de esports configurada y verificando que sus equipos y proximos partidos aparecen con datos reales (no sinteticos) en la seccion correspondiente.

**Acceptance Scenarios**:

1. **Given** una competicion de esports habilitada (proveedor PandaScore), **When** se sincroniza, **Then** el sistema obtiene equipos y proximos partidos reales de PandaScore y los normaliza al mismo modelo (`TeamSnapshot`/`MockMatch`) que usan las competiciones de futbol.
2. **Given** un equipo que participa en un proximo partido pero no aparece en el catalogo generico de equipos que devuelve la fuente, **When** se normalizan los datos, **Then** el sistema toma el escudo y nombre del propio partido (dato ya embebido por PandaScore en cada enfrentamiento) para que ese equipo no quede sin escudo.
3. **Given** un partido cuyos rivales aun no estan determinados (fase de clasificacion pendiente), **When** se muestra en la interfaz, **Then** el equipo pendiente se etiqueta como "TBD" (no con un nombre en espanol que rompa la iniciales/abreviatura mostradas en el escudo placeholder).

---

### User Story 5 - Navegar competiciones agrupadas por deporte en el panel lateral (Priority: P2)

Como usuario quiero que el panel lateral agrupe las competiciones por deporte (con icono propio, ej. futbol y esports) en categorias que puedo expandir/contraer, y poder buscar por nombre de deporte o competicion, para encontrar rapido donde apostar sin desplazarme por una lista plana.

**Why this priority**: Con multiples proveedores/deportes activos (User Story 4), una lista plana de competiciones deja de ser navegable; agrupar es necesario para que el panel siga siendo usable.

**Independent Test**: Puede probarse abriendo el panel lateral con competiciones de mas de un deporte cargadas, expandiendo/contrayendo cada categoria y escribiendo un texto de busqueda para verificar el filtrado en vivo.

**Acceptance Scenarios**:

1. **Given** competiciones de futbol y esports disponibles, **When** se abre el panel lateral, **Then** se muestran agrupadas por deporte, cada grupo con su propio icono y encabezado.
2. **Given** un grupo de deporte expandido, **When** el usuario pulsa su encabezado, **Then** el grupo se contrae (y viceversa), sin afectar el estado de los demas grupos.
3. **Given** texto ingresado en el buscador, **When** coincide con el nombre de una competicion o de un deporte, **Then** solo se muestran los grupos/competiciones que coinciden, expandidos automaticamente.
4. **Given** un panel con todas las categorias expandidas y mas contenido del que cabe en el alto visible, **When** el usuario intenta ver las competiciones inferiores, **Then** el panel permite hacer scroll interno sin desbordar el layout de la pagina.

---

### User Story 7 - Icono oficial por competicion y sub-navegacion por liga dentro de cada juego (Priority: P2)

Como usuario quiero que cada competicion en el panel lateral muestre su icono oficial (escudo de LaLiga/Champions/Mundial, logo del videojuego para esports), y que dentro de cada juego de esports pueda desplegar las ligas especificas con partidos reales (ej. dentro de League of Legends: LEC, LCK, LPL) para llegar directo a la liga que me interesa.

**Why this priority**: Un logo real por fila hace el panel reconocible de un vistazo; la sub-navegacion por liga evita que "League of Legends" sea una bolsa mixta de decenas de ligas distintas cuando el usuario solo quiere ver una.

**Independent Test**: Puede probarse sincronizando un juego de esports con partidos de mas de una liga, expandiendo su fila en el panel lateral, y verificando que aparecen solo las ligas con partidos reales actuales, cada una con su propio icono; al elegir una liga, la pantalla de partidos muestra solo los de esa liga.

**Acceptance Scenarios**:

1. **Given** una competicion de futbol sincronizada, **When** se muestra su fila en el panel lateral, **Then** se ve el escudo real de la competicion (emblema de football-data.org) en vez de un icono generico.
2. **Given** una competicion de esports (CS2, LoL, Dota 2, Valorant), **When** se muestra su fila en el panel lateral, **Then** se ve el logo oficial del juego (fuente real cuando el proveedor lo expone; de lo contrario un asset oficial verificado, ver Assumptions).
3. **Given** una fila de esports con su flecha de expansion pulsada por primera vez, **When** el sistema no tiene aun las ligas de esa competicion en cache, **Then** se consulta el ultimo snapshot de partidos de esa competicion y se listan las ligas distintas presentes en partidos reales, cada una con su propio icono cuando la fuente lo provee.
4. **Given** una lista de ligas ya cargada en cache para una competicion, **When** el usuario vuelve a expandir esa fila, **Then** no se repite la consulta de partidos (se reutiliza la cache).
5. **Given** el usuario selecciona una liga especifica (ej. "LEC"), **When** navega a la pantalla de partidos, **Then** solo se muestran los partidos de esa liga dentro de la competicion, no los de las demas ligas del mismo juego.

---

### User Story 8 - Veo con claridad cuando un partido esta en curso (Priority: P2)

Como usuario quiero que un partido que se esta jugando en este momento se distinga claramente, tanto en la pantalla de partidos (donde se apuesta) como en Mis apuestas, para saber que ya no puedo apostar en el y por que.

**Why this priority**: Sin esta señal, un partido en curso solo se ve como "cuotas deshabilitadas" sin explicacion visible; es una mejora de claridad sobre datos que la fuente ya provee, no una fuente de datos nueva.

**Independent Test**: Puede probarse sincronizando una competicion de esports con partidos en curso (PandaScore expone estos por separado de los proximos) y verificando que aparecen en la lista de partidos con una etiqueta "EN VIVO" visible, y que si hay una apuesta pendiente sobre ese partido, Mis apuestas muestra la misma etiqueta junto a esa apuesta.

**Acceptance Scenarios**:

1. **Given** un partido de esports que ya empezo a jugarse, **When** se sincroniza su competicion, **Then** el partido aparece en la lista de partidos (no desaparece por haber empezado) con una etiqueta "EN VIVO".
2. **Given** un partido de futbol en curso (`in_play`/`paused`/`suspended` de football-data.org), **When** se muestra en la pantalla de partidos, **Then** tambien se ve la misma etiqueta "EN VIVO".
3. **Given** una apuesta pendiente (aun no liquidada) sobre un partido que esta actualmente en curso, **When** el usuario abre Mis apuestas, **Then** ve la etiqueta "EN VIVO" junto a esa seleccion.
4. **Given** una apuesta ya liquidada (ganada o perdida), **When** se muestra en Mis apuestas, **Then** no se muestra la etiqueta "EN VIVO" (el resultado ya esta decidido, sin importar el estado actual del partido).
5. **Given** un partido pospuesto (`postponed`), **When** se muestra, **Then** no se marca como "EN VIVO" (esta detenido/retrasado, no en curso).

---

### User Story 6 - Retirar competiciones ya finalizadas de las listas activas (Priority: P3)

Como usuario no quiero ver competiciones que ya terminaron (ej. un mundial ya disputado) como si siguieran disponibles para apostar.

**Why this priority**: Evita confusion y perdida de confianza cuando el usuario entra a una competicion "activa" que en realidad ya no tiene partidos pendientes.

**Independent Test**: Puede probarse dejando pasar el umbral de antiguedad de sincronizacion para una competicion cuyo torneo ya finalizo en la fuente real, listando competiciones y verificando que deja de marcarse como disponible.

**Acceptance Scenarios**:

1. **Given** una competicion marcada como disponible cuya ultima sincronizacion supera el umbral de antiguedad definido, **When** se solicita el listado de competiciones, **Then** el sistema revalida contra la fuente antes de responder y, si ya no hay partidos pendientes, dicha competicion deja de marcarse como disponible.
2. **Given** una competicion sin partidos pendientes ya confirmados (no requiere revalidacion), **When** se lista, **Then** no se dispara una llamada innecesaria a la fuente externa.

---

### Edge Cases

- Que ocurre cuando se solicita una competicion no soportada por la fuente acordada.
- Como se comporta el sistema cuando faltan campos importantes en equipos (escudo, estadio o nombre corto).
- Como se evita crear partidos duplicados cuando se re-genera mock para la misma competicion en ventana corta.
- Que se muestra cuando no existe snapshot previo y la primera carga externa falla.
- Que ocurre cuando un equipo de un proximo partido de esports no aparece en el catalogo generico de equipos de la fuente (ver User Story 4).
- Que ocurre cuando la revalidacion de una competicion "vieja" falla (fuente no disponible): se conserva el ultimo estado conocido en vez de bloquear el listado completo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST permitir configurar football-data.org como fuente oficial para construir datasets mock de competicion.
- **FR-002**: System MUST obtener para cada competicion habilitada un catalogo de equipos y sus metadatos deportivos disponibles (nombre, escudo, estadio, plantilla y clasificacion cuando existan).
- **FR-003**: System MUST normalizar los datos obtenidos en un modelo comun de mocks utilizable por las pantallas de partidos.
- **FR-004**: System MUST generar partidos mock aleatorios por competicion usando equipos del catalogo cargado.
- **FR-005**: System MUST etiquetar cada partido mock con su competicion para soportar filtrado por seccion.
- **FR-006**: System MUST evitar que una competicion muestre equipos fuera de su propio catalogo durante la generacion de mocks.
- **FR-007**: System MUST conservar un snapshot local del ultimo dataset valido por competicion para uso offline/local-first.
- **FR-008**: System MUST mantener visible el ultimo snapshot valido si falla una actualizacion externa y notificar que los datos estan desactualizados.
- **FR-009**: System MUST exponer a la interfaz un listado por competicion que alimente las secciones navegables del panel lateral.
- **FR-010**: System MUST registrar fecha y version de cada generacion mock para trazabilidad funcional.
- **FR-011**: System MUST admitir PandaScore como segundo proveedor de datos reales (esports: CS2, League of Legends, Dota 2, Valorant), normalizado al mismo modelo `TeamSnapshot`/`MockMatch` que football-data.org, sin generar partidos sinteticos.
- **FR-012**: System MUST completar el escudo/nombre de un equipo que aparece en un proximo partido de esports usando los datos ya embebidos en ese partido, cuando dicho equipo no figure en el catalogo generico de equipos de la fuente.
- **FR-013**: System MUST mostrar "TBD" (no un nombre localizado) para un rival aun no determinado en un cruce, tanto en el nombre completo como en el icono/iniciales de respaldo.
- **FR-014**: System MUST agrupar en el panel lateral las competiciones navegables por deporte, permitiendo expandir/contraer cada grupo de forma independiente.
- **FR-015**: System MUST permitir filtrar en vivo, desde el panel lateral, las competiciones visibles por texto de busqueda (nombre de competicion o de deporte).
- **FR-016**: System MUST revalidar contra la fuente una competicion marcada como disponible cuando su ultima sincronizacion supere un umbral de antiguedad definido, antes de listarla como disponible, para retirar automaticamente torneos ya finalizados.
- **FR-017**: System MUST obtener y persistir el emblema real de cada competicion de futbol (`emblem` de football-data.org) durante su sincronizacion, de forma best-effort (un fallo al obtenerlo no debe hacer fallar el resto de la sincronizacion).
- **FR-018**: System MUST exponer, por cada partido de esports normalizado, la liga especifica a la que pertenece (nombre e icono, cuando la fuente los provea) para permitir agrupar/filtrar por liga dentro de un mismo juego.
- **FR-019**: System MUST permitir, desde el panel lateral, expandir una competicion de esports para ver las ligas distintas presentes en sus partidos reales actuales, cada una navegable de forma independiente hacia una vista de partidos filtrada por esa liga.
- **FR-020**: System MUST obtener, ademas de los proximos partidos de esports, los partidos actualmente en curso de la misma fuente (PandaScore expone estos en un endpoint separado), y MUST incluirlos en el snapshot de la competicion en vez de descartarlos por no estar entre los "proximos".
- **FR-021**: La interfaz MUST mostrar una etiqueta visible ("EN VIVO") para todo partido cuyo estado indique que se esta jugando en este momento, tanto en la pantalla de partidos como en cada seleccion pendiente de Mis apuestas.
- **FR-022**: La etiqueta "EN VIVO" MUST distinguir un partido realmente en curso (`in_play`/`paused`/`suspended` en futbol, `running` en esports) de uno simplemente pospuesto o aun no iniciado, y MUST dejar de mostrarse en Mis apuestas una vez que la apuesta correspondiente ya se liquido.

### Key Entities *(include if feature involves data)*

- **CompetitionSource**: Definicion de competicion habilitada para carga de datos (codigo, nombre visible, deporte, proveedor -football-data.org o PandaScore-, estado de sincronizacion, icono real cuando la fuente lo provee).
- **TeamSnapshot**: Representacion normalizada de cada equipo obtenido de la fuente (identidad deportiva y metadatos visibles, incluido escudo).
- **MockMatch**: Partido generado para UI, ligado a una competicion y a dos equipos del snapshot (o a "TBD" cuando el rival aun no esta determinado); en esports incluye la liga especifica (nombre e icono) a la que pertenece.
- **MockDatasetSnapshot**: Version local de datos mock por competicion con marca temporal y estado de validez.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las competiciones habilitadas muestra al menos 4 partidos mock visibles despues de una carga exitosa.
- **SC-002**: El cambio entre secciones de competicion muestra datos correctos en menos de 1 segundo en entorno local para el 95% de interacciones.
- **SC-003**: En pruebas de indisponibilidad de fuente, el 100% de los casos mantiene un dataset previo visible sin pantalla en blanco.
- **SC-004**: Al menos 90% de los partidos mock generados en una tanda no presentan duplicados exactos dentro de la misma competicion.
- **SC-005**: El 100% de los equipos que aparecen en los proximos partidos sincronizados de una competicion de esports muestra un escudo (propio o de respaldo con iniciales), sin depender de que dicho equipo este en el catalogo generico de la fuente.
- **SC-006**: Una competicion cuyo torneo ya finalizo en la fuente real deja de listarse como disponible dentro de la ventana de revalidacion definida (umbral de antiguedad de sincronizacion), sin intervencion manual.
- **SC-007**: El 100% de las competiciones de futbol sincronizadas exitosamente muestra su emblema real en el panel lateral (no un icono generico).
- **SC-008**: Expandir una competicion de esports en el panel lateral muestra unicamente ligas con partidos reales vigentes, sin ligas vacias ni duplicadas.
- **SC-009**: El 100% de los partidos de esports actualmente en curso siguen visibles en la lista de partidos (no desaparecen por haber empezado), marcados como "EN VIVO".

## Assumptions

- Ampliado (2026-07-31): ya no aplica "otros deportes seguiran con mocks estaticos" - esports (via PandaScore) es una segunda fuente de datos reales, con el mismo tratamiento local-first (snapshot + fallback) que football-data.org.
- La fuente externa provee datos suficientes para construir equipos y metadatos base, aunque algunos campos puedan venir incompletos.
- El entorno local dispone de conectividad al momento de sincronizar; fuera de sincronizacion se usa snapshot local vigente.
- El refresco automatico se activa unicamente como revalidacion perezosa al listar competiciones (umbral de antiguedad, FR-016), no como proceso en segundo plano/cron; sigue sin existir un scheduler dedicado en esta fase.
- El umbral de antiguedad para revalidar una competicion "activa" es de 6 horas; puede ajustarse sin cambiar el contrato de la feature.
- Ampliado (2026-07-31): PandaScore no expone un icono propio por videojuego (solo por equipo y por liga). El icono de cada juego de esports (CS2, LoL, Dota 2, Valorant) es, por eso, un asset estatico verificado en vez de un dato dinamico de la fuente: CS2/Dota 2 usan el CDN oficial de Valve/Steam (appids 730/570); League of Legends/Valorant, al no tener Riot un CDN estable con URL fija, usan el logo oficial de marca alojado en Wikimedia Commons. Si Riot publica en el futuro un endpoint/CDN propio, esta asuncion debe revisarse.
- TDD permanece diferido para esta feature segun constitucion vigente.
