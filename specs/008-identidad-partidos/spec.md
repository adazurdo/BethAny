# Feature Specification: Identidad De Equipos Y Partidos Importantes En Apuestas

**Feature Branch**: `[008-identidad-partidos]`

**Created**: 2026-07-31

**Status**: Draft

**Input**: User description: "en los botones donde se apuesta por un equipo o por otro, ponga el nombre del equipo en lugar de local o visitante, ademas tambien quiero que en el caso de ser un partido importante (eliminatorias/playoffs) quede claro"

## Constitution Alignment *(mandatory)*

- **Simplicity Statement**: No se agregan conceptos nuevos de dominio: se reutiliza el nombre de equipo ya presente en `MockMatch`/`TeamSnapshot` para los botones de apuesta, y se deriva una etiqueta de fase (knockout o no) directamente del campo que cada fuente real ya expone (`stage` en football-data.org, `tournament.name` en PandaScore), sin introducir un sistema de clasificacion propio.
- **Local-First Confirmation**: La nueva informacion (etiqueta de fase) se calcula en el mismo paso de normalizacion que ya persiste el snapshot local (`003-datos-mock`); no requiere llamadas adicionales a la fuente externa.
- **Stack Confirmation**: Cambios en Python (`backend/bethany_mock/mock_dataset.py`, `models.py`) y React/Expo (`EventCard.tsx`, `data/mockCompetitions.ts`); se valida en `npm run web` como el resto del frontend.
- **TDD Mode**: Deferred, consistente con `003-datos-mock` (TDD diferido para esta fase del proyecto).
- **Security Scope (Mock Stage)**: Sin datos sensibles ni secretos nuevos; solo texto ya publico (nombre de equipo, fase de torneo).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Apostar por el nombre del equipo, no por "Local"/"Visitante" (Priority: P1)

Como usuario quiero que los botones de apuesta de un partido muestren el nombre real de cada equipo (en vez de las etiquetas genericas "Local" y "Visitante"), para saber de un vistazo por cual equipo estoy apostando sin tener que mirar el encabezado del partido.

**Why this priority**: Es el cambio de mayor impacto inmediato en la usabilidad del flujo principal de apuesta (tocar un boton de resultado).

**Independent Test**: Puede probarse abriendo cualquier tarjeta de partido con equipos reales cargados y verificando que los dos botones de resultado (fuera del empate) muestran el nombre de cada equipo en vez de "Local"/"Visitante".

**Acceptance Scenarios**:

1. **Given** una tarjeta de partido con datos reales de equipo local y visitante, **When** se renderizan los botones de resultado, **Then** el boton correspondiente al equipo local muestra su nombre y el del visitante muestra el suyo, en vez de "Local"/"Visitante".
2. **Given** un nombre de equipo largo, **When** se muestra en el boton de resultado, **Then** el texto se trunca de forma legible (una linea con elipsis) sin romper el layout de la fila de tres botones.
3. **Given** un contexto donde no se dispone del objeto de equipo (fallback sin datos), **When** se renderizan los botones, **Then** el sistema conserva "Local"/"Visitante"/"Empate" como texto de respaldo en vez de mostrar vacio o "undefined".

---

### User Story 2 - Distinguir con claridad un partido de eliminatoria/playoff (Priority: P2)

Como usuario quiero identificar de inmediato cuando un partido pertenece a una fase eliminatoria (playoffs, cuartos, semifinal, final) para darle mas peso a esa decision de apuesta frente a un partido de fase regular/de grupos.

**Why this priority**: Aporta contexto de riesgo/importancia sin el cual todos los partidos lucen equivalentes, incluso cuando una eliminatoria tiene implicancias distintas (sin revancha, mayor tension).

**Independent Test**: Puede probarse sincronizando una competicion con partidos en fase de grupos y en fase eliminatoria (ej. Champions) y verificando que solo las tarjetas de partidos eliminatorios muestran la etiqueta/badge de importancia.

**Acceptance Scenarios**:

1. **Given** un partido de futbol cuyo `stage` de football-data.org es de eliminatoria (`PLAYOFFS`, `LAST_16`, `QUARTER_FINALS`, `SEMI_FINALS`, `FINAL`, `THIRD_PLACE`), **When** se muestra su tarjeta, **Then** se ve una etiqueta visible con el nombre de la fase (ej. "Semifinal").
2. **Given** un partido de futbol en fase regular/de grupos (`REGULAR_SEASON`, `LEAGUE_STAGE`, `GROUP_STAGE`), **When** se muestra su tarjeta, **Then** no se muestra ninguna etiqueta de importancia.
3. **Given** un partido de esports cuyo torneo (`tournament.name` de PandaScore) indica fase eliminatoria (contiene "playoff" o "final", case-insensitive), **When** se muestra su tarjeta, **Then** se ve la misma etiqueta de importancia con el nombre de esa fase.
4. **Given** un partido de esports en fase de grupos (ej. `tournament.name` = "Group A"), **When** se muestra su tarjeta, **Then** no se muestra etiqueta de importancia (aunque la fuente marque `has_bracket: true`, esa marca por si sola no implica eliminatoria).
5. **Given** un partido de esports en fase eliminatoria cuyo campo `name` de PandaScore identifica la ronda especifica (ej. "Lower bracket quarterfinal 1: VTC vs DOH", "Upper bracket final: FNL vs NM"), **When** se muestra su tarjeta, **Then** la etiqueta de importancia refleja la ronda especifica ("Cuartos de final", "Semifinal", "Final", "Octavos de final", "Tercer puesto") en vez del nombre generico del torneo.
6. **Given** un partido de esports en fase eliminatoria cuyo campo `name` no menciona ninguna ronda reconocible, **When** se muestra su tarjeta, **Then** la etiqueta de importancia cae de vuelta al nombre del torneo tal cual lo da la fuente (ej. "Playoffs").

