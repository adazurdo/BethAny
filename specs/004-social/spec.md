# Feature Specification: Ventana Social (Amigos y Grupos de Predicciones)

**Feature Branch**: `[004-social]`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "quiero que leas las plantillas de speckit y que hagas una nueva spec 4 rellenando dichas plantillas, quiero que se centre en una nueva ventana de la pagina que se llame social, en esta pestaña tendras las funciones basicas de cualquier aplicacion social, como añadir amigo, eliminar amigo, una lista de amigos que pueda ser ordenada por elo ascendente o descendente o por orden alfabetico, quiero que ademas tengas la opcion de crear un grupo de predicciones donde poder invitar a tus amigos y que se puedan proponer predicciones personalizadas"

**Amendment (post-implementation feedback, 2026-07-12)**: "cuando solicitas amistad con alguien, el otro usuario deberia tener la opcion de aceptar o rechazar esa amistad, esto tambien deberia pasar a la hora de invitar a alguien a un grupo, tambien deberia haber un boton (flecha hacia atras) para salir de la ventana del grupo en el que estes y mantener los botones de abajo para navegar entre las distintas ventanas, por ultimo me gustaria que los miembros de un grupo pudiesen votar en las predicciones del grupo" — friend adds and group invites become request/accept/reject flows instead of immediate; the group detail screen needs back navigation while keeping the tab bar visible; group members can vote on custom predictions.

## Constitution Alignment *(mandatory)*

- **Simplicity Statement**: Se añade una unica ventana nueva ("Social") que reutiliza el modelo de cuentas ya definido en `002-base-de-datos` y lo extiende con solicitudes de amistad, invitaciones de grupo, y votacion de predicciones, todas con el mismo patron de solicitud/respuesta (pendiente -> aceptada/rechazada), sin introducir un sistema de mensajeria, notificaciones push ni backend social independiente.
- **Local-First Confirmation**: Toda la gestion de amigos, solicitudes, grupos, invitaciones, predicciones y votos se ejecuta y persiste en el entorno local del prototipo; no se asume ningun servicio en la nube ni sincronizacion entre dispositivos en esta fase.
- **Stack Confirmation**: Backend en Python para persistir amigos, grupos, invitaciones y predicciones; frontend en React con validacion en Expo obligatoria, ya que la pestaña "Social" y la pantalla de detalle de grupo forman parte de la navegacion principal tanto en web como en movil.
- **TDD Mode**: Deferred. Se documentan criterios de aceptacion verificables; no se activa el gate red-green-refactor para esta feature.
- **Security Scope (Mock Stage)**: No se maneja informacion personal real ni secretos de produccion; los amigos y grupos operan sobre cuentas locales/mock. Quedan diferidos: prevencion de abuso (spam de solicitudes/invitaciones), bloqueo de usuarios y moderacion de contenido de predicciones personalizadas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Solicitar amistad y aceptar o rechazar solicitudes (Priority: P1)

Como usuario quiero poder enviar una solicitud de amistad a otra cuenta, y como destinatario quiero poder aceptarla o rechazarla, para que ambas partes den su consentimiento antes de quedar conectadas.

**Why this priority**: Es la base de toda la ventana Social; sin un flujo de amistad con consentimiento mutuo no puede existir una lista de amigos fiable, ordenacion, ni grupos de predicciones.

**Independent Test**: Puede probarse enviando una solicitud de amistad desde una cuenta, comprobando que aparece como pendiente para el destinatario, y verificando que aceptarla la convierte en amistad visible para ambas cuentas (o que rechazarla la descarta sin crear amistad).

**Acceptance Scenarios**:

1. **Given** el usuario esta en la ventana Social, **When** envia una solicitud de amistad a un identificador de cuenta valido que no es ya su amigo ni tiene una solicitud pendiente, **Then** se crea una solicitud en estado pendiente visible para el destinatario.
2. **Given** una solicitud de amistad pendiente dirigida al usuario, **When** el usuario la acepta, **Then** ambas cuentas aparecen como amigas mutuamente.
3. **Given** una solicitud de amistad pendiente dirigida al usuario, **When** el usuario la rechaza, **Then** la solicitud desaparece y no se crea ninguna amistad.
4. **Given** una solicitud de amistad ya enviada y pendiente, **When** el usuario intenta enviar otra solicitud a la misma cuenta, **Then** el sistema rechaza la accion.

---

### User Story 2 - Eliminar amigos (Priority: P1)

Como usuario quiero poder eliminar a un amigo existente desde la ventana Social, para mantener mi lista bajo control.

**Why this priority**: Es una funcion basica esperada en cualquier lista de amigos y es independiente del resto de flujos.

