# Research: base de datos

## Decision 1: Use a local Python backend with SQLite for persistence

- **Decision**: Keep account and account-owned data in a local Python-backed SQLite store.
- **Rationale**: This matches the local-first constitution, keeps persistence simple, and gives both web and mobile clients a single source of truth without introducing cloud dependencies.
- **Alternatives considered**:
  - Frontend-only storage: rejected because it would split account state across clients and make later login recovery harder.
  - Cloud auth/database: rejected because it violates the local-first constraint for this phase.

## Decision 2: Require explicit sign-in on app entry

- **Decision**: Show the access screen first on every cold start and require the user to register or sign in again unless they explicitly log out and re-enter.
- **Rationale**: This keeps the first version simple and avoids adding session persistence, token refresh, or automatic device trust logic.
- **Alternatives considered**:
  - Remembering the session automatically: rejected for the initial version because it adds session lifecycle complexity.
  - Anonymous guest mode: rejected because the feature goal is account creation and account recovery.

## Decision 3: Accept email or username plus password

- **Decision**: Allow either email or username as the account identifier together with a password.
- **Rationale**: This is the most flexible and user-friendly option while still remaining easy to validate locally.
- **Alternatives considered**:
  - Email only: rejected because it is more restrictive than the user requested scope.
  - Username only: rejected for the same reason.

## Decision 4: Persist account-owned profile, elo, friendships, and bets together

- **Decision**: Treat saved profile data, elo, social graph, and bet history as part of one account record.
- **Rationale**: The user wants the same account to reappear with its data intact after later sign-ins, so the account aggregate should be restored as a single unit.
- **Alternatives considered**:
  - Storing only profile and elo: rejected because it would lose part of the account state the user explicitly asked to preserve.
  - Splitting each domain into separate persistence paths: rejected because it adds unnecessary coordination for the first version.

## Decision 5: Include logout in the first version

- **Decision**: Add a visible logout action to the first version.
- **Rationale**: It makes the access screen flow coherent and gives the user control over when the app returns to the sign-in gate.
- **Alternatives considered**:
  - Deferring logout: rejected because it would leave the access flow incomplete.