---

### Edge Cases

- Que ocurre cuando la fuente no informa `stage` (football) o `tournament.name` (esports): no se muestra etiqueta de importancia (se trata como fase regular).
- Que ocurre cuando el nombre de un equipo es igual a "TBD" (rival aun no determinado, ver `003-datos-mock` User Story 4): el boton de resultado muestra "TBD" igual que el resto de la interfaz, en vez de "Local"/"Visitante".
- Que ocurre en pantallas donde se listan apuestas ya realizadas (`bets/index.tsx`) o retos entre amigos (`ChallengeRow`/`ChallengeModal`): quedan fuera de esta feature porque no representan partidos reales con equipos normalizados; conservan su etiquetado actual "Local"/"Visitante".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST mostrar en cada boton de resultado (equipo local / equipo visitante) el nombre real del equipo correspondiente cuando este disponible, en vez de las etiquetas genericas "Local"/"Visitante".
- **FR-002**: System MUST conservar "Local"/"Visitante"/"Empate" como texto de respaldo cuando no exista informacion de equipo para ese contexto.
- **FR-003**: System MUST truncar con elipsis (una linea) el nombre de equipo mostrado en el boton de resultado cuando exceda el ancho disponible.
- **FR-004**: System MUST derivar, durante la normalizacion de partidos (`mock_dataset.py`), una etiqueta de fase (`stage_label`) a partir del campo `stage` (football-data.org) o `tournament.name` (PandaScore) de cada partido crudo.
- **FR-005**: System MUST considerar como fase eliminatoria/importante, para football-data.org, los valores de `stage` `PLAYOFFS`, `LAST_16`, `QUARTER_FINALS`, `SEMI_FINALS`, `FINAL` y `THIRD_PLACE`; cualquier otro valor (incluida ausencia del campo) no se marca como importante.
- **FR-006**: System MUST considerar como fase eliminatoria/importante, para PandaScore, un `tournament.name` que contenga (sin distinguir mayusculas/minusculas) "playoff" o "final"; cualquier otro valor no se marca como importante.
- **FR-006b**: System MUST, cuando el partido de PandaScore se marca como eliminatorio (FR-006), intentar derivar una ronda especifica a partir del campo `name` del partido (palabras clave: "quarterfinal" -> Cuartos de final, "semifinal" -> Semifinal, "round of 16" -> Octavos de final, "3rd place"/"third place" -> Tercer puesto, "final" -> Final), usando el `tournament.name` original como respaldo cuando no se reconozca ninguna ronda.
- **FR-007**: System MUST exponer `stage_label` (nulo si no aplica) en el contrato de `GET /mock/competitions/{code}/matches` y en la sincronizacion (`POST /mock/competitions/{code}/sync`), como parte del objeto de partido ya existente.
- **FR-008**: System MUST mostrar, en la tarjeta de partido, una etiqueta/badge visualmente distinta (icono + texto) cuando el partido tenga `stage_label`, y no mostrar nada cuando no aplique.

### Key Entities *(include if feature involves data)*

- **MockMatch**: (definido en `003-datos-mock`) gana el atributo `stage_label: string | null` - nombre de fase eliminatoria cuando aplica, `null` en fase regular/de grupos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las tarjetas de partido con datos de equipo reales muestra el nombre de cada equipo en sus botones de resultado, no "Local"/"Visitante".
- **SC-002**: El 100% de los partidos en fase eliminatoria (segun FR-005/FR-006) muestra la etiqueta de importancia; el 0% de los partidos en fase regular la muestra (falsos positivos/negativos = 0 sobre una muestra sincronizada real).

## Assumptions

- La deteccion de fase eliminatoria se basa unicamente en el texto/enum que la fuente ya provee (no se infiere por otras señales como ronda numerica o posicion en tabla).
- Las pantallas de retos entre amigos y el historial de apuestas (que no usan `EventCard` ni datos de equipo normalizados) quedan fuera de alcance; podran alinearse en una iteracion posterior si se decide.
- TDD permanece diferido para esta feature, consistente con `003-datos-mock`.