**Independent Test**: Puede probarse eliminando a un amigo existente y comprobando que desaparece de la lista de ambas cuentas.

**Acceptance Scenarios**:

1. **Given** un amigo existente en la lista, **When** el usuario selecciona eliminarlo, **Then** el amigo desaparece de la lista de ambas cuentas y deja de contar para ordenaciones y futuras invitaciones a grupo.

---

### User Story 3 - Crear grupo de predicciones e invitar amigos con aceptacion (Priority: P2)

Como usuario quiero crear un grupo de predicciones e invitar a amigos de mi lista, y como invitado quiero poder aceptar o rechazar esa invitacion, para que solo formen parte del grupo quienes lo decidan explicitamente.

**Why this priority**: Es el valor diferencial de la ventana Social sobre una simple lista de contactos; depende de que ya exista una lista de amigos (User Story 1).

**Independent Test**: Puede probarse creando un grupo de predicciones, invitando a un amigo existente, comprobando que la invitacion queda pendiente para el invitado, y verificando que aceptarla lo añade como miembro (o que rechazarla lo descarta sin añadirlo).

**Acceptance Scenarios**:

1. **Given** el usuario tiene al menos un amigo, **When** crea un grupo de predicciones con un nombre, **Then** el grupo se crea con el usuario como miembro y propietario.
2. **Given** un grupo de predicciones existente, **When** el usuario invita a un amigo de su lista, **Then** se crea una invitacion pendiente visible para ese amigo, sin añadirlo todavia como miembro.
3. **Given** una invitacion de grupo pendiente dirigida al usuario, **When** la acepta, **Then** pasa a formar parte de los miembros del grupo.
4. **Given** una invitacion de grupo pendiente dirigida al usuario, **When** la rechaza, **Then** no se añade como miembro y la invitacion desaparece.
5. **Given** un amigo que ya es miembro del grupo o que ya tiene una invitacion pendiente a ese grupo, **When** el usuario intenta invitarlo de nuevo, **Then** el sistema rechaza la invitacion duplicada.

---

### User Story 4 - Proponer predicciones personalizadas en un grupo (Priority: P2)

Como miembro de un grupo de predicciones quiero proponer una prediccion personalizada (pregunta y opciones propias) visible para el resto del grupo, para generar dinamicas propias que no dependen del catalogo general de partidos.

**Why this priority**: Completa el proposito principal de los grupos de predicciones; sin esta capacidad el grupo seria solo una lista de miembros sin actividad propia.

**Independent Test**: Puede probarse proponiendo una prediccion personalizada dentro de un grupo existente y comprobando que todos los miembros del grupo pueden verla.

**Acceptance Scenarios**:

1. **Given** el usuario es miembro de un grupo de predicciones, **When** propone una prediccion personalizada con una pregunta y al menos dos opciones, **Then** la prediccion queda visible para todos los miembros del grupo.
2. **Given** una prediccion personalizada sin opciones validas, **When** el usuario intenta proponerla, **Then** el sistema rechaza la creacion y solicita opciones validas.

---

### User Story 5 - Votar en las predicciones de un grupo (Priority: P2)

Como miembro de un grupo de predicciones quiero votar por una de las opciones de una prediccion personalizada, para participar activamente en las dinamicas del grupo y ver como se reparten los votos del resto de miembros.

**Why this priority**: Es lo que convierte una prediccion personalizada en una dinamica participativa; sin voto, la prediccion propuesta en la User Story 4 seria solo texto estatico.

**Independent Test**: Puede probarse votando por una opcion de una prediccion existente dentro de un grupo y comprobando que el voto queda reflejado en el recuento visible para todos los miembros.

**Acceptance Scenarios**:

1. **Given** una prediccion personalizada visible en un grupo del que el usuario es miembro, **When** vota por una de sus opciones, **Then** el voto queda registrado y el recuento por opcion se actualiza para todos los miembros.
2. **Given** un usuario que ya voto en una prediccion, **When** vota de nuevo por una opcion distinta de la misma prediccion, **Then** su voto anterior se sustituye por el nuevo, sin duplicar su participacion en el recuento.
3. **Given** un usuario que no es miembro del grupo, **When** intenta votar en una prediccion de ese grupo, **Then** el sistema rechaza el voto.

---

### User Story 6 - Ordenar la lista de amigos (Priority: P3)

Como usuario quiero ordenar mi lista de amigos por elo ascendente, elo descendente o alfabeticamente, para encontrar rapidamente a quien busco o comparar niveles de juego.

**Why this priority**: Mejora la usabilidad de una lista que ya existe (User Story 1 y 2); no bloquea el valor principal de amigos o grupos, pero se vuelve mas util cuantos mas amigos tenga el usuario.

