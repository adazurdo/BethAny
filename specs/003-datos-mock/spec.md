# Feature Specification: Datos Mock Desde Fuente Externa

**Feature Branch**: `[003-datos-mock]`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "me gustaria que cogieras info de esta pagina para haacer los mocks aleatorios. crea una nueva spec que se llame datos o algo asi y que defina q el sistema coja los datos asi: football-data.org (gratis) para equipos, escudos, estadios, plantillas, clasificacion y partidos por competicion"

## Constitution Alignment *(mandatory)*

- **Simplicity Statement**: Se define un flujo unico de datos: obtener catalogos de competicion desde una fuente deportiva externa y generar mocks aleatorios para UI, evitando integraciones multi-proveedor en esta fase.
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

### Edge Cases

- Que ocurre cuando se solicita una competicion no soportada por la fuente acordada.
- Como se comporta el sistema cuando faltan campos importantes en equipos (escudo, estadio o nombre corto).
- Como se evita crear partidos duplicados cuando se re-genera mock para la misma competicion en ventana corta.
- Que se muestra cuando no existe snapshot previo y la primera carga externa falla.

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

### Key Entities *(include if feature involves data)*

- **CompetitionSource**: Definicion de competicion habilitada para carga de datos (codigo, nombre visible, estado de sincronizacion).
- **TeamSnapshot**: Representacion normalizada de cada equipo obtenido de la fuente (identidad deportiva y metadatos visibles).
- **MockMatch**: Partido generado para UI, ligado a una competicion y a dos equipos del snapshot.
- **MockDatasetSnapshot**: Version local de datos mock por competicion con marca temporal y estado de validez.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las competiciones habilitadas muestra al menos 4 partidos mock visibles despues de una carga exitosa.
- **SC-002**: El cambio entre secciones de competicion muestra datos correctos en menos de 1 segundo en entorno local para el 95% de interacciones.
- **SC-003**: En pruebas de indisponibilidad de fuente, el 100% de los casos mantiene un dataset previo visible sin pantalla en blanco.
- **SC-004**: Al menos 90% de los partidos mock generados en una tanda no presentan duplicados exactos dentro de la misma competicion.

## Assumptions

- La primera version se centra en competiciones de futbol soportadas por football-data.org; otros deportes seguiran con mocks estaticos hasta una ampliacion posterior.
- La fuente externa provee datos suficientes para construir equipos y metadatos base, aunque algunos campos puedan venir incompletos.
- El entorno local dispone de conectividad al momento de sincronizar; fuera de sincronizacion se usa snapshot local vigente.
- La activacion de refresco automatico avanzado queda fuera de esta fase; se prioriza refresco bajo accion explicita o flujo definido en siguiente fase.
- TDD permanece diferido para esta feature segun constitucion vigente.
