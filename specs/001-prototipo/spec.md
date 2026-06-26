# Feature Specification: prototipo

**Feature Branch**: `[001-prototipo]`

**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "Queremos desarrollar una aplicacion llamada BethAny, será una app disponible para web y moviles cuyo principio elemental sea \"hacer predicciones de forma competitiva, ya sea con amigos o en un ranking global, sin la parte de pereder dinero y con la diversion de ver a quien se le da mejor las predicciones\". 

Queremos que tenga una pagina principal donde se muestren los eventos mas relevantes del momento. Una pagina dedicada al perfil, con informacion relativa al \"elo\" (nivel de prediccion), una pagina de ambito social, donde tengas tus grupos de predicciones con amigos y puedas añadir o eliminar amigos. Las forma de navegar a traves de las distintas paginas sera una barra horizontal en la parte inferior de la pantalla. Rellena la pagina con datos mock de distintos deportes, eventos, etc.. Crea tambien un perfil mock, con su elo, su apartado social, su nombre de cuenta, su foto de perfil, etc...
Esta primera version sera un prototipo MVP, el nombre de la especificacion sera prototipo. Queremos que tenga una gama de colores naranjas con blanco y una estetica moderna y atractiva para los jovenes, accesible y por el momento no funcional."

## Clarifications

### Session 2026-06-25

- Q: How should the global ranking be represented in the MVP? → A: Include it as a section inside the home page or profile page, without creating a separate tab.

## Constitution Alignment *(mandatory)*

- **Simplicity Statement**: Build a mock-only MVP with three core views, one persistent bottom navigation bar, and shared reusable mock data. Avoid real prediction logic, real money, external integrations, and persistent account systems in this phase.
- **Local-First Confirmation**: The prototype is assumed to run locally during development and validation. No cloud services are required for the MVP.
- **Stack Confirmation**: The feature uses Python for supporting logic and React for the user interface. Mobile behavior must be validated with Expo when mobile flows are reviewed.
- **TDD Mode**: Deferred. Test-first enforcement is not active for this prototype; tests can be added later when the product owner activates TDD.
- **Security Scope (Mock Stage)**: No production secrets, personal data, or real authentication are included. Security hardening and live account protections are deferred until the mock stage ends.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover Relevant Events (Priority: P1)

As a user, I can open BethAny and immediately see a visually rich home page with relevant mock events from different sports and a summary of the global ranking, so I understand what I can predict right away.

**Why this priority**: The home page is the first impression and the entry point for the whole prototype.

**Independent Test**: Open the app and verify the main page shows a curated set of mock events, sports categories, and a clear visual hierarchy without needing any other section.

**Acceptance Scenarios**:

1. **Given** the user opens the app, **When** the home page loads, **Then** the user sees featured events from multiple sports.
2. **Given** the user is on a mobile-sized screen, **When** the home page renders, **Then** the content remains readable and attractive without breaking layout.
3. **Given** the user wants to compare performance, **When** the home page loads, **Then** a global ranking summary is visible without needing a separate navigation tab.

---

### User Story 2 - Review Personal Profile (Priority: P2)

As a user, I can visit a mock profile page that shows my account name, avatar, and prediction level (elo), so I can understand my current standing in the game.

**Why this priority**: The profile page gives the prototype a sense of identity and progression.

**Independent Test**: Navigate to the profile page and verify it shows a complete mock profile with name, photo, elo, and supporting summary data.

**Acceptance Scenarios**:

1. **Given** the user opens the profile section, **When** the page loads, **Then** the profile shows a mock avatar, account name, elo, and summary stats.
2. **Given** the user switches between pages, **When** returning to the profile, **Then** the same mock profile presentation is shown consistently.

---

### User Story 3 - Manage Social Prediction Groups (Priority: P3)

As a user, I can view social prediction groups and a friends list, then add or remove friends in the mock experience, so I can imagine competing with people I know.