**Independent Test**: Puede probarse con una lista de varios amigos, cambiando el criterio de ordenacion y verificando que el orden mostrado cambia de forma coherente con el criterio elegido.

**Acceptance Scenarios**:

1. **Given** una lista de amigos con distinto elo, **When** el usuario selecciona ordenar por elo ascendente, **Then** los amigos se muestran de menor a mayor elo.
2. **Given** una lista de amigos con distinto elo, **When** el usuario selecciona ordenar por elo descendente, **Then** los amigos se muestran de mayor a menor elo.
3. **Given** una lista de amigos, **When** el usuario selecciona orden alfabetico, **Then** los amigos se muestran ordenados por nombre visible de la A a la Z.

---

### Edge Cases

- Que ocurre cuando el usuario intenta enviarse una solicitud de amistad a si mismo.
- Que ocurre cuando el identificador de amigo introducido no corresponde a ninguna cuenta existente.
- Que ocurre cuando ya existe una solicitud pendiente (en cualquier direccion) entre dos cuentas y se intenta enviar otra.
- Que ocurre cuando dos cuentas se envian solicitudes de amistad mutuamente antes de que ninguna responda.
- Como se comporta el sistema cuando se elimina a un amigo que pertenece a uno o mas grupos de predicciones compartidos con el usuario (el grupo debe seguir existiendo para los demas miembros).
- Que ocurre cuando el creador de un grupo elimina a un amigo que era el unico otro miembro del grupo.
- Como se resuelve un empate de elo al ordenar de forma ascendente o descendente (se aplica desempate alfabetico).
- Que ocurre si se propone una prediccion personalizada con una unica opcion o sin texto de pregunta.
- Que ocurre si el usuario intenta crear un grupo de predicciones sin nombre.
- Que ocurre si el usuario intenta invitar a alguien que no esta en su lista de amigos.
- Que ocurre si el usuario intenta invitar a alguien que ya tiene una invitacion pendiente a ese mismo grupo.
- Que ocurre si un miembro intenta votar por una opcion que no pertenece a la prediccion.
- Que ocurre al navegar hacia atras desde la pantalla de detalle de un grupo (debe volver a la ventana Social manteniendo la navegacion inferior visible).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST exponer una nueva seccion/pestaña "Social" accesible desde la navegacion principal de la app, tanto en web como en Expo.
- **FR-002**: Users MUST poder enviar una solicitud de amistad introduciendo el identificador de una cuenta existente.
- **FR-003**: System MUST impedir que un usuario se envie una solicitud de amistad a si mismo.
- **FR-004**: System MUST impedir enviar una solicitud de amistad a una cuenta que ya es amiga del usuario o que ya tiene una solicitud pendiente con el usuario en cualquier direccion.
- **FR-005**: System MUST mostrar al destinatario de una solicitud de amistad pendiente opciones para aceptarla o rechazarla.
- **FR-006**: System MUST convertir una solicitud aceptada en una amistad visible para ambas cuentas.
- **FR-007**: System MUST descartar una solicitud rechazada sin crear ninguna amistad.
- **FR-008**: Users MUST poder eliminar a un amigo existente de su lista; la eliminacion MUST reflejarse para ambas cuentas.
- **FR-009**: System MUST mostrar la lista de amigos con, al menos, el nombre visible y el elo de cada amigo.
- **FR-010**: Users MUST poder ordenar la lista de amigos por elo ascendente, elo descendente o alfabeticamente por nombre visible.
- **FR-011**: System MUST aplicar un desempate alfabetico consistente cuando dos o mas amigos comparten el mismo elo en una ordenacion por elo.
- **FR-012**: Users MUST poder crear un grupo de predicciones indicando un nombre para el grupo.
- **FR-013**: System MUST asignar automaticamente al creador del grupo como miembro y propietario del mismo.
- **FR-014**: Users MUST poder invitar a un grupo de predicciones unicamente a cuentas que ya esten en su lista de amigos; la invitacion MUST quedar en estado pendiente hasta que el invitado responda.
- **FR-015**: System MUST mostrar al destinatario de una invitacion de grupo pendiente opciones para aceptarla o rechazarla.
- **FR-016**: System MUST añadir al invitado como miembro del grupo solo cuando acepta la invitacion.
- **FR-017**: System MUST impedir invitar a un grupo a una cuenta que ya es miembro de ese grupo o que ya tiene una invitacion pendiente a ese grupo.
- **FR-018**: Members MUST poder proponer una prediccion personalizada dentro de un grupo, compuesta por una pregunta y un conjunto de opciones (minimo dos).
- **FR-019**: System MUST rechazar la creacion de una prediccion personalizada sin pregunta o con menos de dos opciones.
- **FR-020**: System MUST mostrar a todos los miembros de un grupo las predicciones personalizadas propuestas dentro de ese grupo.
- **FR-021**: Members MUST poder votar por una de las opciones de una prediccion personalizada de un grupo del que son miembros.
- **FR-022**: System MUST impedir votar en predicciones de un grupo del que el usuario no es miembro, y MUST impedir votar por una opcion que no pertenezca a la prediccion.
- **FR-023**: System MUST permitir que un miembro cambie su voto en una prediccion, sustituyendo el voto anterior sin duplicar su participacion en el recuento.
- **FR-024**: System MUST mostrar el recuento de votos por opcion, visible para todos los miembros del grupo.
- **FR-025**: System MUST conservar un grupo de predicciones y sus predicciones asociadas aunque uno de sus miembros deje de ser amigo del creador, hasta que dicho miembro sea retirado explicitamente del grupo.
- **FR-026**: System MUST persistir amigos, solicitudes, grupos, invitaciones, predicciones y votos de forma local-first, restaurables tras un nuevo inicio de sesion de la cuenta propietaria.
- **FR-027**: La pantalla de detalle de un grupo de predicciones MUST incluir un control de navegacion hacia atras y MUST mantener visible la barra de navegacion inferior de la app.

