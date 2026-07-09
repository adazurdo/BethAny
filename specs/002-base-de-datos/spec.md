# Feature Specification: base de datos

**Feature Branch**: `[002-base-de-datos]`

**Created**: 2026-06-26

**Status**: Draft

**Input**: User description: "voy a impelmentar uba base de datos para que los usuarios puedn registrarse y mas tarde inicar sesion. quiero que nada mas entrar a la pagina te salga una pantalla dandote la ocion de o bien registrate o bien iniciar sesion. esos datos seran guarados en la base de datos. para ello, voy a usar sqllite, y haz las consideracion que te parezcan necesarias. Esta nueva spec quiero que se llame 002-base de datos. una vez he inciado sesion con una cuenta quiero q se alamcenen tamb los datos de esa cuenta (las apuestas, el elo, el perful, las amistades) para que si en otro momento incia sesion el usuari  pueda acceder sin problema"

## Clarifications

- Account credentials use an email or username plus password.
- The app should always return to the access screen on restart unless the user signs in again.
- A local Python backend owns SQLite persistence for accounts and saved state.
- Persisted account-owned data includes profile, elo, friendships, and bets.
- A logout action is part of the first version.

## Constitution Alignment *(mandatory)*

- **Simplicity Statement**: Build a local-first account system with a single entry screen, basic register/login flows, and persistent account data storage. Avoid social logins, password recovery, remote services, payment handling, and multi-device sync in this phase.
- **Local-First Confirmation**: All account and profile data will be stored locally during this phase. No cloud backend is required.
- **Stack Confirmation**: The feature stays within the existing project stack, and mobile validation remains required whenever account flows affect phones or tablets.
- **TDD Mode**: Deferred. Test-first enforcement is not active for this feature unless the product owner explicitly turns it on later.
- **Security Scope (Mock Stage)**: No production secrets or real personal data will be used. Security hardening, credential recovery, and advanced account protection are deferred until the mock stage ends.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entry Gate for Access (Priority: P1)

As a new or returning user, I first see a dedicated access screen with clear options to register or sign in, so I understand how to enter the app before seeing the rest of the content.

**Why this priority**: This is the entry point for the whole feature and determines whether account flows are discoverable.

**Independent Test**: Open the app and verify the first screen always presents register and sign-in actions before any main content.

**Acceptance Scenarios**:

1. **Given** the app is opened and no account session is active, **When** the start screen loads, **Then** the user sees a clear choice to register or sign in.
2. **Given** the user is on the start screen, **When** they choose an access action, **Then** they can move into the corresponding account flow without needing to navigate elsewhere first.

---

### User Story 2 - Create and Reuse Accounts (Priority: P1)

As a user, I can register a local account and later sign in with the same credentials, so my profile is recognized across future sessions.

**Why this priority**: Account creation and reuse are the core purpose of the feature.

**Independent Test**: Create a new account, close the app session, sign in again, and verify the same account opens successfully.

**Acceptance Scenarios**:

1. **Given** a user has no existing account, **When** they register with valid credentials, **Then** the new account is saved locally and can be used later to sign in.
2. **Given** a user has already registered, **When** they enter the same credentials again, **Then** the app recognizes the account and grants access.
3. **Given** a user enters invalid or incomplete registration data, **When** they submit the form, **Then** the app prevents account creation and explains what must be corrected.

---

### User Story 3 - Restore Saved Account Data (Priority: P2)

As a signed-in user, I can return to the app later and recover my saved bets, elo, profile, and friends, so my progress is not lost between sessions.

**Why this priority**: Persistence is the main upgrade over the current mock prototype and is essential for user trust.

**Independent Test**: Sign in with an existing account and verify that the same account data appears exactly as it was left in a previous session.

**Acceptance Scenarios**:

1. **Given** an account already has saved bets, elo, profile information, and friendships, **When** the user signs in again later, **Then** the same data is visible after login.
2. **Given** the user updates account-related data during a session, **When** the app is reopened and the same account is used, **Then** the updates remain available.

---

### User Story 4 - Protect Main App Access After Login (Priority: P2)

As a signed-in user, I can move from the access screen into the main app only after authentication, so the app always starts in a controlled state.

**Why this priority**: It keeps the app entry flow clear and prevents accidental access to the main areas before login.

**Independent Test**: Start from a fresh session and confirm the main app is not shown until the user signs in or registers.

**Acceptance Scenarios**:

1. **Given** no session exists, **When** the app starts, **Then** the access screen is shown instead of the main content.
2. **Given** the user signs out or the session ends, **When** the app is opened again, **Then** the access screen appears again.

---

### Edge Cases

- What happens when a user tries to register with an email or username that already exists? The app should prevent duplicate accounts and explain the conflict.
- What happens when stored account data is incomplete or partially missing? The app should still open the account and show safe fallback values.
- What happens when no saved session exists? The app should always start on the access screen.
- What happens when persistence is unavailable on a platform? The app should fail gracefully with a clear message and avoid corrupting data.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST show a dedicated access screen immediately on app entry with clear options to register or sign in.
- **FR-002**: The system MUST allow a user to create a local account with valid credentials.
- **FR-003**: The system MUST allow a user to sign in with an existing local account.
- **FR-004**: The system MUST persist account records locally so they remain available in later sessions.
- **FR-005**: The system MUST persist the signed-in account's bets, elo, profile information, and friendships locally so they can be restored on future sign-ins.
- **FR-006**: The system MUST restore the correct account state after a successful sign-in.
- **FR-007**: The system MUST prevent the main app from opening before a user has created an account or signed in.
- **FR-008**: The system MUST keep account data isolated so one user's saved data does not overwrite another user's account.
- **FR-009**: The system MUST handle invalid registration or sign-in input with a clear user-facing message.
- **FR-010**: The system MUST remain local-first and MUST NOT require remote authentication, cloud storage, or real-money features in this phase.
- **FR-011**: The system MUST preserve the current social and betting mock data model as account-owned data after login.
- **FR-012**: The system MUST document any deferred security hardening items, including stronger authentication and recovery flows.

### Key Entities *(include if feature involves data)*

- **User Account**: A local identity used to register and sign in, associated with saved profile and access state.
- **Credential Set**: The sign-in information a user uses to access their account.
- **Account Profile**: The user's display name, avatar, and summary identity shown after login.
- **Bet Record**: A saved betting-related item associated with the signed-in account.
- **Elo State**: The stored prediction level or ranking value associated with the account.
- **Friendship Data**: The saved list of friends and social relationships tied to the account.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can reach the registration or sign-in choice screen within 3 seconds of opening the app in normal local conditions.
- **SC-002**: At least 90% of test users can complete registration and reach the main app without assistance on the first attempt.
- **SC-003**: At least 90% of returning test users can sign in and see their saved account data restored successfully.
- **SC-004**: Saved account data remains available after closing and reopening the app in 100% of tested sessions.
- **SC-005**: Users never see the main app before authentication when no valid session exists.

## Assumptions

- The first version uses local persistent storage only and does not need cloud sync.
- The initial sign-in model is simple and based on standard credentials rather than social login or SSO.
- The feature covers the app's core account data, including bets, elo, profile, and friendships, but not payment systems or public leaderboards beyond the stored user state.
- The app should remain usable on both web and mobile, with Expo validation still required for mobile checks.
- TDD remains deferred until explicitly activated by the product owner.