**Why this priority**: Social competition is one of the core reasons to use the product after the initial landing experience.

**Independent Test**: Open the social section and verify that friend groups, friends, and add/remove interactions are present in the mock experience.

**Acceptance Scenarios**:

1. **Given** the user opens the social section, **When** the page loads, **Then** the user sees groups, friends, and a clear way to add or remove friends.
2. **Given** a friend is removed in the mock state, **When** the view updates, **Then** the change is visible within the session even if it is not permanently saved.

---

### User Story 4 - Navigate Across Main Sections (Priority: P1)

As a user, I can move between the main pages using a bottom horizontal navigation bar, so the prototype feels simple and mobile-friendly.

**Why this priority**: Navigation is required to make the three main views usable as one product.

**Independent Test**: Interact with the bottom navigation and confirm the user can move between home, profile, and social views from desktop and mobile layouts.

**Acceptance Scenarios**:

1. **Given** the user is on any main page, **When** they tap a navigation item, **Then** the corresponding page becomes visible.
2. **Given** the user is on a narrow screen, **When** the navigation renders, **Then** the bottom bar remains usable and accessible.

---

### Edge Cases

- What happens when there are no featured events? The home page should still show a friendly empty-state mock.
- What happens when a profile name is long? The layout should wrap or truncate gracefully without breaking the card.
- What happens when the screen is very small? The bottom navigation and cards should remain legible and tappable.
- What happens when the mock friends list is empty? The social page should show guidance and a clear empty-state message.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST present a home page with mock featured events from multiple sports and event types.
- **FR-002**: The system MUST present a profile page with a mock account name, avatar, elo value, and summary information.
- **FR-003**: The system MUST present a social page with mock groups, friends, and a visible add/remove friends interaction.
- **FR-004**: The system MUST provide a bottom navigation bar that allows switching between the main pages.
- **FR-005**: The system MUST show a global ranking summary inside the home page or profile page without creating a separate navigation tab.
- **FR-006**: The system MUST use a modern orange-and-white visual style that feels attractive and accessible for young users.
- **FR-007**: The system MUST support both web and mobile layouts without losing clarity or navigation access.
- **FR-008**: The system MUST rely on mock data only in this prototype and MUST NOT require real money, real prediction outcomes, or live external services.
- **FR-009**: The system MUST treat social actions in this prototype as mock interactions that can change within the session but do not need permanent storage.
- **FR-010**: The system MUST avoid exposing personal data or live account security features in this MVP stage.

### Key Entities *(include if feature involves data)*

- **Mock Event**: A featured sports or entertainment event shown on the home page, with a title, sport type, time context, and featured status.
- **Mock Profile**: A sample user identity with account name, avatar, elo, and summary stats.
- **Prediction Group**: A friends-based group used to frame social competition around predictions.
- **Friend**: A social contact shown in the mock friends list and available for add/remove interactions.
- **Leaderboard Entry**: A mock ranking item representing competitive position in the broader community.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of reviewed prototype walkthroughs show the three main areas of the app within one minute of opening it.
- **SC-002**: At least 8 out of 10 test participants can identify the home, profile, and social sections within 15 seconds.
- **SC-003**: At least 8 out of 10 test participants describe the visual style as modern, youthful, and easy to understand.
- **SC-004**: The prototype remains readable and navigable across common desktop and mobile screen sizes in all review sessions.
- **SC-005**: Users can complete a page switch through the bottom navigation in a single action on every main section.

## Assumptions

- The MVP is intentionally mock-only and does not yet include real prediction mechanics, user authentication, or payment flows.
- The initial interface language can be Spanish to match the current product description.
- The first release should emphasize visual clarity and product understanding over depth of interaction.
- Social add/remove actions may update only the visible mock state during the session.
- The app should feel native on mobile while still working as a web prototype.
- TDD remains deferred until explicitly activated by the product owner.