### Key Entities *(include if feature involves data)*

- **FriendRequest**: Solicitud de amistad entre dos cuentas, con estado (pendiente, aceptada, rechazada), cuenta solicitante y cuenta destinataria. Una amistad activa es una `FriendRequest` en estado aceptada; es simetrica una vez aceptada.
- **PredictionGroup**: Grupo de predicciones creado por un usuario; incluye nombre, cuenta propietaria y fecha de creacion.
- **GroupMembership**: Relacion entre un `PredictionGroup` y cada cuenta miembro (incluye al propietario), con fecha de incorporacion. Solo existe tras aceptar una `GroupInvite` (o al crear el grupo, para el propietario).
- **GroupInvite**: Invitacion pendiente de un `PredictionGroup` para una cuenta amiga del invitador, con estado (pendiente, aceptada, rechazada).
- **CustomPrediction**: Prediccion personalizada propuesta dentro de un `PredictionGroup`; incluye pregunta, lista de opciones, cuenta autora y fecha de creacion.
- **PredictionVote**: Voto de un miembro del grupo por una opcion de una `CustomPrediction`; un miembro tiene como maximo un voto activo por prediccion.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las solicitudes de amistad aceptadas produce una amistad visible para ambas cuentas; el 100% de las rechazadas no crea ninguna amistad.
- **SC-002**: El 100% de los cambios de criterio de ordenacion (elo ascendente, elo descendente, alfabetico) produce un orden visible correcto y coherente con el criterio elegido.
- **SC-003**: El 100% de las invitaciones de grupo aceptadas añade al invitado como miembro; el 100% de las rechazadas no lo añade.
- **SC-004**: Toda prediccion personalizada valida propuesta en un grupo es visible para el 100% de los miembros de ese grupo de forma inmediata en el entorno local.
- **SC-005**: El 100% de los votos emitidos por miembros validos se refleja correctamente en el recuento por opcion, sin duplicar votos de un mismo miembro.
- **SC-006**: El 100% de los intentos de accion invalida (solicitud duplicada, autosolicitud, invitacion duplicada, voto fuera del grupo, prediccion sin opciones validas) es rechazado con retroalimentacion clara para el usuario.

## Assumptions

- El elo utilizado para ordenar la lista de amigos es el mismo campo `elo` de `AccountProfile` definido en `002-base-de-datos`; no se introduce un elo social independiente.
- Las solicitudes de amistad y las invitaciones de grupo no generan notificaciones push; el destinatario las ve al abrir la ventana Social (o la pantalla del grupo) mientras tiene sesion activa.
- Las predicciones personalizadas de un grupo no requieren en esta fase un mecanismo de resolucion/liquidacion automatica ni de cierre de votacion; solo deben quedar visibles y votables para los miembros del grupo.
- Solo se puede invitar a un grupo de predicciones a cuentas que ya son amigas del usuario que invita; no se contempla invitar a cuentas externas a la lista de amigos en esta fase.
- La validacion en Expo se centra en que la pestaña "Social" (solicitudes, lista de amigos, ordenacion, grupos) y la pantalla de detalle de grupo sean usables en movil; no se asumen gestos o componentes nativos adicionales mas alla de los ya usados en el resto de la app.
- TDD permanece diferido para esta feature segun la constitucion vigente.
