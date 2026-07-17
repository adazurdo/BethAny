# Quickstart: Combinada (Apuestas Combinadas)

## Goal

Validate that a signed-in user can see real 1X2 odds on football matches, place a simple bet, build and place a combinada from two or more matches, switch between the Simple and Combinada tabs with multiple selections, get blocked from combining two selections of the same match or from betting on a match that is no longer open, and review everything afterward in "Mis apuestas" — on both desktop and mobile (Expo).

## Prerequisites

- The repo is checked out locally.
- The local Python backend and Expo frontend can both be started from the workspace (`npm run dev`).
- At least one football competition has synced mock matches (e.g. "Mundial 2026"), so `GET /mock/competitions/{code}/matches` returns matches with `status: "scheduled"`.
- A signed-in local account (register/login as usual).

## Validation Flow

### 1. See real 1X2 odds on a match

Open the matches list for a synced football competition.

**Expected result**: Each match shows three outcome buttons (Local, Empate, Visitante), each with its own real odd (no hardcoded `2.15`); reopening the same match later shows the same odds.

### 2. Place a simple bet

Select one outcome of one match, open the boleto (desktop right rail or mobile sheet), enter a stake, and confirm.

**Expected result**: The boleto shows the selection, its odds, and a potential winnings equal to stake × odds. After confirming, the boleto empties and the bet appears in "Mis apuestas" as `simple` with the same stake, odds, and potential winnings.

### 3. Build a combinada

Select outcomes from two different matches.

**Expected result**: The boleto automatically shows a "Combinada" tab in addition to "Simple". Switching to it shows a combined odds value equal to the sum of both selections' odds (not the product — see `spec.md` Amendment, 2026-07-16). Entering a stake shows potential winnings equal to stake × combined odds.

### 4. Place the combinada

With the Combinada tab active and a valid stake, confirm the bet.

**Expected result**: A single `combinada` bet is created with both selections. The boleto empties. Opening its detail in "Mis apuestas" shows both selections individually (match, outcome, odds) plus the combined odds and potential winnings.

### 5. Place multiple simples from the same boleto

With two or more selections in the boleto, switch to "Simple", enter a different stake for each selection, and confirm.

**Expected result**: One independent `simple` bet is created per selection, each with its own stake and potential winnings; all appear separately in "Mis apuestas".

### 6. Guard against combining the same match twice

Select one outcome of a match already in the boleto, then select a different outcome of that same match.

**Expected result**: The boleto still shows only one entry for that match, now with the newly chosen outcome. Selecting the same outcome again removes it from the boleto entirely.

### 7. Guard against betting on a match that is no longer open

Add a selection for a match, then (directly via the backend, e.g. by re-syncing the competition after the match's kickoff time or by manually marking it in the local dataset) change that match's status away from `scheduled`/`timed`, and try to place the bet.

**Expected result**: Placement is rejected with a clear message naming that selection; no bet is created, including no partial `combinada`.

### 8. Reject invalid stakes

Try placing a bet with the stake field empty, zero, negative, or non-numeric.

**Expected result**: The action is rejected with clear feedback and no bet is created.

### 9. Recalculate on removing a selection

With three selections and the Combinada tab active, remove one selection, then remove a second one.

**Expected result**: After the first removal, the combined odds and potential winnings recompute using only the two remaining selections. After the second removal, the boleto shows only the "Simple" tab for the one remaining selection.

### 10. Validate on mobile (Expo)

Repeat steps 1-4 on a mobile device or simulator via Expo, using the mobile bet-slip access point instead of the desktop right rail.

**Expected result**: The same selections, tabs, odds, stake input, and "Realizar apuesta" action are available and behave identically to desktop.

### 11. Review "Mis apuestas" from empty state

As a freshly registered account with no bets, open "Mis apuestas".

**Expected result**: A clear empty state is shown, inviting the user to bet from the matches list.

## Follow-ups (deferred, not part of this feature)

- ~~No bet settlement/resolution against real match results (all placed bets stay `realizada`).~~ Implemented by `006-elo` via a deterministic simulated match result (see `specs/006-elo/quickstart.md`).
- ~~No virtual wallet/balance — stakes remain illustrative only.~~ Implemented by `006-elo`: stake is debited on placement, potential winnings credited on a winning settlement.
- No "Sistema" tab and no markets beyond 1X2.
- No abuse prevention for rapid/mass bet creation.
